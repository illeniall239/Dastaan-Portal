import { createClient } from "@/lib/supabase/client";

export interface Meeting {
  id: string;
  title: string;
  writer_name: string;
  meeting_date: string;
  duration_minutes?: number;
  end_time?: string;
  attendees: string[];
  location: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface CreateMeetingInput {
  meeting_type: 'scheduled_meeting' | 'call_report';
  logged_by: string;
  category: string;
  writer_name: string;
  writer_email: string;
  contact_type?: string;
  suggested_writer?: string;
  contact_phone?: string;
  contact_address?: string;
  working_title: string;
  logline: string;
  short_synopsis?: string;
  episodic_synopsis?: string;
  // target_audience deprecated for call_reports, keep optional for compatibility
  // removed: target_audience
  genre?: string;
  theme?: string;
  slot?: string;
  meeting_date: string;
  duration_minutes?: number; // Meeting duration in minutes (default: 60)
  attendees: string[];
  location?: string;
  notes: string;
  next_steps?: string;
  status: string;
  created_by: string;
  overall_rating?: number; // Initial assessment score (1-10) - only for call reports
}

/**
 * Create a new meeting from client components
 * This function should be called from client components
 */
export async function createMeetingClient(meetingData: CreateMeetingInput) {
  const supabase = createClient();

  // Generate unique call_report_id in format CR-YYYY-NNNN
  const now = new Date();
  const year = now.getFullYear();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const call_report_id = `CR-${year}-${randomNum}`;

  // Convert the meeting data to call report format
  const callReportData = {
    call_report_id: call_report_id,
    meeting_type: meetingData.meeting_type,
    logged_by: meetingData.logged_by,
    category: meetingData.category,
    writer_name: meetingData.writer_name,
    suggested_writer: meetingData.suggested_writer || null,
    contact_email: meetingData.writer_email,
    contact_phone: meetingData.contact_phone || null,
    contact_address: meetingData.contact_address || null,
    contact_type: meetingData.contact_type || "Direct",
    working_title: meetingData.working_title,
    logline: meetingData.logline,
    short_synopsis: meetingData.short_synopsis || null,
    episodic_synopsis: meetingData.episodic_synopsis || null,
    // target_audience removed from schema
    genre: meetingData.genre || 'other',
    theme: meetingData.theme || null,
    // Map UI-provided slot to DB column target_slot
    target_slot: meetingData.slot || null,
    meeting_date: meetingData.meeting_date,
    duration_minutes: meetingData.duration_minutes || 60, // Default to 60 minutes if not specified
    meeting_attendees: meetingData.attendees,
    meeting_notes: meetingData.notes,
    next_steps: meetingData.next_steps || null,
    status: meetingData.status,
    created_by: meetingData.created_by,
    // Evaluation deadline tracking (5 days from creation)
    evaluation_deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    required_evaluations: 5,
    minimum_evaluations_for_deadline: 3,
    overall_rating: meetingData.overall_rating || null,
  };

  // First, create a story record for this call report
  // Generate unique story_id in format ST-YYYY-NNNN
  const storyRandomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const story_id = `ST-${year}-${storyRandomNum}`;

  const storyData = {
    story_id: story_id,
    title: meetingData.working_title,
    logged_by: meetingData.logged_by,
    category: meetingData.category,
    writer_originator_name: meetingData.writer_name,
    suggested_writer: meetingData.suggested_writer || null,
    synopsis: meetingData.short_synopsis || meetingData.logline,
    genre: meetingData.genre || 'other',
    target_audience: meetingData.slot || 'general', // Use slot as target_audience fallback
    status: 'submitted',
    current_stage: 'evaluation',
    created_by: meetingData.created_by,
  };

  const { data: storyRecord, error: storyError } = await supabase
    .from("stories")
    .insert(storyData)
    .select()
    .single();

  if (storyError) {
    throw new Error(`Failed to create story: ${storyError.message}`);
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

  // Create notifications for content department members
  try {
    // Get all content department users
    const { data: contentUsers } = await supabase
      .from("users")
      .select("id")
      .eq("role", "content_creator")
      .eq("status", "active");

    if (contentUsers && contentUsers.length > 0) {
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

      // Create notification for each content department member
      const isScheduledMeeting = meetingData.meeting_type === 'scheduled_meeting';
      const notifications = contentUsers.map((user) => ({
        user_id: user.id,
        type: "info",
        title: isScheduledMeeting
          ? `New meeting scheduled: ${meetingData.working_title}`
          : `New call report logged: ${meetingData.working_title}`,
        message: `Meeting with ${meetingData.writer_name} on ${formattedDate} at ${formattedTime}`,
        entity_type: isScheduledMeeting ? "meeting_scheduled" : "call_report_logged",
        entity_id: data.id,
        is_read: false,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  } catch (notifError) {
    console.error("Failed to create notifications:", notifError);
    // Don't fail the meeting creation if notification fails
  }

  // Create audit log entry
  try {
    const auditLog = {
      entity_type: "call_report",
      entity_id: data.id,
      action: meetingData.meeting_type === 'scheduled_meeting' ? "created_meeting" : "created_call_report",
      performed_by: meetingData.created_by,
      timestamp: new Date().toISOString(),
      details: {
        title: meetingData.working_title,
        writer: meetingData.writer_name,
        category: meetingData.category,
        date: meetingData.meeting_date
      }
    };

    await supabase.from("audit_logs").insert(auditLog);
  } catch (auditError) {
    console.error("Failed to create audit log:", auditError);
    // Don't fail the meeting creation if audit logging fails
  }

  return data;
}

/**
 * Get all meetings for a user from client components
 * This function should be called from client components
 */
export async function getUserMeetingsClient(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("call_reports")
    .select("*")
    .eq("created_by", userId)
    .order("meeting_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch meetings: ${error.message}`);
  }

  // Transform call reports to meeting format
  const meetings: Meeting[] = data.map((report: any) => ({
    id: report.id,
    title: report.working_title,
    writer_name: report.writer_name,
    meeting_date: report.meeting_date,
    attendees: report.meeting_attendees || [],
    location: "", // Not directly stored in call_reports
    notes: report.meeting_notes,
    created_by: report.created_by,
    created_at: report.created_at,
  }));

  return meetings;
}
