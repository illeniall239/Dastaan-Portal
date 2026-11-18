/**
 * Evaluate-when-logging: shared pieces for saving an item together with its logger's evaluation.
 *
 * Roles in MUST_EVALUATE_ROLES (lib/episodes/permissions.ts) must evaluate whatever they log — one-liners,
 * episodes, and revisions of either. The database enforces it (migration 20261118000001): the item and the
 * evaluation are written in one transaction by the log_*_with_evaluation functions, or not at all.
 * These helpers build those evaluation rows exactly as the regular evaluation routes do, and send the same
 * notifications.
 */
import { z } from "zod";
import { episodicEvaluationSchema, type EpisodicEvaluationFormData } from "@/lib/validations/episodic-evaluations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotifications, getUserIdsByRoles, getProjectTeamMemberIds, excludeUserFromList } from "@/lib/notifications/server";

// ── Episodes ────────────────────────────────────────────────────────────────────────────────────────

/** An episode/revision evaluation sent along with the item it evaluates (the server sets its target). */
export const loggedEpisodeEvaluationSchema = episodicEvaluationSchema.omit({
  episode_id: true,
  revision_id: true,
  cross_team_share_id: true,
});
export type LoggedEpisodeEvaluation = z.infer<typeof loggedEpisodeEvaluationSchema>;

/** The episodic_evaluations columns for an evaluation (scores/averages/team are filled by DB triggers). */
export function episodicEvaluationRow(
  d: LoggedEpisodeEvaluation | EpisodicEvaluationFormData,
  evaluatorId: string
) {
  return {
    evaluator_id: evaluatorId,
    is_feedback_only: d.is_feedback_only || false,
    no_of_pages: d.no_of_pages,
    no_of_scenes: d.no_of_scenes,
    events: d.events || [],
    freeze_ending_scene: d.freeze_ending_scene || null,
    summary_analysis: d.summary_analysis || null,
    remarks: d.remarks || null,
    conflict_of_content_score: d.conflict_of_content_score,
    characterization_score: d.characterization_score,
    story_progression_score: d.story_progression_score,
    main_event_score: d.main_event_score,
    small_event_score: d.small_event_score,
    dragness_score: d.dragness_score,
    freezes_score: d.freezes_score,
    whats_next_element_score: d.whats_next_element_score,
    overall_assessment_score: d.overall_assessment_score,
    conflict_of_content_comment: d.conflict_of_content_comment || null,
    characterization_comment: d.characterization_comment || null,
    story_progression_comment: d.story_progression_comment || null,
    main_event_comment: d.main_event_comment || null,
    small_event_comment: d.small_event_comment || null,
    dragness_comment: d.dragness_comment || null,
    freezes_comment: d.freezes_comment || null,
    whats_next_element_comment: d.whats_next_element_comment || null,
    overall_assessment_comment: d.overall_assessment_comment || null,
    scenes_remarks: d.scenes_remarks || null,
    characterization_remarks: d.characterization_remarks || null,
    time_spent_minutes: d.time_spent_minutes || null,
    started_at: d.started_at || null,
    decision: d.decision || null,
    decision_notes: d.decision_notes || null,
    feedback_text: d.feedback_text || null,
    feedback_attachment_url: d.feedback_attachment_url || null,
    feedback_attachment_name: d.feedback_attachment_name || null,
    feedback_attachments: d.feedback_attachments || [],
    original_submission_date: d.original_submission_date || null,
  };
}

/** Same notification as POST /api/episodic-evaluations: the team + the project's own team, anonymously. */
export async function notifyEpisodicEvaluation(episodeId: string, evaluatorId: string) {
  const admin = createAdminClient();
  const { data: ep } = await admin
    .from("episodes")
    .select("episode_number, call_report:call_reports(id, working_title)")
    .eq("id", episodeId)
    .single();
  const cr = (ep as any)?.call_report;
  const [roleIds, projectTeamIds] = await Promise.all([
    getUserIdsByRoles(["management", "content_manager", "content_creator"]),
    cr?.id ? getProjectTeamMemberIds(cr.id) : Promise.resolve([] as string[]),
  ]);
  const recipients = excludeUserFromList([...new Set([...roleIds, ...projectTeamIds])], evaluatorId);
  if (recipients.length === 0) return;
  const epLabel = ep?.episode_number ? `EP${ep.episode_number}` : "Episode";
  const dramaTitle = cr?.working_title || "Unknown";
  await createNotifications(
    recipients,
    "success",
    `New episodic evaluation: ${dramaTitle} — ${epLabel}`,
    `${epLabel} of "${dramaTitle}" has been evaluated. Review the scores in the evaluation section.`,
    "episode",
    episodeId,
    evaluatorId
  );
}

