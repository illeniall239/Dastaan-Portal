import { z } from "zod";

/**
 * Rate range options for negotiations
 */
export const RATE_RANGES = [
  "50,000 - 100,000",
  "100,000 - 150,000",
  "150,000 - 200,000",
  "200,000 - 250,000",
  "250,000+",
] as const;

/**
 * Time slot options for TV broadcasting
 */
export const TIME_SLOTS = [
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
] as const;

/**
 * Contract type options
 */
export const CONTRACT_TYPES = ["net", "gross"] as const;

/**
 * Negotiation status options
 */
export const NEGOTIATION_STATUSES = [
  "in_progress",
  "agreed",
  "failed",
] as const;

/**
 * Delivery Schedule Episode Schema
 * Represents a single episode with delivery date
 */
export const deliveryEpisodeSchema = z.object({
  episode_number: z
    .number()
    .int("Episode number must be an integer")
    .positive("Episode number must be positive")
    .min(1, "Episode number must be at least 1"),
  episode_title: z
    .string()
    .max(200, "Episode title must not exceed 200 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
  delivery_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

// Keep old schema name for backwards compatibility
export const deliveryBatchSchema = deliveryEpisodeSchema;

/**
 * Create Negotiation Schema
 * Used when creating a new negotiation/term sheet
 */
export const createNegotiationSchema = z.object({
  // Project selection (required)
  story_id: z
    .string()
    .uuid("Invalid story ID")
    .min(1, "Project selection is required"),

  // Auto-populated fields (read-only in form, but validated)
  writer_producer_name: z
    .string()
    .min(1, "Writer name is required")
    .max(200, "Writer name must not exceed 200 characters")
    .transform((val) => val.trim()),

  genre: z
    .string()
    .min(1, "Genre is required")
    .max(100, "Genre must not exceed 100 characters"),

  // Contract type (net or gross)
  contract_type: z.enum(CONTRACT_TYPES, {
    errorMap: () => ({ message: "Please select a valid contract type" }),
  }),

  // Rate range selection
  rate_range: z.enum(RATE_RANGES, {
    errorMap: () => ({ message: "Please select a valid rate range" }),
  }),

  // Proposed price (optional, can be specified within the range)
  proposed_price: z
    .number()
    .positive("Price must be positive")
    .optional()
    .nullable(),

  // Episode information
  estimated_episodes: z
    .number()
    .int("Episode count must be an integer")
    .positive("Episode count must be positive")
    .min(1, "At least 1 episode is required")
    .max(500, "Cannot exceed 500 episodes"),

  // Time slot selection
  suggested_time_slot: z.enum(TIME_SLOTS, {
    errorMap: () => ({ message: "Please select a valid time slot" }),
  }),

  // Project start date
  project_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
      },
      { message: "Project start date cannot be in the past" }
    ),

  // Delivery schedule
  delivery_schedule: z
    .array(deliveryEpisodeSchema)
    .min(1, "At least one episode is required")
    .max(500, "Cannot exceed 500 episodes")
    .refine(
      (episodes) => {
        // Check for duplicate episode numbers
        const episodeNumbers = episodes.map((e) => e.episode_number);
        return new Set(episodeNumbers).size === episodeNumbers.length;
      },
      { message: "Duplicate episode numbers are not allowed" }
    ),

  // Additional fields (optional)
  payment_structure: z
    .string()
    .max(1000, "Payment structure must not exceed 1000 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),

  price_justification: z
    .string()
    .max(2000, "Price justification must not exceed 2000 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),

  expected_completion_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // If completion date is provided, it must be after start date
    if (data.expected_completion_date && data.project_start_date) {
      return new Date(data.expected_completion_date) > new Date(data.project_start_date);
    }
    return true;
  },
  {
    message: "Expected completion date must be after project start date",
    path: ["expected_completion_date"],
  }
);

/**
 * Update Negotiation Schema
 * Used when updating an existing negotiation
 */
export const updateNegotiationSchema = z.object({
  contract_type: z.enum(CONTRACT_TYPES).optional(),
  rate_range: z.enum(RATE_RANGES).optional(),
  proposed_price: z.number().positive().optional().nullable(),
  estimated_episodes: z.number().int().positive().min(1).max(500).optional(),
  suggested_time_slot: z.enum(TIME_SLOTS).optional(),
  project_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  delivery_schedule: z.array(deliveryEpisodeSchema).min(1).max(500).optional(),
  payment_structure: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
  price_justification: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
  expected_completion_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  status: z.enum(NEGOTIATION_STATUSES).optional(),
  counter_offer: z.number().positive().optional().nullable(),
  counter_offer_justification: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
  agreed_price: z.number().positive().optional().nullable(),
  agreed_terms: z
    .string()
    .max(5000)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
  failed_reason: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : val)),
});

/**
 * Query Schema for filtering negotiations
 */
export const negotiationsQuerySchema = z.object({
  story_id: z.string().uuid().optional(),
  status: z.enum(NEGOTIATION_STATUSES).optional(),
  created_by: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
  sort_by: z
    .enum(["created_at", "updated_at", "project_start_date"])
    .default("created_at")
    .optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc").optional(),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreateNegotiationFormData = z.infer<typeof createNegotiationSchema>;
export type UpdateNegotiationFormData = z.infer<typeof updateNegotiationSchema>;
export type NegotiationsQueryParams = z.infer<typeof negotiationsQuerySchema>;
export type DeliveryEpisode = z.infer<typeof deliveryEpisodeSchema>;
export type DeliveryBatch = DeliveryEpisode; // Alias for backwards compatibility
export type RateRange = (typeof RATE_RANGES)[number];
export type TimeSlot = (typeof TIME_SLOTS)[number];
export type NegotiationStatus = (typeof NEGOTIATION_STATUSES)[number];
export type ContractType = (typeof CONTRACT_TYPES)[number];

/**
 * Helper function to validate if a story is eligible for negotiation
 * Stories must be in 'approved' status to be negotiated
 */
export function isStoryEligibleForNegotiation(storyStatus: string): boolean {
  return storyStatus === "approved";
}

/**
 * Helper function to format rate range for display
 */
export function formatRateRange(range: RateRange): string {
  if (range === "250,000+") {
    return "Over ₨250,000";
  }
  return `₨${range}`;
}

/**
 * Helper function to get warning message if episode count doesn't match estimate
 * Returns null if counts match
 */
export function getEpisodeCountWarning(
  deliveryEpisodes: DeliveryEpisode[],
  estimatedEpisodes: number
): string | null {
  const actualCount = deliveryEpisodes.length;

  if (actualCount === estimatedEpisodes) {
    return null;
  }

  if (actualCount < estimatedEpisodes) {
    return `⚠️ ${actualCount} episode${actualCount !== 1 ? 's' : ''} added, ${estimatedEpisodes} estimated`;
  }

  return `⚠️ ${actualCount} episode${actualCount !== 1 ? 's' : ''} added, only ${estimatedEpisodes} estimated`;
}
