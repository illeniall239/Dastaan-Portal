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
  conclusion_recommendation: z.string().optional(),
});

export type DetailedOneLinerFormData = z.infer<typeof detailedOneLinerSchema>;
export type NarrativeBreakdownItemFormData = z.infer<typeof narrativeBreakdownItemSchema>;
export type EventPlanningItemFormData = z.infer<typeof eventPlanningItemSchema>;
export type PotentialWeaknessRiskItemFormData = z.infer<typeof potentialWeaknessRiskItemSchema>;
