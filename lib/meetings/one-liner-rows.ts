import type { CommercialPositioning, AudienceFocus } from "@/lib/project-tags";

/**
 * Input for creating a call report (One-Liner Report — enters story pipeline)
 */
export interface CreateMeetingInput {
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
  genre?: string[];
  theme?: string;
  slot?: string;
  content_type?: "Serial" | "Long Serial" | "Telefilm" | "Mini-serial" | "Ramadan Serial" | "Series Sitcom" | "Soap";
  commercial_positioning?: CommercialPositioning;
  audience_focus?: AudienceFocus;
  idea_by?: string;
  developed_by?: string;
  management_member_name?: string;
  meeting_date: string;
  duration_minutes?: number;
  attendees: string[];
  location?: string;
  notes: string;
  next_steps?: string;
  status: string;
  created_by: string;
  overall_rating?: number;
  time_spent_minutes?: number;
  form_started_at?: string;
  original_submission_date?: string;
}

/**
 * The story and call_report rows for a new one-liner — one source for both the browser path
 * (createMeetingClient) and the server path that saves it with its logger's evaluation.
 * The codes (story_id ST-…, call_report_id CR-…) and the story link are added by the caller.
 */
export function oneLinerRows(m: CreateMeetingInput, teamId: string, loggedAt: string) {
  const loggedAtMs = new Date(loggedAt).getTime();
  const callReport = {
    meeting_type: "call_report",
    team_id: teamId,
    created_at: loggedAt,
    logged_by: m.logged_by,
    category: m.category || null,
    writer_name: m.writer_name,
    suggested_writer: m.suggested_writer || null,
    contact_email: m.writer_email,
    contact_phone: m.contact_phone || null,
    contact_address: m.contact_address || null,
    contact_type: m.contact_type || "Direct",
    working_title: m.working_title,
    director: m.director || null,
    total_episodes: m.total_episodes || null,
    received_episodes: m.received_episodes || null,
    logline: m.logline,
    logline_image_url: m.logline_image_url || null,
    short_synopsis: m.short_synopsis || null,
    episodic_synopsis: m.episodic_synopsis || null,
    genre: m.genre && m.genre.length > 0 ? m.genre : null,
    theme: m.theme || null,
    // Map UI-provided slot to DB column target_slot
    target_slot: m.slot || null,
    content_type: m.content_type || null,
    commercial_positioning: m.commercial_positioning || null,
    audience_focus: m.audience_focus || null,
    idea_by: m.idea_by || null,
    developed_by: m.developed_by || null,
    management_member_name: m.management_member_name || null,
    meeting_date: m.meeting_date,
    duration_minutes: m.duration_minutes || 60, // Default to 60 minutes if not specified
    meeting_attendees: m.attendees,
    location: m.location || null,
    meeting_notes: m.notes,
    next_steps: m.next_steps || null,
    status: m.status,
    created_by: m.created_by,
    // Evaluation deadline tracking (5 days from creation)
    evaluation_deadline: new Date(loggedAtMs + 5 * 24 * 60 * 60 * 1000).toISOString(),
    required_evaluations: 5,
    minimum_evaluations_for_deadline: 3,
    overall_rating: m.overall_rating || null,
    time_spent_minutes: m.time_spent_minutes || null,
    form_started_at: m.form_started_at || null,
    original_submission_date: m.original_submission_date || null,
  };

  const story = {
    title: m.working_title,
    team_id: teamId,
    created_at: loggedAt,
    logged_by: m.logged_by,
    category: m.category || null,
    writer_originator_name: m.writer_name,
    suggested_writer: m.suggested_writer || null,
    synopsis: m.short_synopsis || m.logline,
    genre: m.genre && m.genre.length > 0 ? m.genre[0] : null, // Take first genre for story
    target_audience: m.slot || "general", // Use slot as target_audience fallback
    status: "submitted",
    current_stage: "evaluation",
    created_by: m.created_by,
  };

  return { story, callReport };
}
