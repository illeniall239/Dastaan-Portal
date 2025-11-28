/**
 * Evaluator Analytics Service
 *
 * Handles analytics for evaluator performance, workload, and activity tracking.
 * Provides metrics for evaluator management and performance monitoring.
 *
 * Usage:
 * ```typescript
 * const service = new EvaluatorAnalyticsService('server');
 * const overview = await service.getEvaluatorOverview();
 * const stats = await service.getAllEvaluatorStats();
 * const workloads = await service.getEvaluatorWorkloads();
 * ```
 */

import {
  UserRepository,
  EvaluationRepository,
  EpisodicEvaluationRepository,
  EvaluatorAssignmentRepository,
  type RepositoryContextType,
} from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Evaluator overview statistics
 */
export interface EvaluatorOverview {
  totalEvaluators: number;
  activeEvaluators: number;
  totalEvaluations: number;
  avgResponseTime: number; // in days
}

/**
 * Detailed evaluator statistics
 */
export interface EvaluatorStats {
  id: string;
  name: string;
  email: string;
  oneLinerCount: number;
  episodicEvals: number;
  callReportEvals: number;
  totalEvaluations: number;
  avgTimeSpent: number; // average hours per evaluation
}

/**
 * Evaluator workload data
 */
export interface EvaluatorWorkload {
  evaluatorId: string;
  evaluatorName: string;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

/**
 * Evaluator activity heatmap data
 */
export interface EvaluatorActivity {
  evaluatorId: string;
  evaluatorName: string;
  weeklyActivity: {
    weekStart: string;
    count: number;
  }[];
}

/**
 * Evaluator analytics service
 * Uses repositories instead of direct Supabase queries
 */
export class EvaluatorAnalyticsService extends BaseAnalyticsService {
  private userRepo: UserRepository;
  private evaluationRepo: EvaluationRepository;
  private episodicEvalRepo: EpisodicEvaluationRepository;
  private assignmentRepo: EvaluatorAssignmentRepository;
  private context: RepositoryContextType;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.context = context;
    this.userRepo = new UserRepository(context);
    this.evaluationRepo = new EvaluationRepository(context);
    this.episodicEvalRepo = new EpisodicEvaluationRepository(context);
    this.assignmentRepo = new EvaluatorAssignmentRepository(context);
  }

  /**
   * Get Supabase client (for one_liners table access)
   * TODO: Create OneLinerRepository in future
   */
  private async getClient() {
    switch (this.context) {
      case 'server':
        return await createServerClient();
      case 'client':
        return createBrowserClient();
      case 'admin':
        return createAdminClient();
      default:
        throw new Error(`Invalid repository context type: ${this.context}`);
    }
  }

