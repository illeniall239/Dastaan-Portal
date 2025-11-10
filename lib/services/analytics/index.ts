/**
 * Analytics Services
 *
 * Exports all analytics services for easy importing.
 *
 * Usage:
 * ```typescript
 * import {
 *   ProjectAnalyticsService,
 *   ApprovalAnalyticsService,
 *   PaymentAnalyticsService,
 *   PipelineAnalyticsService,
 *   AlertsAnalyticsService,
 *   EvaluatorAnalyticsService
 * } from '@/lib/services/analytics';
 * ```
 */

// Base infrastructure
export * from './base-analytics-service';

// Analytics services
export * from './project-analytics-service';
export * from './approval-analytics-service';
export * from './payment-analytics-service';
export * from './pipeline-analytics-service';
export * from './alerts-analytics-service';
export * from './evaluator-analytics-service';
export * from './archive-analytics-service';
export * from './ideas-analytics-service';
export * from './contracts-analytics-service';

// Phase 4 Day 15: Additional analytics services
export * from './pipeline-value-service';
export * from './active-ideas-details-service';
export * from './scripting-analytics-service';
export * from './archive-details-service';
export * from './activity-analytics-service';
export * from './episode-analytics-service';
export * from './weekly-activity-analytics-service';
export * from './episode-pipeline-service';
