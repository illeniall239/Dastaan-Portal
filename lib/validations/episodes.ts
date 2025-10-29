import { z } from "zod";

// Allowed file types for episode attachments
export const ALLOWED_EPISODE_FILE_TYPES = [
  ".pdf",
  ".txt",
  ".ppt",
  ".pptx",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
] as const;

export const ALLOWED_EPISODE_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
] as const;

// Max file size: 50MB
export const MAX_EPISODE_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Single Episode Validation Schema
 * Used when creating or updating a single episode
 */
export const episodeSchema = z.object({
  // Source reference (one must be provided)
  call_report_id: z.string().uuid().optional().nullable(),
  story_id: z.string().uuid().optional().nullable(),

  // Episode details
  episode_number: z
    .number()
    .int("Episode number must be an integer")
    .positive("Episode number must be positive")
    .min(1, "Episode number must be at least 1"),

  title: z
    .string()
    .max(200, "Title must not exceed 200 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),

  // File attachment (optional)
  attachment_url: z.string().url().optional().nullable(),
  attachment_name: z.string().max(255).optional().nullable(),
  attachment_type: z.string().max(100).optional().nullable(),

  // Additional information
  additional_info: z
    .string()
    .max(5000, "Additional information must not exceed 5000 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
}).refine(
  (data) => data.call_report_id || data.story_id,
  {
    message: "Either call_report_id or story_id must be provided",
    path: ["call_report_id"],
  }
).refine(
  (data) => !(data.call_report_id && data.story_id),
  {
    message: "Cannot provide both call_report_id and story_id",
    path: ["call_report_id"],
  }
);

/**
 * Multiple Episodes Creation Schema
 * Used when creating multiple episodes at once
 */
export const createMultipleEpisodesSchema = z.object({
  // Common source for all episodes (one must be provided)
  call_report_id: z.string().uuid().optional().nullable(),
  story_id: z.string().uuid().optional().nullable(),

  // Array of episodes
  episodes: z
    .array(
      z.object({
        episode_number: z
          .number()
          .int()
          .positive()
          .min(1, "Episode number must be at least 1"),
        title: z
          .string()
          .max(200)
          .optional()
          .nullable()
          .transform((val) => (val ? val.trim() : null)),
        attachment_url: z.string().url().optional().nullable(),
        attachment_name: z.string().max(255).optional().nullable(),
        attachment_type: z.string().max(100).optional().nullable(),
        additional_info: z
          .string()
          .max(5000)
          .optional()
          .nullable()
          .transform((val) => (val ? val.trim() : null)),
      })
    )
    .min(1, "At least one episode must be provided")
    .max(50, "Cannot create more than 50 episodes at once"),
}).refine(
  (data) => data.call_report_id || data.story_id,
  {
    message: "Either call_report_id or story_id must be provided",
    path: ["call_report_id"],
  }
).refine(
  (data) => !(data.call_report_id && data.story_id),
  {
    message: "Cannot provide both call_report_id and story_id",
    path: ["story_id"],
  }
);

/**
 * Update Episode Schema
 * Used when updating an existing episode
 */
export const updateEpisodeSchema = z.object({
  episode_number: z.number().int().positive().optional(),
  title: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
  attachment_url: z.string().url().optional().nullable(),
  attachment_name: z.string().max(255).optional().nullable(),
  attachment_type: z.string().max(100).optional().nullable(),
  additional_info: z
    .string()
    .max(5000)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
});

/**
 * Query/Filter Schema for fetching episodes
 */
export const episodesQuerySchema = z.object({
  call_report_id: z.string().uuid().optional(),
  story_id: z.string().uuid().optional(),
  logged_by: z.string().uuid().optional(),
  episode_number: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
  sort_by: z.enum(["created_at", "episode_number", "updated_at"]).default("created_at").optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc").optional(),
});

/**
 * TypeScript types inferred from schemas
 */
export type EpisodeFormData = z.infer<typeof episodeSchema>;
export type CreateMultipleEpisodesFormData = z.infer<typeof createMultipleEpisodesSchema>;
export type UpdateEpisodeFormData = z.infer<typeof updateEpisodeSchema>;
export type EpisodesQueryParams = z.infer<typeof episodesQuerySchema>;

/**
 * Helper function to validate file type
 */
export function isValidEpisodeFileType(filename: string): boolean {
  const extension = "." + filename.split(".").pop()?.toLowerCase();
  return ALLOWED_EPISODE_FILE_TYPES.includes(extension as any);
}

/**
 * Helper function to validate file size
 */
export function isValidEpisodeFileSize(fileSize: number): boolean {
  return fileSize <= MAX_EPISODE_FILE_SIZE;
}

/**
 * Helper function to get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return "." + filename.split(".").pop()?.toLowerCase();
}

/**
 * Helper function to format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
