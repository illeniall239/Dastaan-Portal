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
  | "gcm"
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
export type TeamType = "content" | "evaluator" | "programmer" | "gcm" | "management" | "other";

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
  | "religious"
  | "spiritual-drama"
  | "women-centric-drama"
  | "class-conflict-drama"
  | "feudal"
  | "rural-drama"
  | "siblings-rivalry"
  | "inheritance-drama"
  | "tragedy"
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
  updated_by?: string;
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
/**
 * Represents a calendar meeting (stored in `meetings` table).
 * Meetings are simple calendar events — no story pipeline involvement.
 */
export interface Meeting {
  id: string;
  meeting_id: string; // MTG-YYYY-NNNN
  title: string;
  meeting_date: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  agenda: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_type: string | null;
  attendees: string[];
  category: string | null;
  status: string;
  team_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  // Populated via join
  organizer_name?: string;
}

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
  evaluation_round?: number;
  overall_rating?: number; // @deprecated Use initial_assessments table instead
  average_initial_assessment?: number | null; // Denormalized avg from initial_assessments table
  assessment_count?: number; // Denormalized count from initial_assessments table
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
  updated_by?: string;

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
  evaluation_round?: number;
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
  // Evaluation scores (new criteria)
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  whats_next_element_score: number;
  overall_oneliner_grade_score: number;
  // Per-criterion comments
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
  main_event_score: number;
  small_event_score: number;
  dragness_score: number;
  freezes_score: number;
  whats_next_element_score: number;
  overall_assessment_score: number;
  overall_average: number;
  overall_grade: EpisodicGrade;
  events?: (string | EventItem)[];
  freeze_ending_scene?: string;
  summary_analysis?: string;
  remarks?: string;
  // Per-criterion comments
  conflict_of_content_comment?: string;
  characterization_comment?: string;
  story_progression_comment?: string;
  main_event_comment?: string;
  small_event_comment?: string;
  dragness_comment?: string;
  freezes_comment?: string;
  whats_next_element_comment?: string;
  overall_assessment_comment?: string;
  // Qualitative remarks
  scenes_remarks?: string;
  characterization_remarks?: string;
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
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  whats_next_element_score: number;
  overall_oneliner_grade_score: number;
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
  updated_by?: string;
  // Versioning
  version: number;
  is_current: boolean;
  approval_status?: 'approved' | 'rejected' | 'needs_revision' | null;
  approved_by?: string | null;
  approved_at?: string | null;
  supersedes_id?: string | null;
  // Initial assessment
  initial_assessment?: number | null; // @deprecated Use initial_assessments table instead
  average_initial_assessment?: number | null; // Denormalized avg from initial_assessments table
  assessment_count?: number; // Denormalized count from initial_assessments table
  evaluation_round?: number;
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
  revision_count?: number;
  latest_revision?: {
    attachment_url: string | null;
    attachment_name: string | null;
    attachment_type: string | null;
    revision_number: number;
    initial_assessment?: number | null;
    assessed_by_name?: string | null;
  } | null;
}

// Story Approval types
export type ApproverType = 'management' | 'evaluator' | 'programmer';
export type ApprovalDecision = 'approved' | 'rejected';

