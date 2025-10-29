import { createClient as createServerClient } from "@/lib/supabase/server";

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
}

export interface CreateMeetingInput {
  title: string;
  writer_name: string;
  writer_email: string;
  meeting_date: string;
  attendees: string[];
  location: string;
  notes: string;
  created_by: string;
}

/**
 * Create a new meeting (stored as a call report)
 * This function should be called from server components
 */
export async function createMeeting(meetingData: CreateMeetingInput) {
  const supabase = await createServerClient();

  // Convert the meeting data to call report format
  const callReportData = {
    working_title: meetingData.title,
    writer_name: meetingData.writer_name,
    contact_email: meetingData.writer_email,
    meeting_date: meetingData.meeting_date,
    meeting_attendees: meetingData.attendees,
    meeting_notes: meetingData.notes,
    contact_type: "Direct",
    logline: meetingData.notes,
    // target_audience removed from schema
    target_slot: null,
    status: "draft",
    created_by: meetingData.created_by,
  };

  const { data, error } = await supabase
    .from("call_reports")
    .insert(callReportData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create meeting: ${error.message}`);
  }

  return data;
}

/**
 * Get all meetings for a user
 * This function should be called from server components
 */
export async function getUserMeetings(userId: string) {
  const supabase = await createServerClient();

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

/**
 * Get meetings for a specific date range
 * This function should be called from server components
 */
export async function getMeetingsByDateRange(userId: string, startDate: string, endDate: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("call_reports")
    .select("*")
    .eq("created_by", userId)
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