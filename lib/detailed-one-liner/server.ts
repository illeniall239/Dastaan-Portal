import { createClient } from "@/lib/supabase/server";
import type { DetailedOneLinerWithDetails } from "@/types";

/**
 * Get a detailed one-liner by ID from server components
 */
export async function getDetailedOneLinerById(id: string): Promise<DetailedOneLinerWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("detailed_one_liners")
    .select(`
      *,
      call_report:call_reports(
        id,
        call_report_id,
        working_title,
        writer_name,
        logline,
        genre
      ),
      narrative_breakdown_items(
        id,
        story_stream,
        percentage,
        narrative_purpose,
        sort_order,
        created_at
      ),
      event_planning_items(
        id,
        episode_range,
        event_scale,
        on_screen_activity,
        approx_frequency,
        budget_category,
        sort_order,
        created_at
      ),
      potential_weaknesses_risks_items(
        id,
        issue,
        explanation_risk_detail,
        impact,
        sort_order,
        created_at
      ),
      created_by_user:users!created_by(
        id,
        name,
        email
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching detailed one-liner:", error);
    return null;
  }

  // Sort narrative breakdown items by sort_order
  if (data.narrative_breakdown_items) {
    data.narrative_breakdown_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
  }

  // Sort event planning items by sort_order
  if (data.event_planning_items) {
    data.event_planning_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
  }

  // Sort potential weaknesses/risks items by sort_order
  if (data.potential_weaknesses_risks_items) {
    data.potential_weaknesses_risks_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
  }

  return data as DetailedOneLinerWithDetails;
}

/**
 * Get all detailed one-liners for a call report
 */
export async function getDetailedOneLinersByCallReport(callReportId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("detailed_one_liners")
    .select(`
      *,
      narrative_breakdown_items(
        id,
        story_stream,
        percentage,
        narrative_purpose,
        sort_order
      ),
      event_planning_items(
        id,
        episode_range,
        event_scale,
        on_screen_activity,
        approx_frequency,
        budget_category,
        sort_order
      ),
      potential_weaknesses_risks_items(
        id,
        issue,
        explanation_risk_detail,
        impact,
        sort_order
      ),
      created_by_user:users!created_by(
        id,
        name,
        email
      )
    `)
    .eq("call_report_id", callReportId);

  if (error) {
    console.error("Error fetching detailed one-liners:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all detailed one-liners with pagination
 */
export async function getAllDetailedOneLiners(limit = 50, offset = 0) {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("detailed_one_liners")
    .select(`
      *,
      call_report:call_reports(
        call_report_id,
        working_title,
        writer_name
      ),
      created_by_user:users!created_by(
        id,
        name,
        email
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching detailed one-liners:", error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}