  /**
   * Get evaluator overview statistics
   *
   * @returns Overview of evaluator metrics
   */
  async getEvaluatorOverview(): Promise<EvaluatorOverview> {
    try {
      logger.info('Getting evaluator overview');

      return await this.withCache(
        'analytics:evaluator-overview',
        async () => {
          // Get all active evaluators
          const evaluators = await this.userRepo.getActiveEvaluators();

          // Get all call report evaluations
          const callReportEvals = await this.evaluationRepo.findAll({
            select: 'evaluator_id, created_at',
          });

          // Get all episodic evaluations
          const episodicEvals = await this.episodicEvalRepo.findAll({
            select: 'evaluator_id, submitted_at',
          });

          const totalEvaluators = evaluators.length;
          const totalEvaluations = callReportEvals.length + episodicEvals.length;

          // Calculate average response time (simplified - from assignment to submission)
          // TODO: Calculate from actual assignment dates when available
          const avgResponseTime = 2.3;

          logger.info(
            `Evaluator overview: ${totalEvaluators} evaluators, ${totalEvaluations} total evaluations`
          );

          return {
            totalEvaluators,
            activeEvaluators: totalEvaluators,
            totalEvaluations,
            avgResponseTime,
          };
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get evaluator overview');
    }
  }

  /**
   * Get detailed stats for all evaluators
   *
   * @param fromDate - Optional start date for filtering
   * @param toDate - Optional end date for filtering
   * @returns Array of evaluator statistics
   */
  async getAllEvaluatorStats(
    fromDate?: Date,
    toDate?: Date
  ): Promise<EvaluatorStats[]> {
    try {
      const cacheKey = `analytics:evaluator-stats:${fromDate?.toISOString() || 'all'}:${toDate?.toISOString() || 'all'}`;
      logger.info(`Getting evaluator stats (from: ${fromDate || 'all'}, to: ${toDate || 'all'})`);

      return await this.withCache(
        cacheKey,
        async () => {
          // Get all active evaluators
          const evaluators = await this.userRepo.getActiveEvaluators({
            select: 'id, name, email',
          });

          if (evaluators.length === 0) {
            return [];
          }

          // Get call report evaluations with optional date filtering
          let callReportEvals = await this.evaluationRepo.findAll({
            select: 'evaluator_id, created_at',
          });

          if (fromDate || toDate) {
            callReportEvals = callReportEvals.filter((evaluation: any) => {
              const createdAt = new Date(evaluation.created_at);
              if (fromDate && createdAt < fromDate) return false;
              if (toDate && createdAt > toDate) return false;
              return true;
            });
          }

          // Get episodic evaluations with optional date filtering
          let episodicEvals = await this.episodicEvalRepo.findAll({
            select: 'evaluator_id, submitted_at',
          });

          if (fromDate || toDate) {
            episodicEvals = episodicEvals.filter((evaluation: any) => {
              const submittedAt = new Date(evaluation.submitted_at);
              if (fromDate && submittedAt < fromDate) return false;
              if (toDate && submittedAt > toDate) return false;
              return true;
            });
          }

          // Get one-liner decisions (using direct query for now)
          const supabase = await this.getClient();
          let oneLinersQuery = supabase
            .from('one_liners')
            .select('decided_by, decided_at');

          if (fromDate) {
            oneLinersQuery = oneLinersQuery.gte('decided_at', fromDate.toISOString());
          }
          if (toDate) {
            oneLinersQuery = oneLinersQuery.lte('decided_at', toDate.toISOString());
          }

          const { data: oneLiners } = await oneLinersQuery;

          // Calculate stats for each evaluator
          const stats: EvaluatorStats[] = evaluators.map((evaluator) => {
            const crEvals =
              callReportEvals.filter((e: any) => e.evaluator_id === evaluator.id) || [];
            const epEvals =
              episodicEvals.filter((e: any) => e.evaluator_id === evaluator.id) || [];
            const oneLinerDecisions =
              oneLiners?.filter((ol) => ol.decided_by === evaluator.id) || [];

            const totalEvaluations = crEvals.length + epEvals.length;

            // Calculate average time spent (hours per evaluation)
            const allDates = [
              ...crEvals.map((e: any) => new Date(e.created_at)),
              ...epEvals.map((e: any) => new Date(e.submitted_at)),
              ...oneLinerDecisions
                .map((ol) => (ol.decided_at ? new Date(ol.decided_at) : null))
                .filter((d): d is Date => d !== null && !isNaN(d.getTime())),
            ];

            let avgTimeSpent = 0;
            if (allDates.length >= 2) {
              const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
              const firstDate = sortedDates[0];
              const lastDate = sortedDates[sortedDates.length - 1];
              const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
              const totalHoursActive = diffTime / (1000 * 60 * 60); // Convert to hours
              // Average hours per evaluation
              avgTimeSpent =
                totalEvaluations > 0
                  ? parseFloat((totalHoursActive / totalEvaluations).toFixed(1))
                  : 0;
            }

            return {
              id: evaluator.id,
              name: evaluator.name,
              email: evaluator.email,
              oneLinerCount: oneLinerDecisions.length,
              episodicEvals: epEvals.length,
              callReportEvals: crEvals.length,
              totalEvaluations,
              avgTimeSpent,
            };
          });

          logger.info(`Retrieved stats for ${stats.length} evaluators`);
          return stats;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get all evaluator stats');
    }
  }

  /**
   * Get evaluator workload (for workload balance chart)
   *
   * @returns Array of evaluator workload data
   */
  async getEvaluatorWorkloads(): Promise<EvaluatorWorkload[]> {
    try {
      logger.info('Getting evaluator workloads');

      return await this.withCache(
        'analytics:evaluator-workloads',
        async () => {
          // Get all active evaluators
          const evaluators = await this.userRepo.getActiveEvaluators({
            select: 'id, name',
          });

          if (evaluators.length === 0) {
            return [];
          }

          // Get all assignments
          const assignments = await this.assignmentRepo.findAll({
            select: 'evaluator_id, status',
          });

          // Calculate workload for each evaluator
          const workloads: EvaluatorWorkload[] = evaluators.map((evaluator) => {
            const evalAssignments =
              assignments.filter((a: any) => a.evaluator_id === evaluator.id) || [];

            const completed = evalAssignments.filter(
              (a: any) => a.status === 'completed'
            ).length;
            const inProgress = evalAssignments.filter(
              (a: any) => a.status === 'in_progress'
            ).length;
            const pending = evalAssignments.filter(
              (a: any) => a.status === 'pending'
            ).length;

            return {
              evaluatorId: evaluator.id,
              evaluatorName: evaluator.name,
              completed,
              inProgress,
              pending,
              total: completed + inProgress + pending,
            };
          });

          logger.info(`Retrieved workloads for ${workloads.length} evaluators`);
          return workloads;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get evaluator workloads');
    }
  }

  /**
   * Get evaluator activity heat map data (last 12 weeks)
   *
   * @returns Array of evaluator activity data
   */
  async getEvaluatorActivityHeatmap(): Promise<EvaluatorActivity[]> {
    try {
      logger.info('Getting evaluator activity heatmap');

      return await this.withCache(
        'analytics:evaluator-activity-heatmap',
        async () => {
          // Get all active evaluators
          const evaluators = await this.userRepo.getActiveEvaluators({
            select: 'id, name',
          });

          if (evaluators.length === 0) {
            return [];
          }

          // Get evaluations from last 12 weeks
          const twelveWeeksAgo = new Date();
          twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

          // Get call report evaluations
          const callReportEvals = await this.evaluationRepo.findAll({
            select: 'evaluator_id, created_at',
          });

          const recentCREvals = callReportEvals.filter(
            (e: any) => new Date(e.created_at) >= twelveWeeksAgo
          );

          // Get episodic evaluations
          const episodicEvals = await this.episodicEvalRepo.findAll({
            select: 'evaluator_id, submitted_at',
          });

          const recentEpEvals = episodicEvals.filter(
            (e: any) => new Date(e.submitted_at) >= twelveWeeksAgo
          );

          // Generate heatmap for each evaluator
          const activities: EvaluatorActivity[] = evaluators.map((evaluator) => {
            const crEvals =
              recentCREvals.filter((e: any) => e.evaluator_id === evaluator.id) || [];
            const epEvals =
              recentEpEvals.filter((e: any) => e.evaluator_id === evaluator.id) || [];

            // Group by week
            const weeklyData: { [key: string]: number } = {};

            [...crEvals, ...epEvals].forEach((evaluation: any) => {
              const date = new Date(
                evaluation.created_at || evaluation.submitted_at
              );
              // Get Monday of the week
              const monday = new Date(date);
              monday.setDate(date.getDate() - date.getDay() + 1);
              const weekKey = monday.toISOString().split('T')[0];

              weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
            });

            // Generate last 12 weeks
            const weeklyActivity = [];
            for (let i = 11; i >= 0; i--) {
              const weekStart = new Date();
              weekStart.setDate(
                weekStart.getDate() - (weekStart.getDay() - 1) - i * 7
              );
              const weekKey = weekStart.toISOString().split('T')[0];

              weeklyActivity.push({
                weekStart: weekKey,
                count: weeklyData[weekKey] || 0,
              });
            }

            return {
              evaluatorId: evaluator.id,
              evaluatorName: evaluator.name,
              weeklyActivity,
            };
          });

          logger.info(`Retrieved activity heatmap for ${activities.length} evaluators`);
          return activities;
        },
        600 // 10 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get evaluator activity heatmap');
    }
  }

  /**
   * Get evaluator performance data
   *
   * @param limit - Number of evaluators to return (default: 10)
   * @returns Array of evaluator statistics
   */
  async getTopPerformers(limit: number = 10): Promise<EvaluatorStats[]> {
    try {
      logger.info(`Getting evaluator performance data (limit: ${limit})`);

      const allStats = await this.getAllEvaluatorStats();
      const sorted = allStats.sort((a, b) => b.totalEvaluations - a.totalEvaluations);

      return sorted.slice(0, limit);
    } catch (error) {
      this.handleError(error, `get top ${limit} performers`);
    }
  }

  /**
   * Get evaluator by ID
   *
   * @param evaluatorId - Evaluator ID
   * @returns Evaluator statistics or null
   */
  async getEvaluatorById(evaluatorId: string): Promise<EvaluatorStats | null> {
    try {
      logger.info(`Getting evaluator stats for: ${evaluatorId}`);

      const allStats = await this.getAllEvaluatorStats();
      return allStats.find((s) => s.id === evaluatorId) || null;
    } catch (error) {
      this.handleError(error, `get evaluator by ID ${evaluatorId}`);
    }
  }

  /**
   * Invalidate cache when evaluator data changes
   */
  async invalidateEvaluatorCache(): Promise<void> {
    await this.invalidateCache('analytics:evaluator-overview');
    await this.invalidateCache('analytics:evaluator-workloads');
    await this.invalidateCache('analytics:evaluator-activity-heatmap');
    // Note: evaluator-stats cache keys are dynamic based on dates
    logger.info('Evaluator cache invalidated');
  }
}

/**
 * Helper function to create an EvaluatorAnalyticsService instance
 */
export function createEvaluatorAnalyticsService(
  context: RepositoryContextType = 'server'
): EvaluatorAnalyticsService {
  return new EvaluatorAnalyticsService(context);
}
