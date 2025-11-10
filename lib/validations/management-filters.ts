/**
 * Management Dashboard Filter Validation Schemas
 *
 * Provides Zod schemas for validating query parameters in management
 * analytics and reporting API routes.
 */

import { z } from "zod";
import { booleanQueryParam, genreQueryParam } from "./query-params";

/**
 * Sample data flag schema
 * Used across all management endpoints to switch between real and sample data
 * Usage: ?sample=true
 */
export const managementSampleQuerySchema = z.object({
  sample: booleanQueryParam,
});

/**
 * Active ideas details query schema
 * Usage: ?genre=drama&sample=true
 */
export const activeIdeasQuerySchema = z.object({
  genre: genreQueryParam,
  sample: booleanQueryParam,
});

/**
 * Active projects query schema
 * Usage: ?sample=true
 */
export const activeProjectsQuerySchema = z.object({
  sample: booleanQueryParam,
});

/**
 * Alerts query schema
 * Usage: ?sample=true
 */
export const alertsQuerySchema = z.object({
  sample: booleanQueryParam,
});

/**
 * Approvals query schema
 * Usage: ?sample=true
 */
export const approvalsQuerySchema = z.object({
  sample: booleanQueryParam,
});

/**
 * Archive details query schema
 * Usage: ?genre=drama&sample=true
 */
export const archiveDetailsQuerySchema = z.object({
  genre: genreQueryParam,
  sample: booleanQueryParam,
});

/**
 * Contracts query schema
 * Usage: ?sample=true
 */
export const contractsQuerySchema = z.object({
  sample: booleanQueryParam,
});

/**
 * Overdue payments query schema
 * Usage: ?sample=true
 */
export const overduePaymentsQuerySchema = z.object({
  sample: booleanQueryParam,
});

/**
 * Pipeline value query schema
 * Usage: ?sample=true
 */
export const pipelineValueQuerySchema = z.object({
  sample: booleanQueryParam,
});

/**
 * Weekly activities query schema
 * Usage: ?sample=true
 */
export const weeklyActivitiesQuerySchema = z.object({
  sample: booleanQueryParam,
});

/**
 * Type exports for TypeScript usage
 */
export type ManagementSampleQuery = z.infer<typeof managementSampleQuerySchema>;
export type ActiveIdeasQuery = z.infer<typeof activeIdeasQuerySchema>;
export type ActiveProjectsQuery = z.infer<typeof activeProjectsQuerySchema>;
export type AlertsQuery = z.infer<typeof alertsQuerySchema>;
export type ApprovalsQuery = z.infer<typeof approvalsQuerySchema>;
export type ArchiveDetailsQuery = z.infer<typeof archiveDetailsQuerySchema>;
export type ContractsQuery = z.infer<typeof contractsQuerySchema>;
export type OverduePaymentsQuery = z.infer<typeof overduePaymentsQuerySchema>;
export type PipelineValueQuery = z.infer<typeof pipelineValueQuerySchema>;
export type WeeklyActivitiesQuery = z.infer<typeof weeklyActivitiesQuerySchema>;
