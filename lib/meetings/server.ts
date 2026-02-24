import { createClient } from "@/lib/supabase/server";
import {
  createNotifications,
  getContentActivityNotificationRecipients,
} from "@/lib/notifications/server";
import { logger } from "@/lib/logger";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";

export interface MeetingWriter {
  writer_id: string;
  writer_name: string;
  writer_email?: string | null;
  writer_phone?: string | null;
  display_order: number;
}

/**
 * Server Meeting type — used for calendar meetings from the `meetings` table.
 * For call report data with writers/evaluations, use CallReportWithRelations instead.
 */
export interface Meeting {
  id: string;
  meeting_id?: string;
  title: string;
  meeting_date: string;
  duration_minutes?: number;
  location?: string | null;
  notes?: string | null;
  agenda?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_type?: string | null;
  attendees: string[];
  category?: string | null;
  status?: string;
  team_id?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Extended call report data with related writers & evaluations (used in call reports list)
 */
export interface CallReportWithRelations extends Meeting {
  call_report_id?: string;
  working_title?: string;
  logline?: string;
  detailed_one_liner_id?: string | null;
  has_detailed_one_liner?: boolean;
  writer_name?: string;
  writer_names?: string[];
  writers?: MeetingWriter[];
  logged_at?: string;
  inserted_at?: string;
  completed_evaluations?: number;
  required_evaluations?: number;
  current_average_score?: number;
  evaluation_status?: string;
  final_decision_made_at?: string;
  evaluation_log?: {
    final_decision: 'approved' | 'rejected' | 'needs_improvement' | 'pending';
    approval_count: number;
    rejection_count: number;
    needs_improvement_count: number;
    decision_reason: string;
  } | null;
  episodes?: Array<{
    episode_number: number;
    initial_assessment: number | null;
    average_initial_assessment?: number | null;
    assessment_count?: number | null;
    logged_by_name: string;
  }>;
}

export interface CreateMeetingInput {
  logged_by: string;
  category: string;
  writer_name: string;
  writer_email: string;
  suggested_writer?: string;
  contact_phone?: string;
  contact_address?: string;
  working_title: string;
  logline: string;
  genre?: string;
  theme?: string;
  target_slot?: string;
  meeting_date: string;
  attendees: string[];
  location?: string;
  notes: string;
  next_steps?: string;
  status: string;
  created_by: string;
}

/**
 * Create a new meeting (stored as a call report)
 * This function should be called from server components
 */
export async function createMeeting(meetingData: CreateMeetingInput) {
  const supabase = await createClient();

  // Fetch creator's team_id to satisfy strict RLS policies
  const { data: userProfile, error: userProfileError } = await supabase
    .from("users")
    .select("team_id, email")
    .eq("id", meetingData.created_by)
    .single();

  if (userProfileError) {
    logger.error("Failed to fetch user profile for team_id", userProfileError);
    throw new Error("Unable to verify your team. Please try again.");
  }

  let teamId = userProfile?.team_id || null;

  if (!teamId) {
    const { data: ownedTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("team_head_id", meetingData.created_by)
      .single();

    if (ownedTeam?.id) {
      teamId = ownedTeam.id;
      await supabase
        .from("users")
        .update({ team_id: teamId })
        .eq("id", meetingData.created_by);
    }
  }

  if (!teamId) {
    throw new Error(
      "Your account is not assigned to a team yet. Please contact an administrator."
    );
  }

  // Generate unique call_report_id in format CR-YYYY-NNNN
  const now = new Date();
  const year = now.getFullYear();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const call_report_id = `CR-${year}-${randomNum}`;

  // Convert the meeting data to call report format
  const loggedAt = new Date().toISOString();

  const callReportData = {
    call_report_id: call_report_id,
    meeting_type: "call_report",
    team_id: teamId,
    created_at: loggedAt,
    logged_by: meetingData.logged_by,
    category: meetingData.category,
    writer_name: meetingData.writer_name,
    suggested_writer: meetingData.suggested_writer || null,
    contact_email: meetingData.writer_email,
    contact_phone: meetingData.contact_phone || null,
    contact_address: meetingData.contact_address || null,
    contact_type: "Direct",
    working_title: meetingData.working_title,
    logline: meetingData.logline,

    // target_audience removed from schema
    genre: meetingData.genre || null,
    theme: meetingData.theme || null,
    target_slot: meetingData.target_slot || null,
    meeting_date: meetingData.meeting_date,
    meeting_attendees: meetingData.attendees,
    meeting_notes: meetingData.notes,
    next_steps: meetingData.next_steps || null,
    status: meetingData.status,
    created_by: meetingData.created_by,
    // Evaluation deadline tracking (5 days from creation)
    evaluation_deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    required_evaluations: 5,
    minimum_evaluations_for_deadline: 3,
  };

  // First, create a story record for this call report
  // Generate unique story_id in format ST-YYYY-NNNN
  // Retry up to 5 times if duplicate story_id is generated
  let storyRecord = null;
  let storyError = null;
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const storyRandomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const story_id = `ST-${year}-${storyRandomNum}`;

    const storyData = {
      story_id: story_id,
      title: meetingData.working_title,
      team_id: teamId,
      created_at: loggedAt,
      logged_by: meetingData.logged_by,
      category: meetingData.category,
      writer_originator_name: meetingData.writer_name,
      suggested_writer: meetingData.suggested_writer || null,
      synopsis: meetingData.logline, // Use logline as synopsis since server version doesn't have short_synopsis
      genre: meetingData.genre || null,
      target_audience: meetingData.target_slot || 'general', // Use target_slot as target_audience fallback
      status: 'submitted',
      current_stage: 'evaluation',
      created_by: meetingData.created_by,
    };

    // Insert and select the created record
    const result = await supabase
      .from("stories")
      .insert(storyData)
      .select()
      .single();

    storyRecord = result.data;
    storyError = result.error;

    if (storyError) {
      logger.error("Supabase story insert error:", storyError);
      // If we get a policy violation on SELECT but the INSERT might have worked (unlikely with .select()),
      // we can try to fetch it again by the unique story_id we just generated.
      if (storyError.code === '42501' || storyError.message?.includes('policy')) {
        logger.warn("Policy error on select, trying to fetch by story_id...");
        const { data: fetchedStory, error: fetchError } = await supabase
          .from("stories")
          .select("id, story_id, title, team_id, created_at, logged_by, category, writer_originator_name, suggested_writer, synopsis, genre, target_audience, status, current_stage, created_by")
          .eq("story_id", story_id)
          .single();

        if (fetchedStory && !fetchError) {
          storyRecord = fetchedStory;
          storyError = null;
        }
      }
    }

    // If successful, break
    if (!storyError && storyRecord && storyRecord.id) {
      break;
    }

    // Check if error is a duplicate constraint violation (PostgreSQL error code 23505)
    const isDuplicateError = storyError?.code === '23505' ||
      storyError?.message?.toLowerCase().includes('duplicate') ||
      storyError?.message?.toLowerCase().includes('unique');

    // If duplicate and we have retries left, try again
    if (isDuplicateError && attempt < maxRetries - 1) {
      logger.warn(`Duplicate story_id detected (${story_id}), retrying... (attempt ${attempt + 1}/${maxRetries})`);
      continue;
    }

    // If not a duplicate error or no retries left, break (will throw error below)
    break;
  }

  if (storyError) {
    logger.error("Story creation error:", storyError);
    throw new Error(`Failed to create story: ${storyError.message}`);
  }

  if (!storyRecord || !storyRecord.id) {
    logger.error("Story record is null or missing id:", storyRecord);
    throw new Error(`Failed to create story: Story record was not returned properly`);
  }

  // Now create the call report with the story_id linked
  const callReportDataWithStory = {
    ...callReportData,
    story_id: storyRecord.id,
  };

  const { data, error } = await supabase
    .from("call_reports")
    .insert(callReportDataWithStory)
    .select()
    .single();

  if (error) {
    // If call report fails, clean up the story
    await supabase.from("stories").delete().eq("id", storyRecord.id);
    throw new Error(`Failed to create meeting: ${error.message}`);
  }

  // Create notifications for content department members, management, and evaluators
  // Exclude the creator from receiving notification about their own action
  try {
    const recipientIds = await getContentActivityNotificationRecipients(meetingData.created_by);
    const meetingDate = new Date(meetingData.meeting_date);
    const formattedDate = meetingDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = meetingDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    await createNotifications(
      recipientIds,
      "info",
      `New call report logged: ${meetingData.working_title}`,
      `Meeting with ${meetingData.writer_name} on ${formattedDate} at ${formattedTime}`,
      "call_report_logged",
      data.id,
      meetingData.created_by // Track who created this
    );
  } catch (notifError) {
    logger.error("Failed to create notifications:", notifError);
    // Don't fail the meeting creation if notification fails
  }

  return data;
}

/**
 * Get all scheduled meetings from the `meetings` table.
 * This function should be called from server components.
 */
export async function getAllMeetings() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("meeting_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch meetings: ${error.message}`);
  }

