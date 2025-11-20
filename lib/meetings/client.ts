import { createClient } from "@/lib/supabase/client";
import type { UpdateCallReportFormData } from "@/lib/validations/call-reports";

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
  director?: string;
  total_episodes?: number;
  received_episodes?: number;
  logline: string;
  logline_image_url?: string;
  short_synopsis?: string;
  episodic_synopsis?: string;
  // target_audience deprecated for call_reports, keep optional for compatibility
  // removed: target_audience
  genre?: string[];
  theme?: string;
  slot?: string;
  content_type?: "Serial" | "Long Serial" | "Telefilm" | "Mini-serial" | "Ramadan Serial" | "Series Sitcom" | "Soap";
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
    director: meetingData.director || null,
    total_episodes: meetingData.total_episodes || null,
    received_episodes: meetingData.received_episodes || null,
    logline: meetingData.logline,
    logline_image_url: meetingData.logline_image_url || null,
    short_synopsis: meetingData.short_synopsis || null,
    episodic_synopsis: meetingData.episodic_synopsis || null,
    // target_audience removed from schema
    genre: meetingData.genre && meetingData.genre.length > 0 ? meetingData.genre : null,
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
      synopsis: meetingData.short_synopsis || meetingData.logline,
    genre: meetingData.genre && meetingData.genre.length > 0 ? meetingData.genre[0] : null, // Take first genre for story
      target_audience: meetingData.slot || 'general', // Use slot as target_audience fallback
      status: 'submitted',
      current_stage: 'evaluation',
      created_by: meetingData.created_by,
    };

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

  // Create notifications for management, evaluators, and content department members
  // Exclude the creator from receiving notification
  try {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const creatorId = user?.id;

    // Get all relevant users (management, evaluator, content_manager, content_creator)
    const { data: relevantUsers } = await supabase
      .from("users")
      .select("id")
      .in("role", ["management", "evaluator", "content_manager", "content_creator"])
      .eq("status", "active");

    if (relevantUsers && relevantUsers.length > 0) {
      // Exclude the creator from notification list
      const recipientUsers = relevantUsers.filter(u => u.id !== creatorId);

      if (recipientUsers.length > 0) {
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

        // Create notification for each relevant user (except creator)
        const isScheduledMeeting = meetingData.meeting_type === 'scheduled_meeting';
        const notifications = recipientUsers.map((user) => ({
          user_id: user.id,
          type: "info",
          title: isScheduledMeeting
            ? `New meeting scheduled: ${meetingData.working_title}`
            : `New call report logged: ${meetingData.working_title}`,
          message: `Meeting with ${meetingData.writer_name} on ${formattedDate} at ${formattedTime}`,
          entity_type: isScheduledMeeting ? "meeting_scheduled" : "call_report_logged",
          entity_id: data.id,
          created_by: creatorId,
          is_read: false,
        }));

        await supabase.from("notifications").insert(notifications);
      }
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

/**
 * Get a single call report by ID
 * Client-side function that calls the API endpoint
 */
export async function getCallReportClient(id: string): Promise<any> {
  const response = await fetch(`/api/call-reports/${id}`);
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
