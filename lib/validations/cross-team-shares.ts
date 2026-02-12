import { z } from "zod";

export const createCrossTeamShareSchema = z.object({
  call_report_id: z.string().uuid("Invalid call report ID"),
  to_team_id: z.string().uuid("Invalid team ID"),
  notes: z.string().optional().nullable(),
  evaluation_deadline: z.string().optional().nullable(),
  required_evaluations: z.number().int().positive().optional().default(3),
});

export const crossTeamEvaluationSchema = z.object({
  premise_conflict_score: z.number().min(1).max(10),
  storyline_plot_score: z.number().min(1).max(10),
  episodic_progression_score: z.number().min(1).max(10),
  characters_score: z.number().min(1).max(10),
  overall_assessment_score: z.number().min(1).max(10),
  decision: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
});

export type CreateCrossTeamShareInput = z.infer<typeof createCrossTeamShareSchema>;
export type CrossTeamEvaluationInput = z.infer<typeof crossTeamEvaluationSchema>;
