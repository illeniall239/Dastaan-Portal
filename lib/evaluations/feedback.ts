import type { SupabaseClient } from "@supabase/supabase-js";

export interface FeedbackAttachment {
  url: string;
  name: string;
}

/**
 * The *_with_type evaluation views don't carry the Feedback Communication fields. Fetch them from
 * the base table (only rows that have feedback) and set feedback_text / feedback_attachments on
 * each evaluation in place.
 */
export async function mergeEvaluationFeedback(
  admin: SupabaseClient<any, any, any>,
  table: "episodic_evaluations" | "evaluator_forms",
  parentColumn: "episode_id" | "call_report_id",
  parentIds: string[],
  evaluations: any[]
): Promise<void> {
  if (parentIds.length === 0 || evaluations.length === 0) return;
  const { data } = await admin
    .from(table)
    .select("id, feedback_text, feedback_attachments")
    .in(parentColumn, parentIds)
    .or("feedback_text.not.is.null,feedback_attachments.neq.[]");
  const byId = new Map((data || []).map((r: any) => [r.id, r]));
  for (const ev of evaluations) {
    const f = byId.get(ev.id);
    ev.feedback_text = f?.feedback_text || null;
    ev.feedback_attachments = f?.feedback_attachments || [];
  }
}
