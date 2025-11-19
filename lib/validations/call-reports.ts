import { z } from "zod";

/**
 * Validation schema for updating a call report (writer engagement report)
 * These fields can be updated after creation
 */
export const updateCallReportSchema = z.object({
  writer_name: z.string().min(1, "Writer name is required").max(200).optional(),
  writer_email: z.string().max(255).optional(),
  suggested_writer: z.string().max(200).optional(),
  contact_email: z.string().email("Invalid email").optional(),
  contact_phone: z.string().max(50).optional(),
  contact_address: z.string().max(500).optional(),
  working_title: z.string().min(1, "Working title is required").max(300).optional(),
  director: z.string().max(255).optional(),
  total_episodes: z.number().min(0).optional(),
  received_episodes: z.number().min(0).optional(),
  logline: z.string().min(1, "Logline is required").optional(),
  logline_image_url: z.string().url("Invalid URL").optional(),
  short_synopsis: z.string().optional(),
  episodic_synopsis: z.string().optional(),
  genre: z.array(z.string().min(1).max(50)).min(1, "At least one genre is required").optional(),
  content_type: z.enum([
    "Serial",
    "Long Serial",
    "Telefilm",
    "Mini-serial",
    "Ramadan Serial",
    "Series Sitcom",
    "Soap"
  ], {
    errorMap: () => ({ message: "Please select a valid content type" })
  }).optional(),
  theme: z.string().max(200).optional(),
  target_slot: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
  meeting_date: z.string().datetime().optional(),
  meeting_attendees: z.array(z.string()).optional(),
  meeting_notes: z.string().optional(),
  next_steps: z.string().max(1000).optional(),
  status: z.string().max(50).optional(),
  overall_rating: z.number().min(1).max(10).optional(),
});

export type UpdateCallReportFormData = z.infer<typeof updateCallReportSchema>;
