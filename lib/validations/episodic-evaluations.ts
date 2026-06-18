import { z } from "zod";

const scoreField = z
  .number()
  .min(1, "Score must be at least 1")
  .max(10, "Score must be at most 10");

const optionalScoreField = scoreField.optional();

/**
 * Validation schema for creating episodic evaluation
 */
export const episodicEvaluationSchema = z.object({
  episode_id: z.string().uuid("Invalid episode ID"),
  revision_id: z.string().uuid().optional().nullable(),
  cross_team_share_id: z.string().uuid().optional().nullable(),
  is_feedback_only: z.boolean().optional().default(false),

  // Episode Details
  no_of_pages: z
    .number()
    .int("Number of pages must be an integer")
    .positive("Number of pages must be positive")
    .min(1, "At least 1 page is required"),

  no_of_scenes: z
    .number()
    .int("Number of scenes must be an integer")
    .positive("Number of scenes must be positive")
    .min(1, "At least 1 scene is required"),

  // Events (optional - kept for backward compat but no longer required)
  events: z
    .array(
      z.union([
        z.string(),
        z.object({
          title: z.string().min(1, "Event title is required").max(100, "Event title must not exceed 100 characters"),
          description: z.string().max(500, "Event description must not exceed 500 characters").default(''),
          impact: z.enum(["High Impact", "Medium Impact", "Low Impact"]).optional()
        })
      ])
    )
    .optional(),

  // FREEZE (Ending Scene) - text description
  freeze_ending_scene: z.string().optional(),

  // Summary and Analysis (optional free-form text)
  summary_analysis: z.string().optional(),

  // Remarks (optional free-form text)
  remarks: z.string().optional(),

  // Evaluation Scores (1-10 scale) - 9 criteria
  conflict_of_content_score: scoreField,
  characterization_score: scoreField,
  story_progression_score: scoreField,
  main_event_score: scoreField,
  small_event_score: scoreField,
  dragness_score: scoreField,
  freezes_score: scoreField,
  whats_next_element_score: scoreField,
  overall_assessment_score: scoreField,

  // Per-criterion comments
  conflict_of_content_comment: z.string().optional(),
  characterization_comment: z.string().optional(),
  story_progression_comment: z.string().optional(),
  main_event_comment: z.string().optional(),
  small_event_comment: z.string().optional(),
  dragness_comment: z.string().optional(),
  freezes_comment: z.string().optional(),
  whats_next_element_comment: z.string().optional(),
  overall_assessment_comment: z.string().optional(),

  // Episode Evaluation qualitative remarks
  scenes_remarks: z.string().optional(),
  characterization_remarks: z.string().optional(),

  // Time tracking (optional)
  time_spent_minutes: z.number().min(0).optional(),
  started_at: z.string().datetime().optional(),

  // Final decision
  decision: z.enum(["approve", "reject", "needs_revision"], {
    required_error: "Please select a decision",
  }),
  decision_notes: z.string().optional(),
  feedback_text: z.string().optional().nullable(),
  feedback_attachment_url: z.string().optional().nullable(),
  feedback_attachment_name: z.string().max(255).optional().nullable(),
  feedback_attachments: z.array(z.object({
    url: z.string(),
    name: z.string(),
  })).optional().default([]),
});

export type EpisodicEvaluationFormData = z.infer<typeof episodicEvaluationSchema>;

/**
 * Validation schema for updating episodic evaluation
 * All fields are optional to support partial updates
 */
