import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";

export interface Evaluation {
  id: string;
  form_id: string;
  call_report_id: string;
  evaluator_id: string;
  target_writer?: string;
  per_ep_price_range?: string;
  genre?: string;
  slot?: string;
  big_idea?: string;
  theme?: string;
  // New criteria
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  whats_next_element_score: number;
  overall_oneliner_grade_score: number;
  conflict_of_content_comment?: string;
  characterization_comment?: string;
  story_progression_comment?: string;
  whats_next_element_comment?: string;
  overall_oneliner_grade_comment?: string;
  // Descriptive evaluation
  themes_of_drama?: string[];
  corresponding_dramas?: string[];
  theme_category?: string;
  no_of_tracks?: number;
  closing_remarks?: string;
  // Legacy criteria (kept for old evaluations)
  premise_conflict_score?: number;
  storyline_plot_score?: number;
  episodic_progression_score?: number;
  characters_score?: number;
  overall_assessment_score?: number;
  // Other
  first_2_eps_required?: boolean;
  average_score?: number;
  comments?: string;
  decision?: "approve" | "reject" | "needs_improvement";
  decision_notes?: string;
  is_late?: boolean;
  delay_reason?: string;
  created_at: string;
  submitted_at?: string;
}

export interface CreateEvaluationInput {
  call_report_id: string;
  evaluator_id: string;
  cross_team_share_id?: string;
  revision_id?: string | null;
  target_writer?: string;
  per_ep_price_range?: string;
  genre?: string;
  slot?: string;
  big_idea?: string;
  theme?: string;
  // New criteria
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  whats_next_element_score: number;
  overall_oneliner_grade_score: number;
  conflict_of_content_comment?: string;
  characterization_comment?: string;
  story_progression_comment?: string;
  whats_next_element_comment?: string;
  overall_oneliner_grade_comment?: string;
  // Descriptive evaluation
  themes_of_drama?: string[];
  corresponding_dramas?: string[];
  theme_category?: string;
  no_of_tracks?: number;
  closing_remarks?: string;
  // Other
  first_2_eps_required?: boolean;
  comments?: string;
  decision: "approve" | "reject" | "needs_improvement";
  decision_notes?: string;
  time_spent_minutes?: number;
  started_at?: string;
  is_late?: boolean;
  delay_reason?: string;
}

export interface UpdateEvaluationInput {
  id: string;
  target_writer?: string | null;
  per_ep_price_range?: string | null;
  genre?: string | null;
  slot?: string | null;
  big_idea?: string | null;
  theme?: string | null;
  // New criteria
  conflict_of_content_score?: number;
  characterization_score?: number;
  story_progression_score?: number;
  whats_next_element_score?: number;
  overall_oneliner_grade_score?: number;
  conflict_of_content_comment?: string | null;
  characterization_comment?: string | null;
  story_progression_comment?: string | null;
  whats_next_element_comment?: string | null;
  overall_oneliner_grade_comment?: string | null;
  // Descriptive evaluation
  themes_of_drama?: string[];
  corresponding_dramas?: string[];
  theme_category?: string | null;
  no_of_tracks?: number | null;
  closing_remarks?: string | null;
  // Other
  first_2_eps_required?: boolean | null;
  comments?: string | null;
  decision?: "approve" | "reject" | "needs_improvement";
  decision_notes?: string | null;
  time_spent_minutes?: number;
  started_at?: string;
  is_late?: boolean;
  delay_reason?: string | null;
}

/**
 * Create a new evaluation from client components
 * This function should be called from client components
 */
