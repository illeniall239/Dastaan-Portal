/**
 * EvaluatorAssignment Repository
 *
 * Handles all database operations for evaluator assignments.
 * Manages the assignment of evaluators to call reports for evaluation.
 *
 * Usage:
 * ```typescript
 * const repo = new EvaluatorAssignmentRepository('server');
 *
 * // Assign evaluators to a call report
 * await repo.assignEvaluators(callReportId, [eval1Id, eval2Id], 'internal');
 *
 * // Get evaluator's assignments
 * const assignments = await repo.findByEvaluator(evaluatorId);
 *
 * // Check if evaluator is assigned
 * const isAssigned = await repo.isAssigned(callReportId, evaluatorId);
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';
import type { EvaluatorAssignment, EvaluatorType } from '@/types';

/**
 * Assignment creation data
 */
export interface AssignmentCreateData {
  call_report_id: string;
  evaluator_id: string;
  evaluator_type: EvaluatorType;
  status?: 'pending' | 'in_progress' | 'completed' | 'expired_after_deadline';
}

/**
 * Assignment search filters
 */
export interface AssignmentSearchFilters {
  call_report_id?: string;
  evaluator_id?: string;
  evaluator_type?: EvaluatorType;
  status?: string | string[];
}

/**
 * Assignment statistics
 */
export interface AssignmentStatistics {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  pending: number;
  completed: number;
  expired: number;
}

/**
 * EvaluatorAssignment repository for managing assignment data
 */
export class EvaluatorAssignmentRepository extends BaseRepository<EvaluatorAssignment> {
  constructor(context: RepositoryContextType = 'server') {
    super('evaluator_assignments', context);
  }

