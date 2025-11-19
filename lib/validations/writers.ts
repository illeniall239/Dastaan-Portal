import { z } from "zod";

// Schema for creating a new writer
export const createWriterSchema = z.object({
  name: z
    .string()
    .min(1, "Writer name is required")
    .max(255, "Writer name must be less than 255 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(50, "Phone number must be less than 50 characters")
    .optional()
    .or(z.literal("")),
});

// Schema for updating a writer
export const updateWriterSchema = z.object({
  name: z
    .string()
    .min(1, "Writer name is required")
    .max(255, "Writer name must be less than 255 characters")
    .trim()
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(50, "Phone number must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateWriterInput = z.infer<typeof createWriterSchema>;
export type UpdateWriterInput = z.infer<typeof updateWriterSchema>;
