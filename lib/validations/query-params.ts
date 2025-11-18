/**
 * Query Parameter Validation Schemas
 *
 * Provides reusable Zod schemas for validating query string parameters
 * across GET API routes to ensure data integrity and prevent injection attacks.
 */

import { z } from "zod";

/**
 * Boolean query parameter (accepts "true"/"false" strings or actual booleans)
 * Usage: ?sample=true
 */
export const booleanQueryParam = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .transform((val) => val === "true" || val === true)
  .optional();

/**
 * Integer query parameter with optional min/max bounds
 * Usage: ?page=1&limit=50
 */
export const intQueryParam = (min?: number, max?: number) => {
  let schema = z.string().regex(/^\d+$/).transform(Number);

  if (min !== undefined && max !== undefined) {
    return schema
      .refine((n) => n >= min, { message: `Must be >= ${min}` })
      .refine((n) => n <= max, { message: `Must be <= ${max}` })
      .optional();
  } else if (min !== undefined) {
    return schema
      .refine((n) => n >= min, { message: `Must be >= ${min}` })
      .optional();
  } else if (max !== undefined) {
    return schema
      .refine((n) => n <= max, { message: `Must be <= ${max}` })
      .optional();
  }

  return schema.optional();
};

/**
 * Pagination query parameters
 * Usage: ?page=1&limit=50&offset=0
 */
export const paginationQuerySchema = z.object({
  page: intQueryParam(1),
  limit: intQueryParam(1, 500),
  offset: intQueryParam(0),
});

/**
 * Search query parameter with min/max length
 * Usage: ?q=search+term
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query must be at least 1 character")
    .max(200, "Search query must not exceed 200 characters")
    .optional(),
});

/**
 * Genre filter query parameter
 * Usage: ?genre=drama
 */
export const genreQueryParam = z
  .enum([
    "drama",
    "thriller",
    "romance",
    "comedy",
    "action",
    "horror",
    "sci-fi",
    "historical",
    "family",
    "mystery",
  ])
  .optional();

/**
 * Status filter query parameter (generic)
 * Usage: ?status=active
 */
export const statusQueryParam = z.string().min(1).max(50).optional();

/**
 * UUID query parameter (for filtering by related entities)
 * Usage: ?story_id=uuid&call_report_id=uuid
 */
export const uuidQueryParam = z.string().uuid().optional();

/**
 * Common filter schema combining multiple query parameters
 */
export const commonFilterQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: statusQueryParam,
});

/**
 * Content delivery query filters
 * Usage: ?search=term&genre=drama&status=active&contract_type=standard&time_slot=primetime
 */
export const contentDeliveryQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  genre: genreQueryParam,
  status: statusQueryParam,
  contract_type: z.enum(["standard", "premium", "exclusive"]).optional(),
  time_slot: z.enum(["primetime", "afternoon", "morning", "late_night"]).optional(),
});

/**
 * Episodes query filters
 * Usage: ?call_report_id=uuid&story_id=uuid&logged_by=uuid&episode_number=5
 */
export const episodesQuerySchema = z.object({
  call_report_id: uuidQueryParam,
  story_id: uuidQueryParam,
  logged_by: uuidQueryParam,
  episode_number: intQueryParam(1),
});

/**
 * Contract terms query filters
 * Usage: ?status=pending&story_id=uuid
 */
export const contractTermsQuerySchema = z.object({
  status: z.enum(["pending", "agreed", "failed", "completed"]).optional(),
  story_id: uuidQueryParam,
});

/**
 * Episodic evaluations query filters
 * Usage: ?episode_id=uuid
 */
export const episodicEvaluationsQuerySchema = z.object({
  episode_id: uuidQueryParam,
});

/**
 * Type exports for TypeScript usage
 */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type CommonFilterQuery = z.infer<typeof commonFilterQuerySchema>;
export type ContentDeliveryQuery = z.infer<typeof contentDeliveryQuerySchema>;
export type EpisodesQuery = z.infer<typeof episodesQuerySchema>;
export type ContractTermsQuery = z.infer<typeof contractTermsQuerySchema>;
export type EpisodicEvaluationsQuery = z.infer<typeof episodicEvaluationsQuerySchema>;