  /**
   * Assign evaluator to a call report
   *
   * @param data - Assignment creation data
   * @returns Created assignment
   */
  async assignEvaluator(data: AssignmentCreateData): Promise<EvaluatorAssignment> {
    try {
      logger.info(`Assigning evaluator ${data.evaluator_id} to call report ${data.call_report_id}`);

      // Check if already assigned
      const existing = await this.findOne({
        call_report_id: data.call_report_id,
        evaluator_id: data.evaluator_id,
      });

      if (existing) {
        logger.info(`Evaluator already assigned, returning existing assignment`);
        return existing;
      }

      const assignment = await this.create({
        ...data,
        status: data.status || 'pending',
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      } as unknown as Partial<EvaluatorAssignment>);

      logger.info(`Evaluator assigned: ${assignment.id}`);
      return assignment;
    } catch (error) {
      logger.error(`Failed to assign evaluator: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Assign multiple evaluators to a call report
   *
   * @param callReportId - Call report ID
   * @param evaluatorIds - Array of evaluator IDs
   * @param evaluatorType - Type of evaluators (internal/external)
   * @returns Array of created assignments
   */
  async assignEvaluators(
    callReportId: string,
    evaluatorIds: string[],
    evaluatorType: EvaluatorType
  ): Promise<EvaluatorAssignment[]> {
    try {
      logger.info(`Assigning ${evaluatorIds.length} ${evaluatorType} evaluators to call report ${callReportId}`);

      const assignments: EvaluatorAssignment[] = [];

      for (const evaluatorId of evaluatorIds) {
        const assignment = await this.assignEvaluator({
          call_report_id: callReportId,
          evaluator_id: evaluatorId,
          evaluator_type: evaluatorType,
        });
        assignments.push(assignment);
      }

      logger.info(`Assigned ${assignments.length} evaluators`);
      return assignments;
    } catch (error) {
      logger.error(`Failed to assign evaluators: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all assignments for a call report
   *
   * @param callReportId - Call report ID
   * @param options - Query options
   * @returns Array of assignments
   */
  async findByCallReportId(callReportId: string, options?: QueryOptions): Promise<EvaluatorAssignment[]> {
    try {
      logger.info(`Finding assignments for call report: ${callReportId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          call_report_id: callReportId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find assignments by call report: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all assignments for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @param options - Query options
   * @returns Array of assignments
   */
  async findByEvaluator(evaluatorId: string, options?: QueryOptions): Promise<EvaluatorAssignment[]> {
    try {
      logger.info(`Finding assignments for evaluator: ${evaluatorId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          evaluator_id: evaluatorId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find assignments by evaluator: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find pending assignments for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @param options - Query options
   * @returns Array of pending assignments
   */
  async findPendingByEvaluator(evaluatorId: string, options?: QueryOptions): Promise<EvaluatorAssignment[]> {
    try {
      logger.info(`Finding pending assignments for evaluator: ${evaluatorId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          evaluator_id: evaluatorId,
          status: 'pending',
        },
      });
    } catch (error) {
      logger.error(`Failed to find pending assignments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find completed assignments for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @param options - Query options
   * @returns Array of completed assignments
   */
  async findCompletedByEvaluator(evaluatorId: string, options?: QueryOptions): Promise<EvaluatorAssignment[]> {
    try {
      logger.info(`Finding completed assignments for evaluator: ${evaluatorId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          evaluator_id: evaluatorId,
          status: 'completed',
        },
      });
    } catch (error) {
      logger.error(`Failed to find completed assignments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if evaluator is assigned to a call report
   *
   * @param callReportId - Call report ID
   * @param evaluatorId - Evaluator ID
   * @returns True if assigned
   */
  async isAssigned(callReportId: string, evaluatorId: string): Promise<boolean> {
    try {
      logger.info(`Checking if evaluator is assigned to call report`);

      const assignment = await this.findOne({
        call_report_id: callReportId,
        evaluator_id: evaluatorId,
      });

      return assignment !== null;
    } catch (error) {
      logger.error(`Failed to check assignment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get assignment for call report and evaluator
   *
   * @param callReportId - Call report ID
   * @param evaluatorId - Evaluator ID
   * @returns Assignment or null
   */
  async findByCallReportAndEvaluator(
    callReportId: string,
    evaluatorId: string
  ): Promise<EvaluatorAssignment | null> {
    try {
      logger.info(`Finding assignment for call report and evaluator`);

      return await this.findOne({
        call_report_id: callReportId,
        evaluator_id: evaluatorId,
      });
    } catch (error) {
      logger.error(`Failed to find assignment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update assignment status
   *
   * @param assignmentId - Assignment ID
   * @param status - New status
   * @returns Updated assignment
   */
  async updateStatus(
    assignmentId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'expired_after_deadline'
  ): Promise<EvaluatorAssignment> {
    try {
      logger.info(`Updating assignment status: ${assignmentId} to ${status}`);

      const updateData: any = {
        status,
      };

      // Set completed_at timestamp if status is completed
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      return await this.update(assignmentId, updateData as unknown as Partial<EvaluatorAssignment>);
    } catch (error) {
      logger.error(`Failed to update assignment status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark assignment as completed
   *
   * @param assignmentId - Assignment ID
   * @returns Updated assignment
   */
  async markCompleted(assignmentId: string): Promise<EvaluatorAssignment> {
    try {
      return await this.updateStatus(assignmentId, 'completed');
    } catch (error) {
      logger.error(`Failed to mark assignment completed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark assignment as in progress
   *
   * @param assignmentId - Assignment ID
   * @returns Updated assignment
   */
  async markInProgress(assignmentId: string): Promise<EvaluatorAssignment> {
    try {
      return await this.updateStatus(assignmentId, 'in_progress');
    } catch (error) {
      logger.error(`Failed to mark assignment in progress: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark assignments as expired after deadline
   *
   * @param assignmentIds - Array of assignment IDs
   * @returns Number of assignments updated
   */
  async markExpired(assignmentIds: string[]): Promise<number> {
    try {
      logger.info(`Marking ${assignmentIds.length} assignments as expired`);

      const assignments = await this.updateMany(
        { id: assignmentIds },
        { status: 'expired_after_deadline' } as unknown as Partial<EvaluatorAssignment>
      );

      logger.info(`Marked ${assignments.length} assignments as expired`);
      return assignments.length;
    } catch (error) {
      logger.error(`Failed to mark assignments expired: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count assignments by type for a call report
   *
   * @param callReportId - Call report ID
   * @returns Object with internal and external counts
   */
  async countByType(callReportId: string): Promise<{ internal: number; external: number }> {
    try {
      logger.info(`Counting assignments by type for call report: ${callReportId}`);

      const assignments = await this.findByCallReportId(callReportId);

      const counts = {
        internal: 0,
        external: 0,
      };

      for (const assignment of assignments) {
        if (assignment.evaluator_type === 'internal') {
          counts.internal++;
        } else if (assignment.evaluator_type === 'external') {
          counts.external++;
        }
      }

      logger.info(`Counted assignments by type`);
      return counts;
    } catch (error) {
      logger.error(`Failed to count by type: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count completed assignments by type for a call report
   *
   * @param callReportId - Call report ID
   * @returns Object with completed internal and external counts
   */
  async countCompletedByType(callReportId: string): Promise<{ internal: number; external: number }> {
    try {
      logger.info(`Counting completed assignments by type for call report: ${callReportId}`);

      const assignments = await this.findByCallReportId(callReportId, {
        filters: { status: 'completed' },
      });

      const counts = {
        internal: 0,
        external: 0,
      };

      for (const assignment of assignments) {
        if (assignment.evaluator_type === 'internal') {
          counts.internal++;
        } else if (assignment.evaluator_type === 'external') {
          counts.external++;
        }
      }

      logger.info(`Counted completed assignments by type`);
      return counts;
    } catch (error) {
      logger.error(`Failed to count completed by type: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Remove assignment
   *
   * @param assignmentId - Assignment ID
   */
  async removeAssignment(assignmentId: string): Promise<void> {
    try {
      logger.info(`Removing assignment: ${assignmentId}`);
      await this.delete(assignmentId);
      logger.info(`Assignment removed: ${assignmentId}`);
    } catch (error) {
      logger.error(`Failed to remove assignment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Remove all assignments for a call report
   *
   * @param callReportId - Call report ID
   * @returns Number of assignments removed
   */
  async removeAllByCallReport(callReportId: string): Promise<number> {
    try {
      logger.info(`Removing all assignments for call report: ${callReportId}`);

      const count = await this.deleteMany({ call_report_id: callReportId });

      logger.info(`Removed ${count} assignments`);
      return count;
    } catch (error) {
      logger.error(`Failed to remove assignments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search assignments with complex filters
   *
   * @param filters - Search filters
   * @param options - Query options
   * @returns Array of matching assignments
   */
  async searchWithFilters(
    filters: AssignmentSearchFilters,
    options?: QueryOptions
  ): Promise<EvaluatorAssignment[]> {
    try {
      logger.info(`Searching assignments with filters`);

      const queryFilters: any = { ...options?.filters };

      if (filters.call_report_id) {
        queryFilters.call_report_id = filters.call_report_id;
      }

      if (filters.evaluator_id) {
        queryFilters.evaluator_id = filters.evaluator_id;
      }

      if (filters.evaluator_type) {
        queryFilters.evaluator_type = filters.evaluator_type;
      }

      if (filters.status) {
        queryFilters.status = filters.status;
      }

      return await this.findAll({
        ...options,
        filters: queryFilters,
      });
    } catch (error) {
      logger.error(`Failed to search assignments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get assignment statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<AssignmentStatistics> {
    try {
      logger.info(`Calculating assignment statistics`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('status, evaluator_type');

      if (error) this.handleError(error);

      const stats: AssignmentStatistics = {
        total: data?.length || 0,
        by_status: {},
        by_type: {},
        pending: 0,
        completed: 0,
        expired: 0,
      };

      for (const row of data || []) {
        // Count by status
        if (row.status) {
          stats.by_status[row.status] = (stats.by_status[row.status] || 0) + 1;

          if (row.status === 'pending') stats.pending++;
          if (row.status === 'completed') stats.completed++;
          if (row.status === 'expired_after_deadline') stats.expired++;
        }

        // Count by type
        if (row.evaluator_type) {
          stats.by_type[row.evaluator_type] = (stats.by_type[row.evaluator_type] || 0) + 1;
        }
      }

      logger.info(`Statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create an EvaluatorAssignmentRepository instance
 *
 * @param context - Repository context
 * @returns EvaluatorAssignmentRepository instance
 */
export function createEvaluatorAssignmentRepository(
  context: RepositoryContextType = 'server'
): EvaluatorAssignmentRepository {
  return new EvaluatorAssignmentRepository(context);
}
