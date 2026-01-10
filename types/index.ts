// Writer types
export interface Writer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// User types
export type UserRole =
  | "admin"
  | "management"
  | "content_manager"
  | "content_head"
  | "evaluator"
  | "executive"
  | "legal"
  | "finance"
  | "content_creator"
  | "programmer";

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
  team_id?: string; // Team this user belongs to
  team?: Team; // Populated when joining with teams table
  created_at?: string;
  last_login?: string;
  updated_at?: string;
}

// Team types
export type TeamType = "production" | "channel" | "adaptation" | "evaluator" | "other";

export interface Team {
  id: string;
  name: string;
  description?: string;
  parent_team_id?: string;
  team_type: TeamType;
  team_head_id?: string;
  created_at: string;
  updated_at: string;
  // Populated when joining with other tables
  parent_team?: Team;
  team_head?: User;
  member_count?: number;
}

export interface TeamHierarchy {
  team_id: string;
  team_name: string;
  parent_team_id?: string;
  team_head_id?: string;
  team_type: TeamType;
  level: number; // 0 for top-level teams
  hierarchy_path: string[]; // Array of team IDs from root to this team
  hierarchy_display: string; // Human-readable path like "Parent > Child > Grandchild"
}

export interface TeamPerformance {
  team_id: string;
  team_name: string;
  team_type: TeamType;
  description?: string;
  team_head_id?: string;
  team_head_name?: string;
  team_head_email?: string;
  // Team composition
  team_member_count: number;
  // Call Reports metrics
  call_reports_created: number; // Last 90 days
  call_reports_last_30_days: number;
  // Evaluation metrics
  evaluations_completed: number; // Last 90 days
  evaluations_last_30_days: number;
  avg_evaluation_score?: number;
  // One-Liner metrics
  one_liners_logged: number; // Last 90 days
  one_liners_last_30_days: number;
  // Approval/Rejection metrics
  stories_approved: number; // Last 90 days
  stories_rejected: number; // Last 90 days
  stories_approved_last_30_days: number;
  stories_rejected_last_30_days: number;
  // Activity tracking
  last_activity?: string;
  team_created_at: string;
  metrics_updated_at: string;
}

export interface TeamMember {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  user_team_id: string;
  team_level: number; // 0 for direct team members, >0 for sub-team members
  position?: string;
  department?: string;
}

export interface TeamFormData {
  name: string;
  description?: string;
  parent_team_id?: string;
  team_type: TeamType;
  team_head_id?: string;
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
  genre: Genre | null;
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

/**
 * Call Report type representing writer engagement meetings
 *
 * @remarks
 * Call reports support multiple writers through the `writers` array.
 * The `writer_name` field is deprecated but kept for backward compatibility.
 *
 * When displaying writers:
 * - Use `writers` array if available (joined with getAllCallReports() or similar)
 * - Fall back to `writer_name` for legacy data
 * - Use the utility function `getWriterDisplayName()` for consistent formatting
 *
 * @example
 * ```typescript
 * // Fetching with writers
 * const report = await supabase
 *   .from("call_reports")
 *   .select(`
 *     *,
 *     call_report_writers:call_report_writers (
 *       writer_id,
 *       writer_email,
 *       display_order,
 *       writer:writers(name)
 *     )
 *   `)
 *   .single();
 *
 * // Display writers
 * const displayName = getWriterDisplayName(report);
 * ```
 */
export interface CallReport {
  id: string;
  call_report_id: string; // CR-YYYY-NNNN
  story_id: string;
  meeting_date: string;
  duration_minutes?: number; // Meeting duration in minutes (default: 60)
  end_time?: string; // Computed end time (meeting_date + duration)

  /** @deprecated Use `writers` array instead. Kept for backward compatibility with old data. */
  writer_name: string;

  /**
   * Array of writers associated with this call report.
   * Populated when joining with call_report_writers table.
   * Use this for displaying multiple writers.
   */
  writers?: CallReportWriter[];

  /**
   * Convenience array of writer names (strings only).
   * Typically populated by server-side processing from writers array.
   * Example: ["John Doe", "Jane Smith"]
   */
  writer_names?: string[];

  /** Optional text field for suggesting writers */
  suggested_writer?: string;
  contact_type: "Direct" | "Agent" | "Production Company" | "Other";
  contact_email: string; // Deprecated: kept for backward compatibility
  contact_phone?: string; // Deprecated: kept for backward compatibility
  contact_address?: string;
  working_title: string;
  logline: string;
  logline_image_url?: string;
  genre: string[] | null; // Array of genre tags - supports multiple genres
  category: "external_producer" | "writer_pitch" | "inhouse_content" | "content_head_initiative" | "given_by_management"; // Source of idea
  content_type: "Serial" | "Long Serial" | "Telefilm" | "Mini-serial" | "Ramadan Serial" | "Series Sitcom" | "Soap"; // Type/format of the content
  target_slot?: string; // Target time slot for the content (e.g., "7:00 PM", "8:00 PM")