export const updateEpisodicEvaluationSchema = z.object({
  is_feedback_only: z.boolean().optional(),

  // Episode Details (optional for updates)
  no_of_pages: z
    .number()
    .int("Number of pages must be an integer")
    .positive("Number of pages must be positive")
    .min(1, "At least 1 page is required")
    .optional(),

  no_of_scenes: z
    .number()
    .int("Number of scenes must be an integer")
    .positive("Number of scenes must be positive")
    .min(1, "At least 1 scene is required")
    .optional(),

  // Events (optional for updates)
  events: z
    .array(
      z.union([
        z.string(),
        z.object({
          title: z.string().min(1, "Event title is required").max(100, "Event title must not exceed 100 characters"),
          description: z.string().max(500, "Event description must not exceed 500 characters").default(''),
          impact: z.enum(["High Impact", "Medium Impact", "Low Impact"]).optional()
        })
      ])
    )
    .optional(),

  // FREEZE (Ending Scene)
  freeze_ending_scene: z.string().optional(),

  // Summary and Analysis
  summary_analysis: z.string().optional(),

  // Remarks
  remarks: z.string().optional(),

  // Evaluation Scores (1-10 scale, all optional for updates)
  conflict_of_content_score: optionalScoreField,
  characterization_score: optionalScoreField,
  story_progression_score: optionalScoreField,
  main_event_score: optionalScoreField,
  small_event_score: optionalScoreField,
  dragness_score: optionalScoreField,
  freezes_score: optionalScoreField,
  whats_next_element_score: optionalScoreField,
  overall_assessment_score: optionalScoreField,

  // Per-criterion comments
  conflict_of_content_comment: z.string().optional(),
  characterization_comment: z.string().optional(),
  story_progression_comment: z.string().optional(),
  main_event_comment: z.string().optional(),
  small_event_comment: z.string().optional(),
  dragness_comment: z.string().optional(),
  freezes_comment: z.string().optional(),
  whats_next_element_comment: z.string().optional(),
  overall_assessment_comment: z.string().optional(),

  // Episode Evaluation qualitative remarks
  scenes_remarks: z.string().optional(),
  characterization_remarks: z.string().optional(),

  // Rating description (computed field, can be updated manually)
  rating_description: z.string().max(200).optional(),

  // Final decision
  decision: z.enum(["approve", "reject", "needs_revision"]).optional(),
  decision_notes: z.string().optional(),

  // Feedback communication
  feedback_text: z.string().optional().nullable(),
  feedback_attachment_url: z.string().optional().nullable(),
  feedback_attachment_name: z.string().max(255).optional().nullable(),
  feedback_attachments: z.array(z.object({
    url: z.string(),
    name: z.string(),
  })).optional().nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided for update",
  }
);

export type UpdateEpisodicEvaluationData = z.infer<typeof updateEpisodicEvaluationSchema>;

/**
 * Calculate pages score relative to standard
 * @param pages - Number of pages in episode
 * @returns Difference from standard (45 pages = 0, 46 = +1, 44 = -1, etc.)
 */
export function calculatePagesScore(pages: number): number {
  return pages - 45;
}

/**
 * Calculate scenes score relative to standard
 * @param scenes - Number of scenes in episode
 * @returns Difference from standard (22 scenes = 0, 23 = +1, 21 = -1, etc.)
 */
export function calculateScenesScore(scenes: number): number {
  return scenes - 22;
}

/**
 * Calculate rating description based on score (old 4-tier, kept for backward compat)
 * @param score - Average score (0-10)
 * @returns Rating description
 */
export function calculateGrade(score: number): string {
  if (score >= 9) return "High rating potential";
  if (score >= 7) return "Rating potential audience appeal";
  if (score >= 5) return "Need improvement - Required editing or continuous supervision";
  return "Either unacceptable or need major re-writing and editing";
}

/**
 * Calculate overall average from all 9 scores
 * @param scores - Object containing all 9 evaluation scores
 * @returns Average score (0-10) with 2 decimal places
 */
export function calculateOverallAverage(scores: {
  conflict: number;
  characterization: number;
  progression: number;
  mainEvent: number;
  smallEvent: number;
  dragness: number;
  freezes: number;
  whatsNext: number;
  overallAssessment: number;
}): number {
  // Dragness is a reverse metric: higher score = more drag = worse episode.
  // Invert its contribution so high dragness reduces the overall average.
  const sum =
    scores.conflict +
    scores.characterization +
    scores.progression +
    scores.mainEvent +
    scores.smallEvent +
    (11 - scores.dragness) +
    scores.freezes +
    scores.whatsNext +
    scores.overallAssessment;
  return Number((sum / 9).toFixed(2));
}

/**
 * Get color classes for rating description (old 4-tier, kept for backward compat)
 * @param rating - Rating description
 * @returns Tailwind CSS classes for styling
 */
export function getGradeColorClasses(rating: string): string {
  if (rating === "High rating potential") {
    return "text-green-700 font-semibold";
  } else if (rating === "Rating potential audience appeal") {
    return "text-blue-700 font-semibold";
  } else if (rating.includes("Need improvement")) {
    return "text-amber-700 font-semibold";
  } else {
    return "text-red-700 font-semibold";
  }
}

/**
 * Get color classes for pages/scenes score badge
 * @param score - Score (positive, zero, or negative)
 * @returns Tailwind CSS classes for badge styling
 */
export function getScoreColorClasses(score: number): string {
  if (score > 0) {
    return "bg-green-100 text-green-800 border-green-300";
  } else if (score === 0) {
    return "bg-blue-100 text-blue-800 border-blue-300";
  } else {
    return "bg-red-100 text-red-800 border-red-300";
  }
}
