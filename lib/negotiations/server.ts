import { createClient } from "@/lib/supabase/server";
import type {
  CreateNegotiationFormData,
  UpdateNegotiationFormData,
} from "@/lib/validations/negotiations";
import type { Negotiation, StoryForNegotiation } from "./client";

/**
 * Fetch all approved stories eligible for negotiation
 * Server-side version
 */
export async function getApprovedStoriesForNegotiation(): Promise<StoryForNegotiation[]> {
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
 * Fetch all negotiations (filtered by RLS)
 * Server-side version
 */
export async function getNegotiations(): Promise<Negotiation[]> {
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
export async function getNegotiationsByStatus(status: string): Promise<Negotiation[]> {
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
 * Fetch a single negotiation by ID
 * Server-side version
 */
export async function getNegotiationById(id: string): Promise<Negotiation | null> {
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
 * Create a new negotiation from server components
 * Server-side version
 */
export async function createNegotiation(
  negotiationData: CreateNegotiationFormData
): Promise<Negotiation> {
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
      status: "in_progress",
      created_by: user.id,
      currency: "PKR",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create negotiation: ${error.message}`);
  }

  // Update story status to 'in_negotiation'
  const { error: storyError } = await supabase
    .from("stories")
    .update({
      status: "in_negotiation",
      current_stage: "negotiation"
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
  updates: UpdateNegotiationFormData
): Promise<Negotiation> {
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
 * Delete a negotiation
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
 * Mark negotiation as agreed
 * Server-side version
 */
export async function markNegotiationAgreed(
  id: string,
  agreedPrice: number,
  agreedTerms: string
): Promise<Negotiation> {
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
 * Mark negotiation as failed
 * Server-side version
 */
export async function markNegotiationFailed(
  id: string,
  failedReason: string
): Promise<Negotiation> {
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
 * Get negotiation statistics for dashboards
 */
export async function getNegotiationStats() {
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
