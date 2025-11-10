/**
 * UUID Parameter Validation Schemas
 *
 * Provides reusable Zod schemas for validating UUID path parameters
 * across all API routes to prevent SQL injection and invalid query attacks.
 */

import { z } from "zod";

/**
 * UUID v4 validation pattern
 * Ensures the ID is a valid UUID before using in database queries
 */
export const uuidSchema = z.string().uuid({
  message: "Invalid UUID format. Expected format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
});

/**
 * Schema for routes with [id] parameter
 * Usage: const validation = idParamSchema.safeParse({ id: params.id });
 */
export const idParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema for routes with [episodeId] parameter
 * Usage: const validation = episodeIdParamSchema.safeParse({ episodeId: params.episodeId });
 */
export const episodeIdParamSchema = z.object({
  episodeId: uuidSchema,
});

/**
 * Schema for routes with [callReportId] parameter
 * Usage: const validation = callReportIdParamSchema.safeParse({ callReportId: params.callReportId });
 */
export const callReportIdParamSchema = z.object({
  callReportId: uuidSchema,
});

/**
 * Schema for routes with [storyId] parameter
 */
export const storyIdParamSchema = z.object({
  storyId: uuidSchema,
});

/**
 * Schema for routes with [token] parameter
 * Tokens are alphanumeric strings (not UUIDs) for external evaluation links
 */
export const tokenParamSchema = z.object({
  token: z.string().min(16).max(64).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Invalid token format. Token must be alphanumeric with optional dashes and underscores.",
  }),
});

/**
 * Type exports for TypeScript usage
 */
export type IdParam = z.infer<typeof idParamSchema>;
export type EpisodeIdParam = z.infer<typeof episodeIdParamSchema>;
export type CallReportIdParam = z.infer<typeof callReportIdParamSchema>;
export type StoryIdParam = z.infer<typeof storyIdParamSchema>;
export type TokenParam = z.infer<typeof tokenParamSchema>;
