import { z } from "zod";

/**
 * Validation schema for narrative breakdown item
 */
export const narrativeBreakdownItemSchema = z.object({
  story_stream: z.string().min(1, "Story stream is required").max(500, "Story stream must not exceed 500 characters"),
  percentage: z
    .number()
    .min(0, "Percentage must be at least 0")
    .max(100, "Percentage must be at most 100"),
  narrative_purpose: z.string().min(1, "Narrative purpose is required").max(500, "Narrative purpose must not exceed 500 characters"),
  sort_order: z.number().int().min(0),
});

/**
 * Validation schema for event planning item
 */
export const eventPlanningItemSchema = z.object({
  episode_range: z.string().min(1, "Episode range is required").max(200, "Episode range must not exceed 200 characters"),
  event_scale: z.string().min(1, "Event scale is required").max(200, "Event scale must not exceed 200 characters"),
  on_screen_activity: z.string().min(1, "On-screen activity is required").max(500, "On-screen activity must not exceed 500 characters"),
  approx_frequency: z.string().min(1, "Approximate frequency is required").max(200, "Approximate frequency must not exceed 200 characters"),
  budget_category: z.enum(["High", "Medium", "Low"], {
    errorMap: () => ({ message: "Budget category must be High, Medium, or Low" }),
  }),
  sort_order: z.number().int().min(0),
});

/**
 * Validation schema for potential weakness/risk item
 */
export const potentialWeaknessRiskItemSchema = z.object({
  issue: z.string().min(1, "Issue is required").max(500, "Issue must not exceed 500 characters"),
  explanation_risk_detail: z.string().min(1, "Explanation/Risk Detail is required").max(1000, "Explanation must not exceed 1000 characters"),
  impact: z.string().min(1, "Impact is required").max(500, "Impact must not exceed 500 characters"),
  sort_order: z.number().int().min(0),
});

/**
 * Validation schema for character relationship item
 */
export const characterRelationshipItemSchema = z.object({
  character_a_name: z.string().min(1, "Character A name is required").max(200, "Character name must not exceed 200 characters"),
  character_a_role: z.enum(["protagonist", "antagonist", "supporting", "minor"], {
    errorMap: () => ({ message: "Character role must be protagonist, antagonist, supporting, or minor" }),
  }),
  character_b_name: z.string().min(1, "Character B name is required").max(200, "Character name must not exceed 200 characters"),
  character_b_role: z.enum(["protagonist", "antagonist", "supporting", "minor"], {
    errorMap: () => ({ message: "Character role must be protagonist, antagonist, supporting, or minor" }),
  }),
  relationship_type: z.enum([
    "family",
    "romantic",
    "professional",
    "friendship",
    "rivalry",
    "mentor_mentee",
    "alliance",
    "conflict",
    "other",
  ], {
    errorMap: () => ({ message: "Invalid relationship type" }),
  }),
  relationship_description: z.string().min(1, "Relationship description is required").max(500, "Description must not exceed 500 characters"),
  initial_state: z.string().max(500, "Initial state must not exceed 500 characters").optional(),
  final_state: z.string().max(500, "Final state must not exceed 500 characters").optional(),
  key_turning_points: z.string().max(1000, "Turning points must not exceed 1000 characters").optional(),
  emotional_weight: z.enum(["high", "medium", "low"]).optional(),
  drives_plot: z.boolean().default(false),
  sort_order: z.number().int().min(0),
}).refine(
  (data) => data.character_a_name !== data.character_b_name,
  { message: "Characters must be different", path: ["character_b_name"] }
);

/**
 * Validation schema for creating detailed one-liner
 */
export const detailedOneLinerSchema = z.object({
  call_report_id: z.string().uuid("Invalid call report ID"),
  preamble: z.string().min(1, "Preamble is required"),
  plot: z.string().min(1, "PLOT is required"),
  emotional_arena: z.string().min(1, "The Emotional Arena is required"),
  creed_conflict: z.string().min(1, "Creed and Conflict is required"),
  new_element: z.string().min(1, "New Element is required"),
  emotional_core_resolution: z.string().min(1, "Emotional Core and Resolution is required"),
  narrative_breakdown_items: z
    .array(narrativeBreakdownItemSchema)
    .min(1, "At least one narrative breakdown item is required"),
  event_planning_items: z
    .array(eventPlanningItemSchema)
    .optional(),
  production_optimization_notes: z.string().optional(),
  net_outcome: z.string().optional(),
  potential_weaknesses_risks_items: z
    .array(potentialWeaknessRiskItemSchema)
    .optional(),
  character_relationships: z
    .array(characterRelationshipItemSchema)
    .optional(),
  conclusion_recommendation: z.string().optional(),
});

/**
 * Validation schema for updating detailed one-liner
 * All fields except call_report_id can be updated
 */
export const updateDetailedOneLinerSchema = z.object({
  preamble: z.string().min(1, "Preamble is required").optional(),
  plot: z.string().min(1, "PLOT is required").optional(),
  emotional_arena: z.string().min(1, "The Emotional Arena is required").optional(),
  creed_conflict: z.string().min(1, "Creed and Conflict is required").optional(),
  new_element: z.string().min(1, "New Element is required").optional(),
  emotional_core_resolution: z.string().min(1, "Emotional Core and Resolution is required").optional(),
  narrative_breakdown_items: z
    .array(narrativeBreakdownItemSchema)
    .min(1, "At least one narrative breakdown item is required")
    .optional(),
  event_planning_items: z
    .array(eventPlanningItemSchema)
    .optional(),
  production_optimization_notes: z.string().optional(),
  net_outcome: z.string().optional(),
  potential_weaknesses_risks_items: z
    .array(potentialWeaknessRiskItemSchema)
    .optional(),
  character_relationships: z
    .array(characterRelationshipItemSchema)
    .optional(),
  conclusion_recommendation: z.string().optional(),
});

export type DetailedOneLinerFormData = z.infer<typeof detailedOneLinerSchema>;
export type UpdateDetailedOneLinerFormData = z.infer<typeof updateDetailedOneLinerSchema>;
export type NarrativeBreakdownItemFormData = z.infer<typeof narrativeBreakdownItemSchema>;
export type EventPlanningItemFormData = z.infer<typeof eventPlanningItemSchema>;
export type PotentialWeaknessRiskItemFormData = z.infer<typeof potentialWeaknessRiskItemSchema>;
export type CharacterRelationshipItemFormData = z.infer<typeof characterRelationshipItemSchema>;
