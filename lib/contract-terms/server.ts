import { createClient } from "@/lib/supabase/server";
import type {
  CreateContractTermFormData,
  UpdateContractTermFormData,
} from "@/lib/validations/contract-terms";
import type { ContractTerm, StoryForContractTerm } from "./client";

/**
 * Fetch all approved stories eligible for contract terms
 * Server-side version
 */
export async function getApprovedStoriesForContractTerms(): Promise<StoryForContractTerm[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stories")
    .select("id, story_id, title, writer_originator_name, genre, status")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch approved stories: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch all contract terms (filtered by RLS)
 * Server-side version
 */
export async function getContractTerms(): Promise<ContractTerm[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .select(`
      *,
      stories!inner(
        story_id,
        title,
        writer_originator_name,
        genre
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch negotiations: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch negotiations by status
 * Server-side version
 */
export async function getContractTermsByStatus(status: string): Promise<ContractTerm[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .select(`
      *,
      stories!inner(
        story_id,
        title,
        writer_originator_name,
        genre
      )
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch negotiations by status: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single contract term by ID
 * Server-side version
 */
export async function getContractTermById(id: string): Promise<ContractTerm | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .select(`
      *,
      stories!inner(
        story_id,
        title,
        writer_originator_name,
        genre
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch negotiation: ${error.message}`);
  }

  return data;
}

/**
 * Create a new contract term from server components
 * Server-side version
 */
export async function createNegotiation(
  negotiationData: CreateContractTermFormData
): Promise<ContractTerm> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Generate unique negotiation_id in format NEG-YYYY-NNNN
  const now = new Date();
  const year = now.getFullYear();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const negotiation_id = `NEG-${year}-${randomNum}`;

  const { data, error } = await supabase
    .from("negotiations")
    .insert({
      negotiation_id,
      story_id: negotiationData.story_id,
      writer_producer_name: negotiationData.writer_producer_name,
      genre: negotiationData.genre,
      proposed_price: negotiationData.proposed_price,
      rate_range: negotiationData.rate_range,
      payment_structure: negotiationData.payment_structure,
      price_justification: negotiationData.price_justification,
      estimated_episodes: negotiationData.estimated_episodes,
      suggested_time_slot: negotiationData.suggested_time_slot,
      project_start_date: negotiationData.project_start_date,
      expected_start_date: negotiationData.project_start_date,
      expected_completion_date: negotiationData.expected_completion_date,
      delivery_schedule: negotiationData.delivery_schedule,
      status: "agreed",
      agreed_price: negotiationData.agreed_price,
      agreed_terms: negotiationData.agreed_terms,
      created_by: user.id,
      currency: "PKR",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create negotiation: ${error.message}`);
  }

  // Update story status to 'in_legal_review' since negotiation is agreed
  const { error: storyError } = await supabase
    .from("stories")
    .update({
      status: "in_legal_review",
      current_stage: "legal_review"
    })
    .eq("id", negotiationData.story_id);

  if (storyError) {
    console.error("Error updating story status:", storyError);
  }

  return data;
}

/**
 * Update an existing negotiation
 * Server-side version
 */
export async function updateNegotiation(
  id: string,
  updates: UpdateContractTermFormData
): Promise<ContractTerm> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update negotiation: ${error.message}`);
  }

  return data;
}

/**
 * Delete a contract term
 * Server-side version
 */
export async function deleteNegotiation(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("negotiations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete negotiation: ${error.message}`);
  }
}

/**
 * Mark contract term as agreed
 * Server-side version
 */
export async function markContractTermAgreed(
  id: string,
  agreedPrice: number,
  agreedTerms: string
): Promise<ContractTerm> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .update({
      status: "agreed",
      agreed_price: agreedPrice,
      agreed_terms: agreedTerms,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to mark negotiation as agreed: ${error.message}`);
  }

  // Update story status to 'in_legal_review'
  const { error: storyError } = await supabase
    .from("stories")
    .update({
      status: "in_legal_review",
      current_stage: "legal_review"
    })
    .eq("id", data.story_id);

  if (storyError) {
    console.error("Error updating story status:", storyError);
  }

  return data;
}

/**
 * Mark contract term as failed
 * Server-side version
 */
export async function markContractTermFailed(
  id: string,
  failedReason: string
): Promise<ContractTerm> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .update({
      status: "failed",
      failed_reason: failedReason,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to mark negotiation as failed: ${error.message}`);
  }

  // Update story status back to 'rejected'
  const { error: storyError } = await supabase
    .from("stories")
    .update({
      status: "rejected",
      current_stage: "rejected"
    })
    .eq("id", data.story_id);

  if (storyError) {
    console.error("Error updating story status:", storyError);
  }

  return data;
}

/**
 * Get contract term statistics for dashboards
 */
export async function getContractTermStats() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .select("id, status, agreed_price, proposed_price");

  if (error) {
    throw new Error(`Failed to fetch negotiation stats: ${error.message}`);
  }

  const stats = {
    total: data.length,
    in_progress: data.filter((n) => n.status === "in_progress").length,
    agreed: data.filter((n) => n.status === "agreed").length,
    failed: data.filter((n) => n.status === "failed").length,
    total_agreed_value: data
      .filter((n) => n.status === "agreed" && n.agreed_price)
      .reduce((sum, n) => sum + (n.agreed_price || 0), 0),
    total_proposed_value: data
      .filter((n) => n.proposed_price)
      .reduce((sum, n) => sum + (n.proposed_price || 0), 0),
  };

  return stats;
}
