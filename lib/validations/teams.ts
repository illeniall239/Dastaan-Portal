import { z } from "zod";

/**
 * Team validation schemas
 * Validates team creation, updates, and hierarchy
 */

// Team type enum
export const TEAM_TYPES = ["production", "channel", "adaptation", "evaluator", "other"] as const;

/**
 * Schema for creating a new team
 */
export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(100, "Team name must not exceed 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  parent_team_id: z
    .string()
    .uuid("Invalid parent team ID")
    .optional()
    .or(z.literal("")),
  team_type: z.enum(TEAM_TYPES, {
    errorMap: () => ({ message: "Please select a valid team type" }),
  }),
  team_head_id: z
    .string()
    .uuid("Invalid team head ID")
    .optional()
    .or(z.literal("")),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/**
 * Schema for updating an existing team
 */
export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(100, "Team name must not exceed 100 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  parent_team_id: z
    .string()
    .uuid("Invalid parent team ID")
    .nullable()
    .optional(),
  team_type: z.enum(TEAM_TYPES).optional(),
  team_head_id: z
    .string()
    .uuid("Invalid team head ID")
    .nullable()
    .optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

/**
 * Schema for assigning users to a team
 */
export const assignUsersToTeamSchema = z.object({
  user_ids: z
    .array(z.string().uuid("Invalid user ID"))
    .min(1, "At least one user must be selected")
    .max(100, "Cannot assign more than 100 users at once"),
  team_id: z.string().uuid("Invalid team ID"),
});

export type AssignUsersToTeamInput = z.infer<typeof assignUsersToTeamSchema>;

/**
 * Schema for removing users from a team
 */
export const removeUsersFromTeamSchema = z.object({
  user_ids: z
    .array(z.string().uuid("Invalid user ID"))
    .min(1, "At least one user must be selected")
    .max(100, "Cannot remove more than 100 users at once"),
});

export type RemoveUsersFromTeamInput = z.infer<typeof removeUsersFromTeamSchema>;

/**
 * Schema for team performance query parameters
 */
export const teamPerformanceQuerySchema = z.object({
  team_id: z.string().uuid("Invalid team ID").optional(),
  team_type: z.enum(TEAM_TYPES).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  include_sub_teams: z.boolean().default(false),
});

export type TeamPerformanceQuery = z.infer<typeof teamPerformanceQuerySchema>;

/**
 * Validation helper: Check if team name is unique
 * (to be used in API route with database query)
 */
export async function validateTeamNameUnique(
  name: string,
  excludeTeamId?: string
): Promise<boolean> {
  // This will be implemented in the API route with actual database query
  // Returns true if name is unique, false otherwise
  return true; // Placeholder
}

/**
 * Validation helper: Check if parent team exists
 * (to be used in API route with database query)
 */
export async function validateParentTeamExists(
  parentTeamId: string
): Promise<boolean> {
  // This will be implemented in the API route with actual database query
  // Returns true if parent team exists, false otherwise
  return true; // Placeholder
}

/**
 * Validation helper: Check if team head is a valid user
 * (to be used in API route with database query)
 */
export async function validateTeamHeadExists(
  teamHeadId: string
): Promise<boolean> {
  // This will be implemented in the API route with actual database query
  // Returns true if user exists, false otherwise
  return true; // Placeholder
}

/**
 * Validation helper: Check if setting parent would create circular reference
 * (to be used in API route with database query)
 */
export async function validateNoCircularReference(
  teamId: string,
  newParentId: string
): Promise<boolean> {
  // This will be implemented in the API route with actual database query
  // Uses the check_team_circular_reference() database function
  // Returns true if no circular reference, false if circular reference detected
  return true; // Placeholder
}

/**
 * Team type display names for UI
 */
export const TEAM_TYPE_LABELS: Record<typeof TEAM_TYPES[number], string> = {
  production: "Production Team",
  channel: "Channel Team",
  adaptation: "Adaptation Team",
  evaluator: "Evaluator Team",
  other: "Other",
};

/**
 * Team type descriptions for UI
 */
export const TEAM_TYPE_DESCRIPTIONS: Record<typeof TEAM_TYPES[number], string> = {
  production: "Teams focused on original drama and content production",
  channel: "Teams working on channel-specific content",
  adaptation: "Teams handling content adaptation projects",
  evaluator: "Teams of evaluators assessing content quality",
  other: "Other specialized teams",
};