  return (data || []) as Meeting[];
}

/**
 * Get all call reports for the content department (excludes scheduled meetings)
 * This function should be called from server components
 * Returns all call reports visible to the entire content department
 * Includes detailed one-liner information if available
 */
export async function getAllCallReports() {
  const supabase = await createClient();

  // Get current user and their team for team isolation
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  // Build base query
  let query = supabase
    .from("call_reports")
    .select(`
      *,
      team:teams (
        id,
        name,
        team_type
      ),
      detailed_one_liners (
        id
      ),
      call_report_writers:call_report_writers (
        writer_id,
        writer_email,
        writer_phone,
        display_order,
        writer:writers(name)
      ),
      evaluation_logs!evaluation_logs_call_report_id_fkey (
        final_decision,
        approval_count,
        rejection_count,
        needs_improvement_count,
        decision_reason
      )
    `)
  // TEAM ISOLATION: Apply filter unless admin/management/programmer
  const hasGlobalAccess = currentUser?.role && ['admin', 'management', 'programmer'].includes(currentUser.role);
  if (!hasGlobalAccess && currentUser?.team_id) {
    query = query.eq("team_id", currentUser.team_id);
  }

  const { data, error } = await query.order("meeting_date", { ascending: false }); // Most recent first for call reports

  if (error) {
    throw new Error(`Failed to fetch call reports: ${error.message}`);
  }

  // Batch fetch revision counts + latest comment
  let revisionMap: Record<string, { count: number; latest_comment: string | null; latest_date: string | null }> = {};
  if (data && data.length > 0) {
    const reportIds = data.map((r: any) => r.id);
    const { data: revisionData } = await supabase
      .from("call_report_revisions")
      .select("call_report_id, revision_number, comment, created_at")
      .in("call_report_id", reportIds)
      .order("revision_number", { ascending: false });

    if (revisionData) {
      for (const rev of revisionData) {
        const rid = rev.call_report_id;
        if (!revisionMap[rid]) {
          // First entry per report is the latest (desc order)
          revisionMap[rid] = { count: 1, latest_comment: rev.comment, latest_date: rev.created_at };
        } else {
          revisionMap[rid].count++;
        }
      }
    }
  }

  // Batch fetch episodes with initial_assessment for all call reports
  let episodeMap: Record<string, Array<{ episode_number: number; initial_assessment: number | null; average_initial_assessment?: number | null; assessment_count?: number | null; logged_by_name: string }>> = {};
  if (data && data.length > 0) {
    const reportIds = data.map((r: any) => r.id);
    const { data: episodeData } = await supabase
      .from("episodes")
      .select("call_report_id, episode_number, initial_assessment, average_initial_assessment, assessment_count, logged_by_user:users!logged_by(name)")
      .in("call_report_id", reportIds)
      .order("episode_number", { ascending: true });

    if (episodeData) {
      for (const ep of episodeData as any[]) {
        if (!ep.call_report_id) continue;
        if (!episodeMap[ep.call_report_id]) episodeMap[ep.call_report_id] = [];
        episodeMap[ep.call_report_id].push({
          episode_number: ep.episode_number,
          initial_assessment: ep.initial_assessment,
          average_initial_assessment: ep.average_initial_assessment,
          assessment_count: ep.assessment_count,
          logged_by_name: ep.logged_by_user?.name || "Unknown",
        });
      }
    }
  }

  // Batch fetch story approval status for all call reports
  interface ManagementApproval {
    name: string;
    decision: string;
  }
  interface ApprovalStatus {
    isFullyApproved: boolean;
    isRejected: boolean;
    approvedCount: number;
    managementApproved: boolean;
    managementApprovals: ManagementApproval[];
  }
  let approvalStatusMap: Record<string, ApprovalStatus> = {};
  if (data && data.length > 0) {
    const reportIds = data.map((r: any) => r.id);
    const { data: approvalData } = await supabase
      .from("story_approvals")
      .select("call_report_id, decision, approver_type, user:users!user_id(email, name)")
      .in("call_report_id", reportIds);

    if (approvalData) {
      // Group by call_report_id
      const grouped: Record<string, typeof approvalData> = {};
      for (const a of approvalData) {
        if (!grouped[a.call_report_id]) grouped[a.call_report_id] = [];
        grouped[a.call_report_id].push(a);
      }

      for (const [reportId, approvals] of Object.entries(grouped)) {
        const approved = approvals.filter(a => a.decision === "approved");
        const managementRejected = approvals.some(a => a.decision === "rejected" && a.approver_type === "management");

        // Check mandatory approvers specifically
        const mandatoryApprovedEmails = approved
          .filter(a => a.approver_type === "management" && MANDATORY_APPROVER_EMAILS.includes((a.user as any)?.email))
          .map(a => (a.user as any)?.email);
        const allMandatoryApproved = MANDATORY_APPROVER_EMAILS.every(email => mandatoryApprovedEmails.includes(email));
        const thirdApproved = approved.some(a => a.approver_type !== "management");

        // Collect individual management approver decisions
        const mgmtApprovals: ManagementApproval[] = approvals
          .filter(a => a.approver_type === "management")
          .map(a => ({
            name: (a.user as any)?.name || (a.user as any)?.email || "Unknown",
            decision: a.decision,
          }));

        approvalStatusMap[reportId] = {
          isFullyApproved: allMandatoryApproved && thirdApproved,
          isRejected: managementRejected,
          approvedCount: approved.length,
          managementApproved: allMandatoryApproved,
          managementApprovals: mgmtApprovals,
        };
      }
    }
  }

  interface CallReportWriterData {
    writer_id: string;
    writer_email: string | null;
    writer_phone: string | null;
    display_order: number;
    writer: {
      name: string;
    } | null;
  }

  interface EvaluationLogData {
    final_decision: 'approved' | 'rejected' | 'needs_improvement' | 'pending';
    approval_count: number;
    rejection_count: number;
    needs_improvement_count: number;
    decision_reason: string;
  }

  interface CallReportQueryResult {
    id: string;
    call_report_id: string;
    working_title: string;
    writer_name: string;
    meeting_date: string;
    meeting_attendees: string[] | null;
    meeting_notes: string;
    created_by: string;
    created_at: string;
    category: string;
    logline: string;
    call_report_writers?: CallReportWriterData[];
    detailed_one_liners?: Array<{ id: string }>;
    evaluation_logs?: EvaluationLogData[];
  }

  // Transform call reports to meeting format
  const meetings: CallReportWithRelations[] = data.map((report: CallReportQueryResult) => {
    const writers: MeetingWriter[] =
      report.call_report_writers?.map((writer: CallReportWriterData) => ({
        writer_id: writer.writer_id,
        writer_name: writer.writer?.name || "",
        writer_email: writer.writer_email,
        writer_phone: writer.writer_phone,
        display_order: writer.display_order ?? 0,
      })) || [];

    const sortedWriters = writers.sort(
      (a, b) => a.display_order - b.display_order
    );
    const writerNames = sortedWriters
      .map((writer) => writer.writer_name)
      .filter((name) => !!name);

    return {
      id: report.id,
      title: report.working_title,
      writer_name: writerNames[0] || report.writer_name,
      meeting_date: report.meeting_date,
      attendees: report.meeting_attendees || [],
      location: "", // Not directly stored in call_reports
      notes: report.meeting_notes,
      created_by: report.created_by,
      created_at: report.created_at,
      call_report_id: report.call_report_id,
      category: report.category,
      logline: report.logline,
      detailed_one_liner_id: report.detailed_one_liners?.[0]?.id || null,
      has_detailed_one_liner: !!report.detailed_one_liners?.[0]?.id,
      writer_names: writerNames,
      writers: sortedWriters,
      next_steps: (report as any).next_steps || null,
      evaluation_log: report.evaluation_logs?.[0] || null,
      revision_count: revisionMap[report.id]?.count || 0,
      latest_revision_comment: revisionMap[report.id]?.latest_comment || null,
      latest_revision_date: revisionMap[report.id]?.latest_date || null,
      episodes: episodeMap[report.id] || [],
      approval_status: approvalStatusMap[report.id] || null,
      team: (report as any).team || null,
      logged_by: (report as any).logged_by || null,
    };
  });

  return meetings;
}

/**
 * Get all meetings within a specific date range from the `meetings` table.
 * This function should be called from server components.
 */
export async function getAllMeetingsByDateRange(startDate: string, endDate: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .gte("meeting_date", startDate)
    .lte("meeting_date", endDate)
    .order("meeting_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch meetings: ${error.message}`);
  }

  return (data || []) as Meeting[];
}