// ── One-liners ──────────────────────────────────────────────────────────────────────────────────────

const score = z.number().min(1, "Scores are 1–10").max(10, "Scores are 1–10");
const text = (max = 5000) => z.string().max(max).optional().nullable();

/** A one-liner evaluation as the evaluation form sends it (the server sets its target and form_id). */
export const oneLinerEvaluationSchema = z
  .object({
    target_writer: text(500),
    per_ep_price_range: text(200),
    genre: text(200),
    slot: text(100),
    big_idea: text(),
    theme: text(500),
    conflict_of_content_score: score,
    characterization_score: score,
    story_progression_score: score,
    whats_next_element_score: score,
    overall_oneliner_grade_score: score,
    conflict_of_content_comment: text(),
    characterization_comment: text(),
    story_progression_comment: text(),
    whats_next_element_comment: text(),
    overall_oneliner_grade_comment: text(),
    themes_of_drama: z.array(z.string().max(200)).max(50).optional(),
    corresponding_dramas: z.array(z.string().max(200)).max(50).optional(),
    theme_category: text(100),
    audience_focus: text(100),
    no_of_tracks: z.number().int().min(0).max(100).optional().nullable(),
    closing_remarks: text(),
    comments: text(),
    first_2_eps_required: z.boolean().optional().nullable(),
    decision: z.enum(["approve", "reject", "needs_improvement"]),
    decision_notes: text(),
    time_spent_minutes: z.number().int().min(0).optional().nullable(),
    started_at: z.string().datetime().optional().nullable(),
    is_late: z.boolean().optional(),
    delay_reason: text(),
    original_submission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    feedback_text: text(100000),
    feedback_attachment_url: text(2000),
    feedback_attachment_name: text(255),
    feedback_attachments: z.array(z.object({ url: z.string().max(2000), name: z.string().max(255) })).max(20).optional().default([]),
  })
  // The evaluation form's own rules, enforced on the server too
  .superRefine((d, ctx) => {
    const avg = (d.conflict_of_content_score + d.characterization_score + d.story_progression_score
      + d.whats_next_element_score + d.overall_oneliner_grade_score) / 5;
    if (d.decision === "approve" && avg < 5) {
      ctx.addIssue({ code: "custom", path: ["decision"], message: "An average below 5 can't be approved" });
    }
    if ((d.decision === "reject" || d.decision === "needs_improvement") && !d.decision_notes?.trim()) {
      ctx.addIssue({ code: "custom", path: ["decision_notes"], message: "Add notes for this decision" });
    }
  });
export type OneLinerEvaluation = z.infer<typeof oneLinerEvaluationSchema>;

