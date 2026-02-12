import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  meeting_date: z.string().min(1, "Meeting date is required"),
  duration_minutes: z.number().positive().optional().default(60),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  agenda: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_type: z.string().optional().nullable(),
  attendees: z.array(z.string()).optional().default([]),
  category: z.string().optional().nullable(),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  meeting_date: z.string().optional(),
  duration_minutes: z.number().positive().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  agenda: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  contact_type: z.string().nullable().optional(),
  attendees: z.array(z.string()).optional(),
  category: z.string().nullable().optional(),
  status: z.string().optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
