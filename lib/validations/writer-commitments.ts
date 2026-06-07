import { z } from "zod";

export const COMMITMENT_SCHEDULES = [
  "1_per_week",
  "2_per_week",
  "3_per_week",
  "4_per_week",
  "1_per_month",
  "2_per_month",
  "3_per_month",
  "custom",
] as const;

export type CommitmentSchedule = (typeof COMMITMENT_SCHEDULES)[number];

export const COMMITMENT_SCHEDULE_LABELS: Record<CommitmentSchedule, string> = {
  "1_per_week": "1 episode / week",
  "2_per_week": "2 episodes / week",
  "3_per_week": "3 episodes / week",
  "4_per_week": "4 episodes / week",
  "1_per_month": "1 episode / month",
  "2_per_month": "2 episodes / month",
  "3_per_month": "3 episodes / month",
  custom: "Custom",
};

export const createWriterCommitmentSchema = z.object({
  writer_id: z.string().uuid("Invalid writer"),
  call_report_id: z.string().uuid("Invalid project"),
  commitment_type: z.enum(["verbal", "contractual"], {
    required_error: "Commitment type is required",
  }),
  commitment_schedule: z.enum(COMMITMENT_SCHEDULES, {
    required_error: "Commitment schedule is required",
  }),
  commitment_schedule_custom: z.string().optional().nullable(),
  project_initiation_date: z.string().min(1, "Project initiation date is required"),
  commitment_date: z.string().min(1, "Commitment date is required"),
  revised_commitment_date: z.string().optional().nullable(),
  revision_reason: z.string().optional().nullable(),
  is_delivered: z.boolean().default(false),
  delivered_at: z.string().optional().nullable(),
  delay_notes: z.string().optional().nullable(),
});

export const updateWriterCommitmentSchema = createWriterCommitmentSchema.partial();

export type CreateWriterCommitmentInput = z.infer<typeof createWriterCommitmentSchema>;
export type UpdateWriterCommitmentInput = z.infer<typeof updateWriterCommitmentSchema>;