/** The evaluator_forms columns for a one-liner evaluation (average/team are filled by DB triggers). */
export function oneLinerEvaluationRow(d: OneLinerEvaluation, evaluatorId: string) {
  return {
    evaluator_id: evaluatorId,
    target_writer: d.target_writer || null,
    per_ep_price_range: d.per_ep_price_range || null,
    genre: d.genre || null,
    slot: d.slot || null,
    big_idea: d.big_idea || null,
    theme: d.theme || null,
    conflict_of_content_score: d.conflict_of_content_score,
    characterization_score: d.characterization_score,
    story_progression_score: d.story_progression_score,
    whats_next_element_score: d.whats_next_element_score,
    overall_oneliner_grade_score: d.overall_oneliner_grade_score,
    conflict_of_content_comment: d.conflict_of_content_comment || null,
    characterization_comment: d.characterization_comment || null,
    story_progression_comment: d.story_progression_comment || null,
    whats_next_element_comment: d.whats_next_element_comment || null,
    overall_oneliner_grade_comment: d.overall_oneliner_grade_comment || null,
    themes_of_drama: d.themes_of_drama || [],
    corresponding_dramas: d.corresponding_dramas || [],
    theme_category: d.theme_category || null,
    audience_focus: d.audience_focus || null,
    no_of_tracks: d.no_of_tracks ?? null,
    closing_remarks: d.closing_remarks || null,
    comments: d.comments || null,
    first_2_eps_required: d.first_2_eps_required ?? null,
    decision: d.decision,
    decision_notes: d.decision_notes || null,
    time_spent_minutes: d.time_spent_minutes || null,
    started_at: d.started_at || null,
    submitted_at: new Date().toISOString(),
    is_late: d.is_late || false,
    delay_reason: d.delay_reason || null,
    original_submission_date: d.original_submission_date || null,
    feedback_text: d.feedback_text || null,
    feedback_attachment_url: d.feedback_attachment_url || null,
    feedback_attachment_name: d.feedback_attachment_name || null,
    feedback_attachments: d.feedback_attachments || [],
  };
}

/** Same notification as POST /api/evaluations/notify: the team + the project's own team, anonymously. */
export async function notifyOneLinerEvaluation(callReportId: string, evaluatorId: string) {
  const admin = createAdminClient();
  const { data: callReport } = await admin
    .from("call_reports")
    .select("working_title, call_report_id")
    .eq("id", callReportId)
    .single();
  const storyTitle = callReport?.working_title || callReport?.call_report_id || "Unknown";
  const [roleIds, projectTeamIds] = await Promise.all([
    getUserIdsByRoles(["management", "content_manager", "content_creator"]),
    getProjectTeamMemberIds(callReportId),
  ]);
  const recipients = excludeUserFromList([...new Set([...roleIds, ...projectTeamIds])], evaluatorId);
  if (recipients.length === 0) return;
  await createNotifications(
    recipients,
    "success",
    `New one-liner evaluation: ${storyTitle}`,
    `"${storyTitle}" has been evaluated. Review the scores in the evaluation section.`,
    "call_report",
    callReportId,
    evaluatorId
  );
}

/** Same notification as POST /api/call-reports/[id]/notify-logged (a logged one-liner, like a logged episode). */
export async function notifyOneLinerLogged(callReportId: string, loggerId: string) {
  const admin = createAdminClient();
  const { data: cr } = await admin
    .from("call_reports")
    .select("id, working_title, writer_name, team_id")
    .eq("id", callReportId)
    .single();
  if (!cr) return;
  const recipients = new Set<string>();
  if (cr.team_id) {
    const { data: team } = await admin.from("teams").select("team_head_id").eq("id", cr.team_id).single();
    if (team?.team_head_id) recipients.add(team.team_head_id);
  }
  (await getUserIdsByRoles(["management", "content_manager", "programmer"])).forEach((id) => recipients.add(id));
  recipients.delete(loggerId);
  if (recipients.size === 0) return;
  const { data: logger } = await admin.from("users").select("name").eq("id", loggerId).single();
  const storyLabel = cr.working_title ? ` for "${cr.working_title}"` : "";
  const writerLabel = cr.writer_name ? ` (writer: ${cr.writer_name})` : "";
  await createNotifications(
    [...recipients],
    "info",
    `New one-liner logged${storyLabel}`,
    `${logger?.name || "Someone"} logged a one-liner${storyLabel}${writerLabel}.`,
    "call_report",
    cr.id,
    loggerId
  );
}

// ── Errors ──────────────────────────────────────────────────────────────────────────────────────────

/** The database's evaluate-when-logging refusal, as a message for the user (null if it's another error). */
export function evaluationRequiredMessage(error: { message?: string } | null | undefined): string | null {
  const m = error?.message || "";
  const i = m.indexOf("EVALUATION_REQUIRED:");
  return i >= 0 ? m.slice(i + "EVALUATION_REQUIRED:".length).trim() : null;
}
