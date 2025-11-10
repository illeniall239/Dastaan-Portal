/**
 * CallReport Repository
 *
 * Handles all database operations for call reports (Writer Engagement Reports).
 *
 * Usage:
 * ```typescript
 * // In API route
 * const repo = new CallReportRepository('server');
 * const report = await repo.findByCallReportId('CR-2025-0001');
 *
 * // Get pending evaluations
 * const pending = await repo.findPendingEvaluations();
 *
 * // Update evaluation progress
 * await repo.updateEvaluationProgress(reportId, { completed: 5, average: 8.2 });
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';
import type { CallReport, EvaluationStatus } from '@/types';

/**
 * Call report search filters
 */
export interface CallReportSearchFilters {
  status?: string | string[];
  evaluation_status?: EvaluationStatus | EvaluationStatus[];
  created_by?: string;
  writer_name?: string;
  genre?: string;
  query?: string; // Search across working_title, writer_name, logline
}

/**
 * Evaluation progress update data
 */
export interface EvaluationProgressUpdate {
  completed_evaluations?: number;
  completed_internal_evaluations?: number;
  completed_external_evaluations?: number;
  current_average_score?: number;
  evaluation_status?: EvaluationStatus;
}

/**
 * Call report statistics
 */
export interface CallReportStatistics {
  total: number;
  by_status: Record<string, number>;
  by_evaluation_status: Record<string, number>;
  average_score: number;
  pending_evaluations: number;
  overdue_evaluations: number;
}

/**
 * CallReport repository for managing call report data
 */
export class CallReportRepository extends BaseRepository<CallReport> {
  constructor(context: RepositoryContextType = 'server') {
    super('call_reports', context);
  }

