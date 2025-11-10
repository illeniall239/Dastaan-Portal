/**
 * Date Filter Validation Schemas
 *
 * Provides Zod schemas for validating date-related query parameters
 * across analytics and reporting API routes.
 */

import { z } from "zod";

/**
 * ISO 8601 date string validation
 * Accepts: YYYY-MM-DD or full ISO datetime strings
 * Validates that the string is parseable as a valid date
 */
export const dateStringSchema = z
  .string()
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    {
      message: "Invalid date format. Expected ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)",
    }
  )
  .transform((val) => new Date(val));

/**
 * Optional date string for query parameters
 */
export const optionalDateStringSchema = dateStringSchema.optional();

/**
 * Date range query schema
 * Usage: ?from=2025-01-01&to=2025-12-31
 *
 * Validates:
 * - Both dates are valid ISO strings
 * - 'from' date is before or equal to 'to' date
 */
export const dateRangeQuerySchema = z
  .object({
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: "'from' date must be before or equal to 'to' date",
      path: ["from"],
    }
  );

/**
 * Date range with default values (e.g., last 30 days)
 * Usage: ?startDate=2025-01-01&endDate=2025-12-31
 */
export const startEndDateQuerySchema = z
  .object({
    startDate: optionalDateStringSchema,
    endDate: optionalDateStringSchema,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "startDate must be before or equal to endDate",
      path: ["startDate"],
    }
  );

/**
 * Evaluator stats date range schema
 * Usage: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Used by /api/management/evaluator-stats
 */
export const evaluatorStatsDateSchema = z
  .object({
    from: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid 'from' date format" }
      ),
    to: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid 'to' date format" }
      ),
  })
  .transform((data) => ({
    from: data.from ? new Date(data.from) : undefined,
    to: data.to ? new Date(data.to) : undefined,
  }))
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: "'from' date must be before or equal to 'to' date",
    }
  );

/**
 * Event analysis date range schema
 * Usage: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Used by /api/management/event-analysis/[callReportId]
 */
export const eventAnalysisDateSchema = z.object({
  startDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Invalid startDate format. Expected YYYY-MM-DD" }
    )
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Invalid endDate format. Expected YYYY-MM-DD" }
    )
    .transform((val) => (val ? new Date(val) : undefined)),
});

/**
 * Relative time period schema
 * Usage: ?period=last_7_days
 */
export const timePeriodQuerySchema = z.object({
  period: z
    .enum(["last_7_days", "last_30_days", "last_90_days", "last_year", "all_time"])
    .optional()
    .default("last_30_days"),
});

/**
 * Helper function to get date range from period
 */
export function getDateRangeFromPeriod(
  period: "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "all_time"
): { from: Date; to: Date } | { from: undefined; to: undefined } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case "last_7_days": {
      const from = new Date(to);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "last_30_days": {
      const from = new Date(to);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "last_90_days": {
      const from = new Date(to);
      from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "last_year": {
      const from = new Date(to);
      from.setFullYear(from.getFullYear() - 1);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "all_time":
    default:
      return { from: undefined, to: undefined };
  }
}

/**
 * Type exports for TypeScript usage
 */
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type StartEndDateQuery = z.infer<typeof startEndDateQuerySchema>;
export type EvaluatorStatsDate = z.infer<typeof evaluatorStatsDateSchema>;
export type EventAnalysisDate = z.infer<typeof eventAnalysisDateSchema>;
export type TimePeriodQuery = z.infer<typeof timePeriodQuerySchema>;