export async function createEvaluationClient(evaluationData: CreateEvaluationInput) {
  const supabase = createClient();

  // Generate unique form_id in format EVAL-YYYY-NNNN
  const now = new Date();
  const year = now.getFullYear();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const form_id = `EVAL-${year}-${randomNum}`;

  const { data, error } = await supabase
    .from("evaluator_forms")
    .insert({
      form_id,
      call_report_id: evaluationData.call_report_id,
      evaluator_id: evaluationData.evaluator_id,
      cross_team_share_id: evaluationData.cross_team_share_id || null,
      revision_id: evaluationData.revision_id || null,
      target_writer: evaluationData.target_writer || null,
      per_ep_price_range: evaluationData.per_ep_price_range || null,
      genre: evaluationData.genre || null,
      slot: evaluationData.slot || null,
      big_idea: evaluationData.big_idea || null,
      theme: evaluationData.theme || null,
      // New criteria
      conflict_of_content_score: evaluationData.conflict_of_content_score,
      characterization_score: evaluationData.characterization_score,
      story_progression_score: evaluationData.story_progression_score,
      whats_next_element_score: evaluationData.whats_next_element_score,
      overall_oneliner_grade_score: evaluationData.overall_oneliner_grade_score,
      conflict_of_content_comment: evaluationData.conflict_of_content_comment || null,
      characterization_comment: evaluationData.characterization_comment || null,
      story_progression_comment: evaluationData.story_progression_comment || null,
      whats_next_element_comment: evaluationData.whats_next_element_comment || null,
      overall_oneliner_grade_comment: evaluationData.overall_oneliner_grade_comment || null,
      // Descriptive evaluation
      themes_of_drama: evaluationData.themes_of_drama || [],
      corresponding_dramas: evaluationData.corresponding_dramas || [],
      theme_category: evaluationData.theme_category || null,
      no_of_tracks: evaluationData.no_of_tracks ?? null,
      closing_remarks: evaluationData.closing_remarks || null,
      // Other
      comments: evaluationData.comments || null,
      first_2_eps_required: evaluationData.first_2_eps_required || null,
      decision: evaluationData.decision,
      decision_notes: evaluationData.decision_notes || null,
      time_spent_minutes: evaluationData.time_spent_minutes || null,
      started_at: evaluationData.started_at || null,
      submitted_at: new Date().toISOString(),
      is_late: evaluationData.is_late || false,
      delay_reason: evaluationData.delay_reason || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create evaluation: ${error.message}`);
  }

  // Get the call report for notifications and audit log
  interface CallReportInfo {
    working_title: string;
    writer_name: string;
  }
  let callReport: CallReportInfo | null = null;

  // Create notifications for content department members
  try {
    // Get the call report to include project details in notification
    const { data: callReportData } = await supabase
      .from("call_reports")
      .select("working_title, writer_name")
      .eq("id", evaluationData.call_report_id)
      .single();

    callReport = callReportData;

    // Get current evaluator ID
    const { data: { user } } = await supabase.auth.getUser();
    const evaluatorId = user?.id;

    // Get all relevant users (management, content_manager, content_creator)
    // Exclude the evaluator who submitted the evaluation
    const { data: relevantUsers } = await supabase
      .from("users")
      .select("id")
      .in("role", ["management", "content_manager", "content_creator"])
      .eq("status", "active");

    if (relevantUsers && relevantUsers.length > 0 && callReport) {
      // Exclude the evaluator from notification list
      const recipientUsers = relevantUsers.filter(u => u.id !== evaluatorId);

      if (recipientUsers.length > 0) {
        const notifications = recipientUsers.map((user) => ({
          user_id: user.id,
          type: "success",
          title: `New evaluation submitted: ${callReport?.working_title || "Unknown"}`,
          message: `Evaluation completed with average score: ${data.average_score}/10`,
          entity_type: "evaluation_submitted",
          entity_id: data.id,
          created_by: evaluatorId,
          is_read: false,
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }
  } catch (notifError) {
    logger.error("Failed to create notifications:", notifError);
    // Don't fail the evaluation creation if notification fails
  }

  // Notify approval gate participants (Humera, Salman, and programmers)
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Get Humera and Salman's user IDs by email
    const { data: mandatoryUsers } = await supabase
      .from("users")
      .select("id")
      .in("email", MANDATORY_APPROVER_EMAILS)
      .eq("status", "active");

    // Get all programmer user IDs
    const { data: programmerUsers } = await supabase
      .from("users")
      .select("id")
      .eq("role", "programmer")
      .eq("status", "active");

    const approvalRecipientIds = new Set<string>();
    mandatoryUsers?.forEach(u => approvalRecipientIds.add(u.id));
    programmerUsers?.forEach(u => approvalRecipientIds.add(u.id));

    // Exclude the evaluator who submitted
    if (currentUser?.id) approvalRecipientIds.delete(currentUser.id);

    if (approvalRecipientIds.size > 0 && callReport) {
      const approvalNotifications = Array.from(approvalRecipientIds).map(userId => ({
        user_id: userId,
        type: "info",
        title: `Story awaiting your approval: ${callReport?.working_title || "Unknown"}`,
        message: `An evaluation has been completed. Please review and approve/reject this story.`,
        entity_type: "story_approval_pending",
        entity_id: evaluationData.call_report_id,
        created_by: currentUser?.id || null,
        is_read: false,
      }));

      await supabase.from("notifications").insert(approvalNotifications);
    }
  } catch (approvalNotifError) {
    logger.error("Failed to create approval gate notifications:", approvalNotifError);
  }

  // Create audit log entry
  try {
    const auditLog = {
      entity_type: "evaluation",
      entity_id: data.id,
      action: "submitted_evaluation",
      performed_by: evaluationData.evaluator_id,
      timestamp: new Date().toISOString(),
      details: {
        project_title: callReport?.working_title || "",
        average_score: data.average_score,
        evaluator: callReport?.writer_name || ""
      }
    };

    await supabase.from("audit_logs").insert(auditLog);
  } catch (auditError) {
    logger.error("Failed to create audit log:", auditError);
    // Don't fail the evaluation creation if audit logging fails
  }

  return data;
}

/**
 * Update an existing evaluation from client components (owner only via RLS)
 */
export async function updateEvaluationClient(evaluationData: UpdateEvaluationInput) {
  const supabase = createClient();

  const {
    id,
    target_writer,
    per_ep_price_range,
    genre,
    slot,
    big_idea,
    theme,
    conflict_of_content_score,
    characterization_score,
    story_progression_score,
    whats_next_element_score,
    overall_oneliner_grade_score,
    conflict_of_content_comment,
    characterization_comment,
    story_progression_comment,
    whats_next_element_comment,
    overall_oneliner_grade_comment,
    themes_of_drama,
    corresponding_dramas,
    theme_category,
    no_of_tracks,
    closing_remarks,
    first_2_eps_required,
    comments,
    time_spent_minutes,
    started_at,
    is_late,
    delay_reason,
  } = evaluationData;

  const updatePayload = {
    target_writer: target_writer ?? null,
    per_ep_price_range: per_ep_price_range ?? null,
    genre: genre ?? null,
    slot: slot ?? null,
    big_idea: big_idea ?? null,
    theme: theme ?? null,
    // New criteria
    conflict_of_content_score,
    characterization_score,
    story_progression_score,
    whats_next_element_score,
    overall_oneliner_grade_score,
    conflict_of_content_comment: conflict_of_content_comment ?? null,
    characterization_comment: characterization_comment ?? null,
    story_progression_comment: story_progression_comment ?? null,
    whats_next_element_comment: whats_next_element_comment ?? null,
    overall_oneliner_grade_comment: overall_oneliner_grade_comment ?? null,
    // Descriptive evaluation
    themes_of_drama: themes_of_drama ?? [],
    corresponding_dramas: corresponding_dramas ?? [],
    theme_category: theme_category ?? null,
    no_of_tracks: no_of_tracks ?? null,
    closing_remarks: closing_remarks ?? null,
    // Other
    first_2_eps_required: first_2_eps_required ?? null,
    comments: comments ?? null,
    decision: evaluationData.decision,
    decision_notes: evaluationData.decision_notes ?? null,
    time_spent_minutes: time_spent_minutes ?? null,
    started_at: started_at ?? null,
    is_late: is_late ?? false,
    delay_reason: delay_reason ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("evaluator_forms")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update evaluation: ${error.message}`);
  }

  return data;
}

/**
 * Get all evaluations from client components
 * This function should be called from client components
 */
export async function getEvaluationsClient() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("evaluator_forms")
    .select(`
      *,
      call_reports:call_report_id (
        working_title,
        writer_name,
        call_report_id
      ),
      evaluators:evaluator_id (
        name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch evaluations: ${error.message}`);
  }

  return data;
}

/**
 * Get a single evaluation by ID from client components
 */
export async function getEvaluationByIdClient(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("evaluator_forms")
    .select(`
      *,
      call_reports:call_report_id (
        working_title,
        writer_name,
        call_report_id,
        logline,
        category
      ),
      evaluators:evaluator_id (
        name,
        email
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch evaluation: ${error.message}`);
  }

  return data;
}
