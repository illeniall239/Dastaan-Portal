import { z } from "zod";

/**
 * Validation schema for updating a call report (writer engagement report)
 * These fields can be updated after creation
 */
export const updateCallReportSchema = z.object({
  writer_name: z.string().min(1, "Writer name is required").max(200).optional(),
  suggested_writer: z.string().max(200).optional(),
  contact_email: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.string().email("Invalid email").optional()
  ),
  contact_phone: z.string().max(50).optional(),
  contact_address: z.string().max(500).optional(),
  working_title: z.string().min(1, "Working title is required").max(300).optional(),
  director: z.string().max(255).optional(),
  total_episodes: z.number().min(0).optional(),
  received_episodes: z.number().min(0).optional(),
  logline: z.string().min(1, "Logline is required").optional()
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val),
  logline_image_url: z.string().url("Invalid URL").optional().nullable()
    .or(z.literal(""))
    .transform(val => val === "" ? undefined : val),
  short_synopsis: z.string().optional(),
  episodic_synopsis: z.string().optional(),
  genre: z.array(z.string().min(1).max(50)).min(1, "At least one genre is required").optional()
    .or(z.array(z.string()).length(0))
    .transform(val => !val || val.length === 0 ? undefined : val),
  content_type: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.enum([
      "Serial",
      "Long Serial",
      "Telefilm",
      "Mini-serial",
      "Ramadan Serial",
      "Series Sitcom",
      "Soap"
    ], {
      errorMap: () => ({ message: "Please select a valid content type" })
    }).optional()
  ),
  theme: z.string().max(200).optional(),
  category: z.enum([
    "external_producer",
    "writer_pitch",
    "inhouse_content",
    "content_head_initiative",
    "given_by_management"
  ]).optional(),
  idea_by: z.string().max(200).optional(),
  developed_by: z.string().max(200).optional(),
  management_member_name: z.string().max(200).optional(),
  target_slot: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.string().max(100).optional()
  ),
  location: z.string().max(255).optional(),
  meeting_date: z.string().datetime().optional(),
  meeting_attendees: z.array(z.string()).optional(),
  meeting_notes: z.string().optional(),
  next_steps: z.string().max(1000).optional(),
  status: z.string().max(50).optional(),
  overall_rating: z.number().min(1).max(10).optional(),
  attachments_to_delete: z.array(z.string().uuid()).optional(),
}).refine((data) => {
  // Only validate when creating or explicitly changing category
  // In edit mode, if these fields are undefined, they preserve DB values
  if (data.category === "content_head_initiative") {
    // Only fail if the fields exist but are empty
    const idea_by_valid = data.idea_by === undefined || Boolean(data.idea_by);
    const developed_by_valid = data.developed_by === undefined || Boolean(data.developed_by);
    return idea_by_valid && developed_by_valid;
  }
  return true;
}, {
  message: "Idea By and Developed By cannot be empty for Content Head Initiative",
  path: ["category"]
}).refine((data) => {
  // Only validate when creating or explicitly changing category
  if (data.category === "given_by_management") {
    return data.management_member_name === undefined || Boolean(data.management_member_name);
  }
  return true;
}, {
  message: "Management Member Name cannot be empty when Given by Management",
  path: ["category"]
});

export type UpdateCallReportFormData = z.infer<typeof updateCallReportSchema>;