  // Content Head Initiative fields (privacy-controlled)
  idea_by?: string; // Private: visible only to creator and management
  developed_by?: string; // Private: visible only to creator and management
  management_member_name?: string; // For "Given by Management" category

  meeting_notes: string;
  meeting_attendees: string[];
  next_steps?: string;
  status: "draft" | "ready_for_evaluation" | "in_review";
  evaluation_status?: EvaluationStatus;
  overall_rating?: number; // Initial assessment score (1-10) from content manager
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

  // Team information
  team_id?: string; // Team that created this call report
  team?: Team; // Populated when joining with teams table
}

// Call Report Writer types (for multiple writers per call report)
export interface CallReportWriter {
  id: string;
  call_report_id: string;
  writer_id: string;
  writer_name: string; // From writers table (via JOIN)
  writer_email?: string;
  writer_phone?: string;
  display_order: number;
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

// Evaluation Type Segregation (for management vs evaluator vs programmer tracking)
export type EvaluationType = 'evaluator' | 'management' | 'programmer';

export interface EvaluationWithType {
  id: string;
  form_id: string;
  call_report_id: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluator_email: string;
  evaluator_role: UserRole;
  evaluation_type: EvaluationType;
  // Evaluation scores
  premise_conflict_score: number;
  storyline_plot_score: number;
  episodic_progression_score: number;
  characters_score: number;
  overall_assessment_score: number;
  average_score: number;
  decision: string;
  comments: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface EpisodicEvaluationWithType {
  id: string;
  episode_id: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluator_email: string;
  evaluator_role: UserRole;
  evaluation_type: EvaluationType;
  // Episode evaluation fields
  no_of_pages: number;
  no_of_scenes: number;
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  freezes_score: number;
  whats_next_element_score: number;
  overall_assessment_score: number;
  overall_average: number;
  overall_grade: EpisodicGrade;
  events: (string | EventItem)[];
  summary_analysis?: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface SegregatedEvaluations {
  evaluatorEvaluations: EvaluationWithType[];
  managementEvaluations: EvaluationWithType[];
  programmerEvaluations: EvaluationWithType[];
  total: number;
  evaluatorCount: number;
  managementCount: number;
  programmerCount: number;
}

export interface SegregatedEpisodicEvaluations {
  evaluatorEvaluations: EpisodicEvaluationWithType[];
  managementEvaluations: EpisodicEvaluationWithType[];
  programmerEvaluations: EpisodicEvaluationWithType[];
  total: number;
  evaluatorCount: number;
  managementCount: number;
  programmerCount: number;
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
  logline_image_url?: string;
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
  // Summary and Analysis
  summary_analysis?: string; // Free-form text field for evaluator's summary and analysis
  // Evaluation Scores (1-10)
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  freezes_score: number;
  whats_next_element_score: number;
  overall_assessment_score: number;
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
    summaryAnalysis?: string;
    conflictScore: number;
    characterizationScore: number;
    progressionScore: number;
    freezesScore: number;
    whatsNextScore: number;
    overallAssessmentScore: number;
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

// Detailed One-Liner types
export interface DetailedOneLiner {
  id: string;
  call_report_id: string;
  preamble: string;
  plot: string;
  emotional_arena: string;
  creed_conflict: string;
  new_element: string;
  emotional_core_resolution: string;
  production_optimization_notes?: string;
  net_outcome?: string;
  conclusion_recommendation?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NarrativeBreakdownItem {
  id: string;
  detailed_one_liner_id: string;
  story_stream: string;
  percentage: number;
  narrative_purpose: string;
  sort_order: number;
  created_at: string;
}

export interface EventPlanningItem {
  id: string;
  detailed_one_liner_id: string;
  episode_range: string;
  event_scale: string;
  on_screen_activity: string;
  approx_frequency: string;
  budget_category: 'High' | 'Medium' | 'Low';
  sort_order: number;
  created_at: string;
}

export interface PotentialWeaknessRiskItem {
  id: string;
  detailed_one_liner_id: string;
  issue: string;
  explanation_risk_detail: string;
  impact: string;
  sort_order: number;
  created_at: string;
}

export interface CharacterRelationship {
  id: string;
  detailed_one_liner_id: string;
  character_a_name: string;
  character_a_role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  character_b_name: string;
  character_b_role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  relationship_type: 'family' | 'romantic' | 'professional' | 'friendship' | 'rivalry' | 'mentor_mentee' | 'alliance' | 'conflict' | 'other';
  relationship_description: string;
  initial_state?: string;
  final_state?: string;
  key_turning_points?: string;
  emotional_weight?: 'high' | 'medium' | 'low';
  drives_plot: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DetailedOneLinerWithDetails extends DetailedOneLiner {
  call_report?: {
    call_report_id: string;
    working_title: string;
    writer_name: string;
  };
  narrative_breakdown_items?: NarrativeBreakdownItem[];
  event_planning_items?: EventPlanningItem[];
  potential_weaknesses_risks_items?: PotentialWeaknessRiskItem[];
  character_relationships?: CharacterRelationship[];
  created_by_user?: {
    name: string;
    email: string;
  };
}

// Content Delivery types
export interface ContentDeliveryItem {
  id: string;
  negotiation_id: string;
  story_id: string;
  project_name: string;
  writer_name: string;
  genre: string | null;
  contract_type: string;
  time_slot: string | null;
  total_episodes: number;
  episodes_received: number;
  episodes_due: number;
  completion_percentage: number;
  project_start_date: string | null;
  expected_completion_date: string | null;
  status: string;
  days_active: number;
  agreed_price: number | null;
  currency: string | null;
  created_at: string;
}

export interface ContentDeliveryStats {
  total_projects: number;
  total_episodes_expected: number;
  total_episodes_received: number;
  average_completion: number;
  total_agreed_value: number;
  average_agreed_price: number;
}

// Pipeline Stage types
export type StageStatus = 'completed' | 'in_progress' | 'pending';

export interface PipelineDocument {
  type: 'contract' | 'report' | 'script' | 'other';
  name: string;
  url: string;
  uploaded_date: string;
}

export interface PipelineNote {
  date: string;
  author: string;
  text: string;
}

export interface PipelineStory {
  id: string;
  story_id: string;
  title: string;
  writer_name: string;
  genre: string | null;
  current_stage: 1 | 2 | 3;
  days_in_current_stage: number;

  // Status & Dates for Stage 1: Idea Approved
  stage1_status: StageStatus;
  stage1_start_date: string | null;
  stage1_completion_date: string | null;

  // Status & Dates for Stage 2: Writer's Engagement
  stage2_status: StageStatus;
  stage2_start_date: string | null;
  stage2_completion_date: string | null;

  // Status & Dates for Stage 3: Delivery Plan & Contract
  stage3_status: StageStatus;
  stage3_start_date: string | null;
  stage3_completion_date: string | null;

  // Assigned People
  stage1_assigned: string | null;
  stage1_assigned_email: string | null;
  stage1_assigned_department: string | null;

  stage2_assigned: string | null;
  stage2_assigned_email: string | null;
  stage2_assigned_department: string | null;

  stage3_assigned: string | null;
  stage3_assigned_email: string | null;
  stage3_assigned_department: string | null;

  // Documents & Attachments
  documents: PipelineDocument[];

  // Progress Notes
  notes: PipelineNote[];
}

// Production Metrics Types
// Used for dashboard production lifecycle metrics across Programmer, Evaluator, and Management dashboards

/**
 * Production metrics data structure
 * Contains 7 key metrics for tracking production lifecycle
 */
export interface ProductionMetrics {
  uniqueWritersCount: number;
  uniqueWriters: Array<{ // Detailed list of unique writers with their projects
    id: string;
    name: string;
    working_title: string;
    team?: Team; // Team information for the project
  }>;
  storiesInDiscussion: number;
  storiesInDiscussionDetails?: Array<{ // Detailed list of stories in discussion
    id: string;
    working_title: string;
    writer_name: string;
    target_slot: string;
    created_at: string;
    team?: Team; // Team information for the project
  }>;
  scriptsInWriting: {
    total: number;
    bySlot: Record<string, number>; // e.g., {"7 pm": 3, "8 pm": 5, "Unassigned": 2}
    details?: Array<{ // Detailed list of scripts in writing
      id: string;
      working_title: string;
      writer_name: string;
      target_slot: string;
      status: string;
      team?: Team; // Team information for the project
    }>;
  };
  scriptsCompleted: {
    total: number;
    bySlot: Record<string, number>;
    details?: Array<{ // Detailed list of completed scripts
      id: string;
      working_title: string;
      writer_name: string;
      target_slot: string;
      status: string;
      team?: Team; // Team information for the project
    }>;
  };
  projectsOnShoot: number;
  projectsOnShootDetails?: Array<{ // Detailed list of projects currently on shoot
    id: string;
    working_title: string;
    writer_name: string;
    target_slot: string;
    status: string;
    team?: Team; // Team information for the project
  }>;
  projectsOnAir: number;
  projectsOnAirDetails?: Array<{ // Detailed list of projects currently on air
    id: string;
    working_title: string;
    on_air_title: string;
    target_slot: string;
    status: string;
    team?: Team; // Team information for the project
  }>;
  projectsAired: {
    total: number;
    projects: Array<{
      working_title: string;
      on_air_title: string;
      aired_date: string;
      slot: string;
      team?: Team; // Team information for the project
    }>;
  };
}

/**
 * Aired project details for historical tracking
 */
export interface AiredProject {
  working_title: string;
  on_air_title: string;
  aired_date: string;
  slot: string;
}