  /**
   * Find call report by call_report_id (CR-YYYY-NNNN)
   *
   * @param callReportId - Call report ID (e.g., 'CR-2025-0001')
   * @returns CallReport or null if not found
   */
  async findByCallReportId(callReportId: string): Promise<CallReport | null> {
    try {
      logger.info(`Finding call report by ID: ${callReportId}`);

      return await this.findOne({ call_report_id: callReportId });
    } catch (error) {
      logger.error(`Failed to find call report: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all call reports by status
   *
   * @param status - Status or array of statuses
   * @param options - Query options
   * @returns Array of call reports
   */
  async findByStatus(status: string | string[], options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Finding call reports by status`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          status,
        },
      });
    } catch (error) {
      logger.error(`Failed to find call reports by status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all call reports by evaluation status
   *
   * @param evaluationStatus - Evaluation status or array of statuses
   * @param options - Query options
   * @returns Array of call reports
   */
  async findByEvaluationStatus(
    evaluationStatus: EvaluationStatus | EvaluationStatus[],
    options?: QueryOptions
  ): Promise<CallReport[]> {
    try {
      logger.info(`Finding call reports by evaluation status`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          evaluation_status: evaluationStatus,
        },
      });
    } catch (error) {
      logger.error(`Failed to find call reports by evaluation status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find call reports created by specific user
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of call reports
   */
  async findByCreator(userId: string, options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Finding call reports by creator: ${userId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          created_by: userId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find call reports by creator: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find call reports by writer name
   *
   * @param writerName - Writer name (case-insensitive partial match)
   * @param options - Query options
   * @returns Array of call reports
   */
  async findByWriterName(writerName: string, options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Finding call reports by writer name: ${writerName}`);

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .ilike('writer_name', `%${writerName}%`);

      // Apply additional filters
      if (options?.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      }

      // Apply pagination
      if (options?.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found call reports by writer name`);
      return (data as unknown as CallReport[]) || [];
    } catch (error) {
      logger.error(`Failed to find call reports by writer: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find call reports by genre
   *
   * @param genre - Genre name
   * @param options - Query options
   * @returns Array of call reports
   */
  async findByGenre(genre: string, options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Finding call reports by genre: ${genre}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          genre,
        },
      });
    } catch (error) {
      logger.error(`Failed to find call reports by genre: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search call reports across multiple fields
   *
   * @param query - Search query
   * @param options - Query options
   * @returns Array of matching call reports
   */
  async search(query: string, options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Searching call reports: ${query}`);

      const client = await this.getClient();
      let dbQuery = client
        .from(this.tableName)
        .select(options?.select || '*')
        .or(`working_title.ilike.%${query}%,writer_name.ilike.%${query}%,logline.ilike.%${query}%`);

      // Apply additional filters
      if (options?.filters) {
        dbQuery = this.buildQuery(dbQuery, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        dbQuery = this.applyOrdering(dbQuery, options.order);
      }

      // Apply pagination
      if (options?.pagination) {
        dbQuery = this.applyPagination(dbQuery, options.pagination);
      }

      const { data, error } = await dbQuery;

      if (error) this.handleError(error);

      logger.info(`Search completed`);
      return (data as unknown as CallReport[]) || [];
    } catch (error) {
      logger.error(`Failed to search call reports: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find call reports with complex filters
   *
   * @param filters - Search filters
   * @param options - Query options
   * @returns Array of matching call reports
   */
  async searchWithFilters(
    filters: CallReportSearchFilters,
    options?: QueryOptions
  ): Promise<CallReport[]> {
    try {
      logger.info(`Searching call reports with filters`);

      const queryFilters: any = { ...options?.filters };

      // Add status filter
      if (filters.status) {
        queryFilters.status = filters.status;
      }

      // Add evaluation status filter
      if (filters.evaluation_status) {
        queryFilters.evaluation_status = filters.evaluation_status;
      }

      // Add creator filter
      if (filters.created_by) {
        queryFilters.created_by = filters.created_by;
      }

      // Add genre filter
      if (filters.genre) {
        queryFilters.genre = filters.genre;
      }

      // If query is provided, use full-text search
      if (filters.query) {
        return await this.search(filters.query, {
          ...options,
          filters: queryFilters,
        });
      }

      // If writer name filter, use writer name search
      if (filters.writer_name) {
        return await this.findByWriterName(filters.writer_name, {
          ...options,
          filters: queryFilters,
        });
      }

      // Otherwise use regular findAll
      return await this.findAll({
        ...options,
        filters: queryFilters,
      });
    } catch (error) {
      logger.error(`Failed to search with filters: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find pending call reports (ready for evaluation)
   *
   * @param options - Query options
   * @returns Array of call reports ready for evaluation
   */
  async findPendingEvaluations(options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Finding pending evaluations`);

      return await this.findByStatus('ready_for_evaluation', {
        ...options,
        order: options?.order || { column: 'created_at', ascending: true },
      });
    } catch (error) {
      logger.error(`Failed to find pending evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find overdue call reports (past evaluation deadline)
   *
   * @param options - Query options
   * @returns Array of overdue call reports
   */
  async findOverdueEvaluations(options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Finding overdue evaluations`);

      const now = new Date().toISOString();
      const client = await this.getClient();

      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .eq('status', 'ready_for_evaluation')
        .lt('evaluation_deadline', now);

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      } else {
        query = query.order('evaluation_deadline', { ascending: true });
      }

      // Apply pagination
      if (options?.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found overdue evaluations`);
      return (data as unknown as CallReport[]) || [];
    } catch (error) {
      logger.error(`Failed to find overdue evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update evaluation progress
   *
   * @param callReportId - Call report ID
   * @param progress - Progress update data
   * @returns Updated call report
   */
  async updateEvaluationProgress(
    callReportId: string,
    progress: EvaluationProgressUpdate
  ): Promise<CallReport> {
    try {
      logger.info(`Updating evaluation progress: ${callReportId}`);

      return await this.update(callReportId, {
        ...progress,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Failed to update evaluation progress: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update call report status
   *
   * @param callReportId - Call report ID
   * @param status - New status
   * @returns Updated call report
   */
  async updateStatus(callReportId: string, status: string): Promise<CallReport> {
    try {
      logger.info(`Updating call report status: ${callReportId} to ${status}`);

      return await this.update(callReportId, {
        status,
        updated_at: new Date().toISOString(),
      } as unknown as Partial<CallReport>);
    } catch (error) {
      logger.error(`Failed to update call report status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Archive call report (soft delete)
   *
   * @param callReportId - Call report ID
   * @param reason - Rejection reason
   * @returns Updated call report
   */
  async archive(callReportId: string, reason: string): Promise<CallReport> {
    try {
      logger.info(`Archiving call report: ${callReportId}`);

      return await this.update(callReportId, {
        status: 'archived',
        rejection_reason: reason,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Partial<CallReport>);
    } catch (error) {
      logger.error(`Failed to archive call report: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get call report statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<CallReportStatistics> {
    try {
      logger.info(`Calculating call report statistics`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('status, evaluation_status, current_average_score, evaluation_deadline');

      if (error) this.handleError(error);

      const now = new Date();
      const stats: CallReportStatistics = {
        total: data?.length || 0,
        by_status: {},
        by_evaluation_status: {},
        average_score: 0,
        pending_evaluations: 0,
        overdue_evaluations: 0,
      };

      let totalScore = 0;
      let countWithScore = 0;

      for (const row of data || []) {
        // Count by status
        if (row.status) {
          stats.by_status[row.status] = (stats.by_status[row.status] || 0) + 1;
        }

        // Count by evaluation status
        if (row.evaluation_status) {
          stats.by_evaluation_status[row.evaluation_status] =
            (stats.by_evaluation_status[row.evaluation_status] || 0) + 1;
        }

        // Calculate average score
        if (row.current_average_score) {
          totalScore += row.current_average_score;
          countWithScore++;
        }

        // Count pending evaluations
        if (row.status === 'ready_for_evaluation') {
          stats.pending_evaluations++;
        }

        // Count overdue evaluations
        if (row.evaluation_deadline && new Date(row.evaluation_deadline) < now) {
          stats.overdue_evaluations++;
        }
      }

      stats.average_score = countWithScore > 0 ? totalScore / countWithScore : 0;

      logger.info(`Statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find call reports by story ID
   *
   * @param storyId - Story ID
   * @param options - Query options
   * @returns Array of call reports
   */
  async findByStoryId(storyId: string, options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Finding call reports by story ID: ${storyId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          story_id: storyId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find call reports by story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count call reports by status
   *
   * @returns Object with status counts
   */
  async countByStatus(): Promise<Record<string, number>> {
    try {
      logger.info(`Counting call reports by status`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('status');

      if (error) this.handleError(error);

      const counts: Record<string, number> = {};

      for (const row of data || []) {
        if (row.status) {
          counts[row.status] = (counts[row.status] || 0) + 1;
        }
      }

      logger.info(`Counted call reports by status`);
      return counts;
    } catch (error) {
      logger.error(`Failed to count by status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find call reports with low evaluation progress
   *
   * @param threshold - Minimum completion percentage (0-1)
   * @param options - Query options
   * @returns Array of call reports
   */
  async findLowProgress(threshold: number = 0.5, options?: QueryOptions): Promise<CallReport[]> {
    try {
      logger.info(`Finding call reports with low progress`);

      const client = await this.getClient();

      // Get all ready_for_evaluation reports
      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .eq('status', 'ready_for_evaluation');

      const { data, error } = await query;

      if (error) this.handleError(error);

      // Filter by completion percentage in memory
      const lowProgress = (data || []).filter((report: any) => {
        const required = report.required_evaluations || 20;
        const completed = report.completed_evaluations || 0;
        return completed / required < threshold;
      });

      logger.info(`Found low progress call reports`);
      return lowProgress as unknown as CallReport[];
    } catch (error) {
      logger.error(`Failed to find low progress reports: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create a CallReportRepository instance
 *
 * @param context - Repository context
 * @returns CallReportRepository instance
 */
export function createCallReportRepository(context: RepositoryContextType = 'server'): CallReportRepository {
  return new CallReportRepository(context);
}
