import { createClient } from "@/lib/supabase/client";
import type { UpdateCallReportFormData } from "@/lib/validations/call-reports";
import { oneLinerRows, type CreateMeetingInput } from "@/lib/meetings/one-liner-rows";
import type { Meeting as MeetingType } from "@/types";

export type Meeting = MeetingType;

/**
 * Input for creating a simple calendar meeting (no story pipeline)
 */
export interface CreateSimpleMeetingInput {
  title: string;
  meeting_date: string;
  duration_minutes?: number;
  location?: string;
  notes?: string;
  agenda?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_type?: string;
  attendees?: string[];
  category?: string;
}

export type { CreateMeetingInput } from "@/lib/meetings/one-liner-rows";

/**
 * Create a simple calendar meeting (no story creation, no evaluation pipeline).
 * POSTs to /api/meetings which inserts into the `meetings` table.
 */
export async function createSimpleMeetingClient(
  meetingData: CreateSimpleMeetingInput
): Promise<MeetingType> {
  const response = await fetch("/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meetingData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to create meeting");
  }

  return result.meeting;
}

/**
 * Create a new call report (One-Liner Report) from client components.
 * This creates a Story + Call Report in the `call_reports` table.
 */
export async function createMeetingClient(meetingData: CreateMeetingInput) {
  const supabase = createClient();

  // Fetch the current user's team_id to satisfy strict RLS policies
  const { data: userProfile, error: userProfileError } = await supabase
    .from("users")
    .select("team_id, email")
    .eq("id", meetingData.created_by)
    .single();

  if (userProfileError) {
    console.error("Failed to fetch user profile for team_id", userProfileError);
    throw new Error("Unable to verify your team. Please try again.");
  }

  let teamId = userProfile?.team_id || null;

  // Fallback: try to find the team where this user is the head
  if (!teamId) {
    const { data: ownedTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("team_head_id", meetingData.created_by)
      .single();

    if (ownedTeam?.id) {
      teamId = ownedTeam.id;
      // Best effort to update the user profile so future requests succeed
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

  // Convert the meeting data to call report format (shared with the server path)
  const loggedAt = new Date().toISOString();
  const rows = oneLinerRows(meetingData, teamId, loggedAt);
  const callReportData = { call_report_id: call_report_id, ...rows.callReport };

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

    const storyData = { story_id: story_id, ...rows.story };

    // Insert and select the created record
    // Note: We must ensure the user has permission to SELECT the record they just created
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
    if (storyRecord) {
       // console.log("Story created successfully:", storyRecord.id);
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

  // Notify like a logged episode does. Sent server-side: the notifications table blocks
  // inserts from users. Fire-and-forget, a failed notification must not fail the logging.
  fetch(`/api/call-reports/${data.id}/notify-logged`, { method: "POST", keepalive: true }).catch(() => {});

  // Create audit log entry
  try {
    const auditLog = {
      entity_type: "call_report",
      entity_id: data.id,
      action: "created_call_report",
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
 * Queries the `meetings` table directly.
 */
export async function getUserMeetingsClient(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("created_by", userId)
    .order("meeting_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch meetings: ${error.message}`);
  }

  return (data || []) as MeetingType[];
}

/**
 * Get a single call report by ID
 * Client-side function that calls the API endpoint
 */
export async function getCallReportClient(id: string): Promise<any> {
  const response = await fetch(`/api/call-reports/${id}`, { cache: "no-store" });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch call report");
  }

  return result.callReport;
}

/**
 * Update an existing call report
 * Client-side function that calls the API endpoint
 */
export async function updateCallReportClient(
  id: string,
  data: UpdateCallReportFormData
): Promise<any> {
  const response = await fetch(`/api/call-reports/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    // Handle both string errors and validation error objects
    const errorMessage = typeof result.error === 'string'
      ? result.error
      : result.details || JSON.stringify(result.error) || "Failed to update call report";
    throw new Error(errorMessage);
  }

  return result.callReport;
}