export interface StoryApproval {
  id: string;
  call_report_id: string;
  user_id: string;
  decision: ApprovalDecision;
  notes?: string | null;
  approver_type: ApproverType;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface ApprovalHistoryRound {
  revisionId: string | null;
  revisionNumber: number | null;
  approvals: StoryApproval[];
}

export interface StoryApprovalStatus {
  approvals: StoryApproval[];
  totalApprovals: number;
  totalRejections: number;
  managementApproved: boolean; // both mandatory approvers approved
  managementRejected: boolean; // any mandatory approver rejected
  thirdApproved: boolean; // at least 1 non-management approval
  isFullyApproved: boolean; // all conditions met
  isRejected: boolean;
  canCurrentUserApprove: boolean;
  currentUserApproval?: StoryApproval | null;
  isCurrentUserMandatoryApprover: boolean; // true for Humera/Salman only
  currentUserName?: string | null;
  currentRevisionId?: string | null;
  approvalHistory?: ApprovalHistoryRound[];
}

// Evaluation detail for a specific revision
export interface RevisionEvaluation {
  id: string;
  evaluator_name: string;
  evaluator_email: string;
  average_score: number | null;
  conflict_of_content_score: number | null;
  conflict_of_content_comment: string | null;
  characterization_score: number | null;
  characterization_comment: string | null;
  story_progression_score: number | null;
  story_progression_comment: string | null;
  whats_next_element_score: number | null;
  whats_next_element_comment: string | null;
  overall_oneliner_grade_score: number | null;
  overall_oneliner_grade_comment: string | null;
  decision: string | null;
  decision_notes: string | null;
  comments: string | null;
  big_idea: string | null;
  theme: string | null;
  submitted_at: string | null;
}

// Episode Revision types
export interface EpisodeRevision {
  id: string;
  episode_id: string;
  revision_number: number;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  comment?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  initial_assessment?: number | null;
  assessed_by?: string | null;
  assessed_at?: string | null;
  evaluation_count?: number;
  average_evaluation_score?: number | null;
  evaluations?: RevisionEvaluation[];
  uploaded_by_user?: {
    name: string;
    email: string;
  };
}

// Initial Assessment types (per-user scoring for call reports and episodes)
export interface InitialAssessment {
  id: string;
  entity_type: 'call_report' | 'episode';
  entity_id: string;
  assessor_id: string;
  score: number; // 1-10
  comment?: string | null;
  created_at: string;
  updated_at: string;
  assessor?: {
    name: string;
    email: string;
    role?: string;
  };
}

// Call Report Revision types
export interface CallReportRevision {
  id: string;
  call_report_id: string;
  revision_number: number;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  comment?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  initial_assessment?: number | null;
  assessed_by?: string | null;
  assessed_at?: string | null;
  evaluation_count?: number;
  average_evaluation_score?: number | null;
  evaluations?: RevisionEvaluation[];
  uploaded_by_user?: {
    name: string;
    email: string;
  };
}

export interface CallReportDiscussion {
  id: string;
  call_report_id: string;
  user_id: string;
  message: string;
  revision_id?: string | null;
  is_system_message?: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export interface EpisodeDiscussion {
  id: string;
  episode_id: string;
  user_id: string;
  message: string;
  revision_id?: string | null;
  is_system_message?: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
    role: string;
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
  pages_score: number;
  scenes_score: number;
  events?: (string | EventItem)[];
  freeze_ending_scene?: string;
  // Summary and Analysis
  summary_analysis?: string;
  // Evaluation Scores (1-10) - 9 criteria
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  main_event_score: number;
  small_event_score: number;
  dragness_score: number;
  freezes_score: number;
  whats_next_element_score: number;
  overall_assessment_score: number;
  // Per-criterion comments
  conflict_of_content_comment?: string;
  characterization_comment?: string;
  story_progression_comment?: string;
  main_event_comment?: string;
  small_event_comment?: string;
  dragness_comment?: string;
  freezes_comment?: string;
  whats_next_element_comment?: string;
  overall_assessment_comment?: string;
  // Qualitative remarks
  scenes_remarks?: string;
  characterization_remarks?: string;
  // Calculated
  overall_average: number;
  overall_grade: EpisodicGrade;
  // Metadata
  remarks?: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  evaluation_round?: number;
  revision_id?: string | null;
  decision?: "approve" | "reject" | "needs_revision" | null;
  decision_notes?: string | null;
  evaluator?: { name: string; email?: string; role?: string } | null;
}

export interface EpisodicEvaluationDraft {
  id: string;
  episode_id: string;
  evaluator_id: string;
  draft_data: {
    noOfPages: number;
    noOfScenes: number;
    freezeEndingScene?: string;
    summaryAnalysis?: string;
    remarks?: string;
    scenesRemarks?: string;
    characterizationRemarks?: string;
    conflictScore: number;
    characterizationScore: number;
    progressionScore: number;
    mainEventScore: number;
    smallEventScore: number;
    dragnessScore: number;
    freezesScore: number;
    whatsNextScore: number;
    overallAssessmentScore: number;
    conflictComment?: string;
    characterizationComment?: string;
    progressionComment?: string;
    mainEventComment?: string;
    smallEventComment?: string;
    dragnessComment?: string;
    freezesComment?: string;
    whatsNextComment?: string;
    overallAssessmentComment?: string;
    accumulatedTimeMinutes?: number;
    // Legacy fields (backward compat)
    events?: any[];
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
  updated_by?: string;
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
  uniqueWriters: Array<{ // Detailed list of writer engagements (last 30 days)
    id: string;           // engagement id
    writer_name: string;
    date_engaged: string;
    time_slot?: string;
    notes?: string;
    created_by_name?: string;
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

// Feedback Timeline Types
// Used for monitoring evaluation feedback timelines across teams in the Programmer's Portal

/**
 * Represents a single item in the feedback timeline
 * Joins data from evaluator_forms, call_reports, users, and teams
 */
export interface FeedbackTimelineItem {
  id: string;
  formId: string;
  callReportId: string;
  projectTitle: string;
  teamName: string | null;
  teamType: TeamType | null;

  // Timeline timestamps
  callReportCreatedAt: string | null;  // When the call report/idea was logged
  submittedAt: string | null;          // When evaluation was submitted
  daysToReview: number | null;         // Days between call report creation and evaluation submission

  // Delay tracking
  isLate: boolean;
  delayReason: string | null;

  // Evaluation details
  evaluatorName: string | null;
  evaluatorRole: UserRole | null;
  decision: 'approve' | 'reject' | 'needs_improvement' | null;
  averageScore: number | null;

  // Cross-team sharing
  isCrossTeam: boolean;
  crossTeamShareId?: string | null;
}

/**
 * Aggregated statistics for the feedback timeline
 * Used in stats cards on the Feedback Timeline page
 */
export interface FeedbackTimelineStats {
  totalEvaluations: number;
  pendingReview: number;
  reviewed: number;
  lateCount: number;
  averageReviewDays: number;
  onTimePercentage: number;
}

// ============================================================================
// Visual Idea Roadmap Types
// Used for tracking ideas through the complete workflow journey
// ============================================================================

/**
 * The 8 stages an idea/call report goes through
 */
export type RoadmapStage =
  | 'submission'
  | 'evaluation'
  | 'approval'
  | 'contract_terms'
  | 'legal_review'
  | 'contract'
  | 'payment'
  | 'completed';

/**
 * Status of a stage in the roadmap
 */
export type RoadmapStageStatus = 'completed' | 'in_progress' | 'pending' | 'skipped';

/**
 * Actor who performed an action in a stage
 */
export interface RoadmapActor {
  id: string;
  name: string;
  role: UserRole;
}

/**
 * Single stage in the roadmap with all relevant data
 */
export interface RoadmapStageData {
  stage: RoadmapStage;
  stageNumber: number;
  title: string;
  status: RoadmapStageStatus;
  startedAt: string | null;
  completedAt: string | null;
  daysInStage: number | null;
  actor: RoadmapActor | null;
  actors?: RoadmapActor[]; // For evaluations (multiple evaluators)
  outcome: string | null;
  outcomeDetails?: Record<string, any>;
}

/**
 * Complete roadmap data for a call report/idea
 * Used in the detail view modal
 */
export interface RoadmapData {
  id: string;
  callReportId: string;
  workingTitle: string;
  teamName: string | null;
  teamType: TeamType | null;
  writers: string[];
  loggedAt: string;
  loggedBy: RoadmapActor;
  lastActivityAt: string | null;
  currentStage: RoadmapStage;
  currentStageNumber: number;
  overallProgress: number; // 0-100
  stages: RoadmapStageData[];
  totalDays: number;
  daysInCurrentStage: number;
}

/**
 * List item for the roadmap list page
 * Lightweight version of RoadmapData for list display
 */
export interface RoadmapListItem {
  id: string;
  callReportId: string;
  workingTitle: string;
  teamName: string | null;
  teamType: TeamType | null;
  currentStage: RoadmapStage;
  currentStageNumber: number;
  overallProgress: number;
  loggedAt: string;
  lastActivityAt: string | null;
  totalDays: number;
}

/**
 * Stats for roadmap dashboard
 */
export interface RoadmapStats {
  totalIdeas: number;
  byStage: Record<RoadmapStage, number>;
  avgDaysToApproval: number;
  stuckIdeas: number; // In same stage > 14 days
}

// ============================================================================
// Cross-Team Sharing Types
// Used for sharing call reports between teams for evaluation
// ============================================================================

export type CrossTeamShareStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface CrossTeamShare {
  id: string;
  call_report_id: string;
  call_report?: CallReport;
  from_team_id: string;
  from_team?: Team;
  to_team_id: string;
  to_team?: Team;
  shared_by: string;
  shared_by_user?: User;
  status: CrossTeamShareStatus;
  shared_at: string;
  first_evaluation_at: string | null;
  completed_at: string | null;
  notes: string | null;
  evaluation_deadline: string | null;
  required_evaluations: number;
  completed_evaluations: number;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}
