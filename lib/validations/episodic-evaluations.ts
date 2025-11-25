import { z } from "zod";

/**
 * Validation schema for creating episodic evaluation
 */
export const episodicEvaluationSchema = z.object({
  episode_id: z.string().uuid("Invalid episode ID"),

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

  // Events (required - at least 1 event must be added)
  events: z
    .array(
      z.union([
        z.string(), // Support old string format for backward compatibility
        z.object({
          title: z.string().min(1, "Event title is required").max(100, "Event title must not exceed 100 characters"),
          description: z.string().max(500, "Event description must not exceed 500 characters").default(''),
          impact: z.enum(["High Impact", "Medium Impact", "Low Impact"]).optional()
        })
      ])
    )
    .min(1, "At least one event is required")
    .max(20, "Cannot add more than 20 events"),

  // Summary and Analysis (optional free-form text)
  summary_analysis: z.string().optional(),

  // Evaluation Scores (1-10 scale)
  conflict_of_content_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10"),

  characterization_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10"),

  story_progression_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10"),

  freezes_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10"),

  whats_next_element_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10"),

  overall_assessment_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10"),
});

export type EpisodicEvaluationFormData = z.infer<typeof episodicEvaluationSchema>;

/**
 * Validation schema for updating episodic evaluation
 * All fields are optional to support partial updates
 * Replaces the manual whitelist in app/api/episodic-evaluations/[id]/route.ts
 */
export const updateEpisodicEvaluationSchema = z.object({
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
        z.string(), // Support old string format for backward compatibility
        z.object({
          title: z.string().min(1, "Event title is required").max(100, "Event title must not exceed 100 characters"),
          description: z.string().max(500, "Event description must not exceed 500 characters").default(''),
          impact: z.enum(["High Impact", "Medium Impact", "Low Impact"]).optional()
        })
      ])
    )
    .min(1, "At least one event is required")
    .max(20, "Cannot add more than 20 events")
    .optional(),

  // Summary and Analysis (optional free-form text)
  summary_analysis: z.string().optional(),

  // Evaluation Scores (1-10 scale, all optional for updates)
  conflict_of_content_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10")
    .optional(),

  characterization_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10")
    .optional(),

  story_progression_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10")
    .optional(),

  freezes_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10")
    .optional(),

  whats_next_element_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10")
    .optional(),

  overall_assessment_score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(10, "Score must be at most 10")
    .optional(),

  // Rating description (computed field, can be updated manually)
  rating_description: z.string().max(200).optional(),
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
 * Calculate rating description based on score
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
 * Calculate overall average from all 6 scores
 * @param scores - Object containing all 6 evaluation scores
 * @returns Average score (0-10) with 2 decimal places
 */
export function calculateOverallAverage(scores: {
  conflict: number;
  characterization: number;
  progression: number;
  freezes: number;
  whatsNext: number;
  overallAssessment: number;
}): number {
  const sum =
    scores.conflict +
    scores.characterization +
    scores.progression +
    scores.freezes +
    scores.whatsNext +
    scores.overallAssessment;
  return Number((sum / 6).toFixed(2));
}

/**
 * Get color classes for rating description
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
