/**
 * Validation schemas for evaluations (evaluator forms)
 */

import { z } from "zod";

const scoreField = z.number().min(1).max(10);
const optionalScoreField = scoreField.optional();

/**
 * Schema for creating/updating an evaluation
 */
export const createEvaluationSchema = z.object({
  call_report_id: z.string().uuid({ message: "Invalid call report ID" }),
  evaluator_id: z.string().uuid({ message: "Invalid evaluator ID" }),
  revision_id: z.string().uuid().optional().nullable(),

  // New evaluation scores (1-10 scale)
  conflict_of_content_score: scoreField,
  characterization_score: scoreField,
  story_progression_score: scoreField,
  whats_next_element_score: scoreField,
  overall_oneliner_grade_score: scoreField,

  // Per-criterion comments
  conflict_of_content_comment: z.string().optional(),
  characterization_comment: z.string().optional(),
  story_progression_comment: z.string().optional(),
  whats_next_element_comment: z.string().optional(),
  overall_oneliner_grade_comment: z.string().optional(),

  // Descriptive evaluation
  themes_of_drama: z.array(z.string()).optional(),
  corresponding_dramas: z.array(z.string()).optional(),
  theme_category: z.enum(["commercial", "non_commercial", "commercial_edge"]).optional(),
  audience_focus: z.enum(["male_centric", "female_centric", "both"]).optional(),
  no_of_tracks: z.number().int().min(0).optional(),
  closing_remarks: z.string().optional(),

  // Additional project info
  target_writer: z.string().optional(),
  per_ep_price_range: z.string().optional(),
  genre: z.array(z.string()).optional(),
  slot: z.string().optional(),
  big_idea: z.string().optional(),
  theme: z.string().optional(),
  first_2_eps_required: z.boolean().optional(),

  // Decision
  decision: z.enum(["approve", "reject", "needs_improvement"]),
  decision_notes: z.string().optional(),
});

/**
 * Schema for updating evaluation draft
 */
export const updateEvaluationDraftSchema = z.object({
  draft_data: z.record(z.any()),
});

/**
 * Schema for submitting evaluation
 */
export const submitEvaluationSchema = createEvaluationSchema.extend({
  submitted_at: z.string().datetime().optional(),
});

/**
 * Schema for updating an existing evaluation (PATCH)
 * All fields are optional since it's a partial update
 */
export const updateEvaluationSchema = z.object({
  // New evaluation scores (1-10 scale) - all optional for partial updates
  conflict_of_content_score: optionalScoreField,
  characterization_score: optionalScoreField,
  story_progression_score: optionalScoreField,
  whats_next_element_score: optionalScoreField,
  overall_oneliner_grade_score: optionalScoreField,

  // Per-criterion comments
  conflict_of_content_comment: z.string().optional(),
  characterization_comment: z.string().optional(),
  story_progression_comment: z.string().optional(),
  whats_next_element_comment: z.string().optional(),
  overall_oneliner_grade_comment: z.string().optional(),

  // Descriptive evaluation
  themes_of_drama: z.array(z.string()).optional(),
  corresponding_dramas: z.array(z.string()).optional(),
  theme_category: z.enum(["commercial", "non_commercial", "commercial_edge"]).nullable().optional(),
  audience_focus: z.enum(["male_centric", "female_centric", "both"]).nullable().optional(),
  no_of_tracks: z.number().int().min(0).nullable().optional(),
  closing_remarks: z.string().optional(),

  // Additional project info
  target_writer: z.string().optional(),
  per_ep_price_range: z.string().optional(),
  genre: z.array(z.string()).optional(),
  slot: z.string().optional(),
  big_idea: z.string().optional(),
  theme: z.string().optional(),
  first_2_eps_required: z.boolean().optional(),

  // Decision fields
  decision: z.enum(["approve", "reject", "needs_improvement"]).optional(),
  decision_notes: z.string().optional(),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
export type UpdateEvaluationDraftInput = z.infer<typeof updateEvaluationDraftSchema>;
export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;
export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>;

/**
 * New 6-tier grade calculation for one-liner evaluations
 */
export function calculateOneLinerGrade(score: number): string {
  if (score >= 10) return "Outstanding - perfect flow, strong events, emotional impact";
  if (score >= 8) return "Excellent - engaging and well-structured, minor issues only";
  if (score >= 7) return "Good - holds attention but needs some improvement";
  if (score >= 5) return "Average - lacks impact or has pacing/logic issues";
  if (score >= 3) return "Weak - poor structure, flat events, inconsistent characters";
  return "Very Poor - confusing, dull, or disconnected from story";
}

/**
 * Color classes for the new 6-tier one-liner grade scale
 */
export function getOneLinerGradeColorClasses(grade: string): string {
  if (grade.startsWith("Outstanding")) return "text-green-700 font-semibold";
  if (grade.startsWith("Excellent")) return "text-emerald-700 font-semibold";
  if (grade.startsWith("Good")) return "text-blue-700 font-semibold";
  if (grade.startsWith("Average")) return "text-amber-700 font-semibold";
  if (grade.startsWith("Weak")) return "text-orange-700 font-semibold";
  return "text-red-700 font-semibold";
}

/**
 * Rating scale items for the one-liner evaluation reference card
 */
export const oneLinerRatingScaleItems = [
  { range: "10", description: "Outstanding - perfect flow, strong events, emotional impact", color: "text-green-700" },
  { range: "8 - 9", description: "Excellent - engaging and well-structured, minor issues only", color: "text-emerald-700" },
  { range: "7", description: "Good - holds attention but needs some improvement", color: "text-blue-700" },
  { range: "5 - 6", description: "Average - lacks impact or has pacing/logic issues", color: "text-amber-700" },
  { range: "3 - 4", description: "Weak - poor structure, flat events, inconsistent characters", color: "text-orange-700" },
  { range: "1 - 2", description: "Very Poor - confusing, dull, or disconnected from story", color: "text-red-700" },
];
