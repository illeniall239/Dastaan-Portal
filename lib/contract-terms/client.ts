import { createClient } from "@/lib/supabase/client";
import type {
  CreateContractTermFormData,
  UpdateContractTermFormData,
  ContractTermStatus,
  DeliveryEpisode
} from "@/lib/validations/contract-terms";

export interface ContractTerm {
  id: string;
  negotiation_id: string;
  story_id: string;
  writer_producer_name: string;
  genre?: string;
  proposed_price?: number;
  rate_range?: string;
  payment_structure?: string;
  currency?: string;
  price_justification?: string;
  estimated_episodes?: number;
  suggested_time_slot?: string;
  project_start_date?: string;
  expected_start_date?: string;
  expected_completion_date?: string;
  delivery_schedule?: DeliveryEpisode[];
  counter_offer?: number;
  counter_offer_justification?: string;
  negotiation_history?: any[];
  status: ContractTermStatus;
  agreed_price?: number;
  agreed_terms?: string;
  failed_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StoryForContractTerm {
  id: string;
  story_id: string;
  title: string;
  writer_originator_name: string;
  genre: string;
  status: string;
}

/** Unified item type used in the contract term form dropdown (stories + call reports) */
export interface ProjectForContractTerm {
  id: string;           // UUID of the story or call_report
  display_id: string;   // ST-2025-0001 or CR-2026-7915
  title: string;
  writer_name: string;
  genre: string | null;
  item_type: "story" | "call_report";
}

/**
 * Fetch all approved stories eligible for contract terms
 * Stories must be in 'approved' status
 */
export async function getApprovedStoriesForContractTerms(): Promise<{
  data: StoryForContractTerm[] | null;
  error: Error | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stories")
    .select("id, story_id, title, writer_originator_name, genre, status")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching approved stories:", error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Fetch all contract terms (filtered by RLS)
 */
export async function getContractTerms(): Promise<{
  data: ContractTerm[] | null;
  error: Error | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .select(`
      *,
      stories!inner(
        story_id,
        title
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching negotiations:", error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Fetch a single contract term by ID
 */
export async function getContractTermById(id: string): Promise<{
  data: ContractTerm | null;
  error: Error | null;
}> {
  const supabase = createClient();

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
    console.error("Error fetching negotiation:", error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Create a new contract term from client components
 * This function should be called from client components
 */
export async function createContractTermClient(
  negotiationData: CreateContractTermFormData
): Promise<{
  data: ContractTerm | null;
  error: Error | null;
}> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: new Error("User not authenticated") };
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
      expected_start_date: negotiationData.project_start_date, // Same as project_start_date
      expected_completion_date: negotiationData.expected_completion_date,
      delivery_schedule: negotiationData.delivery_schedule,
      status: "in_progress",
      created_by: user.id,
      currency: "PKR",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating negotiation:", error);
    return { data: null, error: new Error(error.message) };
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
    // Note: We don't return error here as negotiation was created successfully
  }

  return { data, error: null };
}

/**
 * Update an existing negotiation
 */
export async function updateContractTermClient(
  id: string,
  updates: UpdateContractTermFormData
): Promise<{
  data: ContractTerm | null;
  error: Error | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating negotiation:", error);
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Delete a contract term
 */
export async function deleteContractTermClient(id: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const supabase = createClient();

  const { error } = await supabase
    .from("negotiations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting negotiation:", error);
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Mark contract term as agreed
 */
export async function markContractTermAgreed(
  id: string,
  agreedPrice: number,
  agreedTerms: string
): Promise<{
  data: ContractTerm | null;
  error: Error | null;
}> {
  const supabase = createClient();

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
    console.error("Error marking negotiation as agreed:", error);
    return { data: null, error: new Error(error.message) };
  }

  // Update story status to 'in_legal_review'
  if (data) {
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
  }

  return { data, error: null };
}

/**
 * Mark contract term as failed
 */
export async function markContractTermFailed(
  id: string,
  failedReason: string
): Promise<{
  data: ContractTerm | null;
  error: Error | null;
}> {
  const supabase = createClient();

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
    console.error("Error marking negotiation as failed:", error);
    return { data: null, error: new Error(error.message) };
  }

  // Update story status back to 'approved' or 'rejected'
  if (data) {
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
  }

  return { data, error: null };
}
