import { createClient } from "@/lib/supabase/server";
import {
  createNotifications,
  getContentActivityNotificationRecipients,
} from "@/lib/notifications/server";

export interface Meeting {
  id: string;
  title: string;
  writer_name: string;
  meeting_date: string;
  attendees: string[];
  location: string;
  notes: string;
  created_by: string;
  created_at: string;
  call_report_id?: string;
  category?: string;
  logline?: string;
  detailed_one_liner_id?: string | null;
  has_detailed_one_liner?: boolean;
}

export interface CreateMeetingInput {
  meeting_type: 'scheduled_meeting' | 'call_report';
  logged_by: string;
  category: string;
  writer_name: string;
  writer_email: string;
  suggested_writer?: string;
  contact_phone?: string;
  contact_address?: string;
  working_title: string;
  logline: string;
  // deprecated fields retained for compatibility
  usp?: string;
  // removed: target_audience
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
    contact_type: "Direct",
    working_title: meetingData.working_title,
    logline: meetingData.logline,

    // target_audience removed from schema
    genre: meetingData.genre || 'other',
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
      logged_by: meetingData.logged_by,
      category: meetingData.category,
      writer_originator_name: meetingData.writer_name,
      suggested_writer: meetingData.suggested_writer || null,
      synopsis: meetingData.logline, // Use logline as synopsis since server version doesn't have short_synopsis
      genre: meetingData.genre || 'other',
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
      console.error("Supabase story insert error:", storyError);
      // If we get a policy violation on SELECT but the INSERT might have worked (unlikely with .select()),
      // we can try to fetch it again by the unique story_id we just generated.
      if (storyError.code === '42501' || storyError.message?.includes('policy')) {
         console.warn("Policy error on select, trying to fetch by story_id...");
         const { data: fetchedStory, error: fetchError } = await supabase
            .from("stories")
            .select("*")
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
      console.warn(`Duplicate story_id detected (${story_id}), retrying... (attempt ${attempt + 1}/${maxRetries})`);
      continue;
    }

    // If not a duplicate error or no retries left, break (will throw error below)
    break;
  }

  if (storyError) {
    console.error("Story creation error:", storyError);
    throw new Error(`Failed to create story: ${storyError.message}`);
  }

  if (!storyRecord || !storyRecord.id) {
    console.error("Story record is null or missing id:", storyRecord);
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

    const isScheduledMeeting = meetingData.meeting_type === 'scheduled_meeting';
    await createNotifications(
      recipientIds,
      "info",
      isScheduledMeeting
        ? `New meeting scheduled: ${meetingData.working_title}`
        : `New call report logged: ${meetingData.working_title}`,
      `Meeting with ${meetingData.writer_name} on ${formattedDate} at ${formattedTime}`,
      isScheduledMeeting ? "meeting_scheduled" : "call_report_logged",
      data.id,
      meetingData.created_by // Track who created this
    );
  } catch (notifError) {
    console.error("Failed to create notifications:", notifError);
    // Don't fail the meeting creation if notification fails
  }

  return data;
}

/**
 * Get all scheduled meetings for the content department (excludes call reports)
 * This function should be called from server components
 * Returns all meetings visible to the entire content department
 */
export async function getAllMeetings() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("call_reports")
    .select("*")
    .eq("meeting_type", "scheduled_meeting")
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

/**
 * Get all call reports for the content department (excludes scheduled meetings)
 * This function should be called from server components
 * Returns all call reports visible to the entire content department
 * Includes detailed one-liner information if available
 */
export async function getAllCallReports() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("call_reports")
    .select(`
      *,
      detailed_one_liners (
        id
      )
    `)
    .eq("meeting_type", "call_report")
    .order("meeting_date", { ascending: false }); // Most recent first for call reports

  if (error) {
    throw new Error(`Failed to fetch call reports: ${error.message}`);
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
    call_report_id: report.call_report_id,
    category: report.category,
    logline: report.logline,
    detailed_one_liner_id: report.detailed_one_liners?.[0]?.id || null,
    has_detailed_one_liner: !!report.detailed_one_liners?.[0]?.id,
  }));

  return meetings;
}

/**
 * Get all meetings for the content department within a specific date range
 * This function should be called from server components
 * Returns all meetings visible to the entire content department
 */
export async function getAllMeetingsByDateRange(startDate: string, endDate: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("call_reports")
    .select("*")
    .gte("meeting_date", startDate)
    .lte("meeting_date", endDate)
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
