// User types
export type UserRole =
  | "admin"
  | "management"
  | "content_manager"
  | "evaluator"
  | "executive"
  | "legal"
  | "finance"
  | "content_creator";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  position?: string;
  avatar_url?: string;
  status?: string;
  created_at?: string;
  last_login?: string;
  updated_at?: string;
}

// Story types
export type StoryStatus =
  | "draft"
  | "submitted"
  | "in_evaluation"
  | "in_call_review"
  | "approved"
  | "in_negotiation"
  | "in_legal_review"
  | "contracted"
  | "in_payment"
  | "archived"
  | "rejected";

export type Genre =
  | "drama"
  | "comedy"
  | "action"
  | "thriller"
  | "romance"
  | "horror"
  | "sci-fi"
  | "fantasy"
  | "documentary"
  | "other";

export interface Story {
  id: string;
  story_id: string; // ST-YYYY-NNNN
  title: string;
  genre: Genre;
  synopsis: string;
  writer_name: string;
  writer_email: string;
  writer_phone?: string;
  status: StoryStatus;
  submitted_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Evaluation Status types
export type EvaluationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "accepted"
  | "needs_improvement"
  | "rejected"
  | "completed_after_deadline";

// Call Report types
export interface CallReport {
  id: string;
  call_report_id: string; // CR-YYYY-NNNN
  story_id: string;
  meeting_date: string;
  duration_minutes?: number; // Meeting duration in minutes (default: 60)
  end_time?: string; // Computed end time (meeting_date + duration)
  writer_name: string;
  contact_type: "Direct" | "Agent" | "Production Company" | "Other";
  contact_email: string;
  contact_phone?: string;
  contact_address?: string;
  working_title: string;
  logline: string;
  usp: string;
  genre: string; // Required field, accepts any text value
  meeting_notes: string;
  meeting_attendees: string[];
  next_steps?: string;
  status: "draft" | "ready_for_evaluation" | "in_review";
  evaluation_status?: EvaluationStatus;
  average_score?: number;
  current_average_score?: number;
  required_evaluators?: number; // Default: 20
  required_internal_evaluators?: number; // Default: 10
  required_external_evaluators?: number; // Default: 10
  completed_evaluations?: number; // 0-20
  completed_internal_evaluations?: number; // 0-10
  completed_external_evaluations?: number; // 0-10
  rejection_reason?: string;
  archived_at?: string;
  // Deadline tracking fields
  evaluation_deadline?: string; // 5 days from creation
  final_decision_made_at?: string; // Timestamp when auto-decision was made
  required_evaluations?: number; // Default: 5
  minimum_evaluations_for_deadline?: number; // Default: 3 (for deadline-based decision)
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Evaluator Assignment types
export type EvaluatorType = "internal" | "external";

export interface EvaluatorAssignment {
  id: string;
  call_report_id: string;
  evaluator_id: string;
  evaluator_type: EvaluatorType;
  status: "pending" | "in_progress" | "completed" | "expired_after_deadline";
  assigned_at: string;
  completed_at?: string;
  created_at: string;
}

// Evaluation Progress
export interface EvaluationProgress {
  total_required: number; // 20
  total_completed: number; // 0-20
  internal_required: number; // 10
  internal_completed: number; // 0-10
  external_required: number; // 10
  external_completed: number; // 0-10
  progress_percentage: number; // 0-100
  current_average: number | null; // Live score
  is_complete: boolean;
}

// Evaluation types
export interface Evaluation {
  id: string;
  story_id: string;
  evaluator_id: string;
  originality_score: number;
  market_potential_score: number;
  execution_feasibility_score: number;
  audience_appeal_score: number;
  budget_viability_score: number;
  cultural_relevance_score: number;
  competitive_advantage_score: number;
  production_complexity_score: number;
  total_score: number;
  written_feedback: string;
  recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
  submitted_at: string;
  created_at: string;
}

// Rejected Archive types
export interface RejectedArchiveItem {
  id: string;
  call_report_id: string;
  original_id: string;
  meeting_type: string;
  writer_name: string;
  working_title: string;
  logline: string;
  usp: string;
  meeting_date: string;
  average_score: number;
  total_evaluations: number;
  rejection_reason: string;
  archived_at: string;
  original_created_at: string;
}

export interface EvaluationSnapshot {
  id: string;
  form_id: string;
  evaluator_name: string;
  evaluator_email: string;
  premise_conflict_score: number;
  storyline_plot_score: number;
  episodic_progression_score: number;
  characters_score: number;
  overall_assessment_score: number;
  average_score: number;
  comments: string;
  submitted_at: string;
}

// Episode types
export interface Episode {
  id: string;
  call_report_id?: string | null;
  story_id?: string | null;
  episode_number: number;
  title?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  additional_info?: string | null;
  logged_by: string;
  created_at: string;
  updated_at: string;
}

export interface EpisodeWithDetails extends Episode {
  logged_by_user?: {
    name: string;
    email: string;
  };
  call_report?: {
    working_title: string;
    writer_name: string;
  };
  story?: {
    title: string;
    status: StoryStatus;
  };
}

// Event types
export interface EventItem {
  title: string;
  description: string;
  impact?: ImpactLevel;
}

export type ImpactLevel = "High Impact" | "Medium Impact" | "Low Impact";

// Episodic Evaluation types
export type EpisodicGrade = string; // Rating descriptions instead of letter grades

export interface EpisodicEvaluation {
  id: string;
  episode_id: string;
  evaluator_id: string;
  // Episode Details
  no_of_pages: number;
  no_of_scenes: number;
  pages_score: number; // +5 or -5
  scenes_score: number; // +5 or -5
  events: (string | EventItem)[]; // Array of event descriptions or objects with title, description, and impact
  // Evaluation Scores (1-10)
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  freezes_score: number;
  whats_next_element_score: number;
  // Calculated
  overall_average: number;
  overall_grade: EpisodicGrade;
  // Metadata
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface EpisodicEvaluationDraft {
  id: string;
  episode_id: string;
  evaluator_id: string;
  draft_data: {
    noOfPages: number;
    noOfScenes: number;
    events: any[];
    conflictScore: number;
    characterizationScore: number;
    progressionScore: number;
    freezesScore: number;
    whatsNextScore: number;
  };
  created_at: string;
  updated_at: string;
}

export interface EpisodicEvaluationWithDetails extends EpisodicEvaluation {
  evaluator?: {
    name: string;
    email: string;
  };
  episode?: EpisodeWithDetails;
}
