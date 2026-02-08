import { z } from "zod";

export const createWriterEngagementSchema = z.object({
  writer_id: z.string().uuid("Invalid writer ID format"),
  date_engaged: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time_slot: z
    .string()
    .max(100, "Time slot must be less than 100 characters")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(5000, "Notes must be less than 5000 characters")
    .optional()
    .nullable(),
});

export const updateWriterEngagementSchema =
  createWriterEngagementSchema.partial();

export type CreateWriterEngagementInput = z.infer<
  typeof createWriterEngagementSchema
>;
export type UpdateWriterEngagementInput = z.infer<
  typeof updateWriterEngagementSchema
>;
