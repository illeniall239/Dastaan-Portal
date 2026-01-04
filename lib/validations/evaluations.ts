/**
 * Validation schemas for evaluations (evaluator forms)
 */

import { z } from "zod";

/**
 * Schema for creating/updating an evaluation
 */
export const createEvaluationSchema = z.object({
  call_report_id: z.string().uuid({ message: "Invalid call report ID" }),
  evaluator_id: z.string().uuid({ message: "Invalid evaluator ID" }),

  // Evaluation scores (1-10 scale)
  premise_conflict_score: z.number().min(1).max(10),
  storyline_plot_score: z.number().min(1).max(10),
  episodic_progression_score: z.number().min(1).max(10),
  characters_score: z.number().min(1).max(10),

  // Optional fields
  target_writer: z.string().optional(),
  per_ep_price_range: z.string().optional(),
  genre: z.array(z.string()).optional(),
  slot: z.string().optional(),
  big_idea: z.string().optional(),
  theme: z.string().optional(),
  comments: z.string().optional(),
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
  // Evaluation scores (1-10 scale) - all optional for partial updates
  premise_conflict_score: z.number().min(1).max(10).optional(),
  storyline_plot_score: z.number().min(1).max(10).optional(),
  episodic_progression_score: z.number().min(1).max(10).optional(),
  characters_score: z.number().min(1).max(10).optional(),
  overall_assessment_score: z.number().min(1).max(10).optional(),

  // Optional text fields
  target_writer: z.string().optional(),
  per_ep_price_range: z.string().optional(),
  genre: z.array(z.string()).optional(),
  slot: z.string().optional(),
  big_idea: z.string().optional(),
  theme: z.string().optional(),
  comments: z.string().optional(),

  // Boolean fields
  first_2_eps_required: z.boolean().optional(),

  // Decision fields
  decision: z.enum(["approve", "reject", "needs_improvement"]).optional(),
  decision_notes: z.string().optional(),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
export type UpdateEvaluationDraftInput = z.infer<typeof updateEvaluationDraftSchema>;
export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;
export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>;
