/**
 * Evaluation Service
 *
 * Business logic layer for evaluation operations.
 * Orchestrates evaluations, assignments, and progress tracking.
 *
 * Usage:
 * ```typescript
 * const service = new EvaluationService('server');
 *
 * // Assign evaluators to call report
 * await service.assignEvaluators(callReportId, {
 *   internal: [eval1, eval2, eval3],
 *   external: [eval4, eval5]
 * });
 *
 * // Submit evaluation
 * await service.submitEvaluation({
 *   call_report_id: reportId,
 *   evaluator_id: evaluatorId,
 *   scores: { ... },
 *   comments: '...'
 * });
 * ```
 */

import {
  EvaluationRepository,
  type EvaluationCreateData,
  type CriteriaBreakdown,
} from '@/lib/repositories/evaluation-repository';
import {
  EvaluatorAssignmentRepository,
  type AssignmentCreateData,
} from '@/lib/repositories/evaluator-assignment-repository';
import { CallReportRepository } from '@/lib/repositories/call-report-repository';
import { UserRepository } from '@/lib/repositories/user-repository';
import { executeTransaction, type RepositoryContextType } from '@/lib/repositories/base';
import { logger } from '@/lib/logger';
import type { Evaluation } from '@/lib/repositories/evaluation-repository';

/**
 * Evaluator assignment data
 */
export interface EvaluatorAssignments {
  internal: string[]; // Array of internal evaluator IDs
  external: string[]; // Array of external evaluator IDs
}

/**
 * Evaluation submission data
 */
export interface EvaluationSubmissionData {
  call_report_id: string;
  evaluator_id: string;
  premise_conflict_score: number;
  storyline_plot_score: number;
  episodic_progression_score: number;
  characters_score: number;
  overall_assessment_score: number;
  comments: string;
}

/**
 * Evaluation progress data
 */
export interface EvaluationProgress {
  total_required: number;
  internal_required: number;
  external_required: number;
  total_completed: number;
  internal_completed: number;
  external_completed: number;
  total_assigned: number;
  internal_assigned: number;
  external_assigned: number;
  progress_percentage: number;
  average_score: number | null;
  is_complete: boolean;
}

/**
 * Evaluator performance metrics
 */
export interface EvaluatorPerformance {
  evaluator_id: string;
  total_assigned: number;
  total_completed: number;
  completion_rate: number;
  average_score: number;
  pending_count: number;
}

/**
 * Service error
 */
export class EvaluationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'EvaluationServiceError';
  }
}

/**
 * Evaluation service for managing evaluation business logic
 */
export class EvaluationService {
  private readonly evaluationRepo: EvaluationRepository;
  private readonly assignmentRepo: EvaluatorAssignmentRepository;
  private readonly callReportRepo: CallReportRepository;
  private readonly userRepo: UserRepository;
  private readonly context: RepositoryContextType;

  constructor(context: RepositoryContextType = 'server') {
    this.context = context;
    this.evaluationRepo = new EvaluationRepository(context);
    this.assignmentRepo = new EvaluatorAssignmentRepository(context);
    this.callReportRepo = new CallReportRepository(context);
    this.userRepo = new UserRepository(context);
  }

  /**
   * Assign evaluators to a call report
   *
   * @param callReportId - Call report ID
   * @param assignments - Evaluator assignments (internal/external)
   * @returns Object with assignment counts
   */
  async assignEvaluators(
    callReportId: string,
    assignments: EvaluatorAssignments
  ): Promise<{ internal: number; external: number }> {
    try {
      logger.info(`Assigning evaluators to call report: ${callReportId}`);

      // Validate call report exists
      const callReport = await this.callReportRepo.findById(callReportId);
      if (!callReport) {
        throw new EvaluationServiceError(
          'Call report not found',
          'CALL_REPORT_NOT_FOUND',
          { callReportId }
        );
      }

      // Validate evaluators exist
      const allEvaluatorIds = [...assignments.internal, ...assignments.external];
      const evaluators = await this.userRepo.findByIds(allEvaluatorIds);

      if (evaluators.length !== allEvaluatorIds.length) {
        throw new EvaluationServiceError(
          'One or more evaluators not found',
          'EVALUATORS_NOT_FOUND',
          { requested: allEvaluatorIds.length, found: evaluators.length }
        );
      }

      // Assign internal evaluators
      const internalAssignments = await this.assignmentRepo.assignEvaluators(
        callReportId,
        assignments.internal,
        'internal'
      );

      // Assign external evaluators
      const externalAssignments = await this.assignmentRepo.assignEvaluators(
        callReportId,
        assignments.external,
        'external'
      );

      logger.info(`Assigned evaluators: ${internalAssignments.length} internal, ${externalAssignments.length} external`);

      return {
        internal: internalAssignments.length,
        external: externalAssignments.length,
      };
    } catch (error) {
      if (error instanceof EvaluationServiceError) {
        throw error;
      }
      logger.error(`Failed to assign evaluators: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to assign evaluators',
        'ASSIGN_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Submit evaluation with automatic progress tracking
   *
   * @param data - Evaluation submission data
   * @returns Created evaluation
   */
  async submitEvaluation(data: EvaluationSubmissionData): Promise<Evaluation> {
    try {
      logger.info(`Submitting evaluation for call report: ${data.call_report_id}`);

      return await executeTransaction(async (tx) => {
        // Validate call report exists
        const callReport = await this.callReportRepo.findById(data.call_report_id);
        if (!callReport) {
          throw new EvaluationServiceError(
            'Call report not found',
            'CALL_REPORT_NOT_FOUND',
            { callReportId: data.call_report_id }
          );
        }

        // Check if evaluator is assigned
        const isAssigned = await this.assignmentRepo.isAssigned(data.call_report_id, data.evaluator_id);
        if (!isAssigned) {
          throw new EvaluationServiceError(
            'Evaluator is not assigned to this call report',
            'NOT_ASSIGNED',
            { evaluatorId: data.evaluator_id }
          );
        }

        // Check if already evaluated
        const hasEvaluated = await this.evaluationRepo.hasEvaluated(
          data.call_report_id,
          data.evaluator_id
        );
        if (hasEvaluated) {
          throw new EvaluationServiceError(
            'Evaluator has already submitted an evaluation',
            'ALREADY_EVALUATED',
            { evaluatorId: data.evaluator_id }
          );
        }

        // Get evaluator info
        const evaluator = await this.userRepo.findById(data.evaluator_id);

        // Create evaluation
        const evaluation = await tx.track(
          this.evaluationRepo.createEvaluation({
            ...data,
            evaluator_name: evaluator?.name,
            evaluator_email: evaluator?.email,
            status: 'submitted',
          }),
          (evaluation) => this.evaluationRepo.deleteEvaluation(evaluation.id)
        );

        // Update assignment status to completed
        const assignment = await this.assignmentRepo.findByCallReportAndEvaluator(
          data.call_report_id,
          data.evaluator_id
        );
        if (assignment) {
          await this.assignmentRepo.markCompleted(assignment.id);
        }

        // Update call report progress
        await this.updateCallReportProgress(data.call_report_id);

        logger.info(`Evaluation submitted: ${evaluation.id}`);
        return evaluation;
      });
    } catch (error) {
      if (error instanceof EvaluationServiceError) {
        throw error;
      }
      logger.error(`Failed to submit evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to submit evaluation',
        'SUBMIT_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Save evaluation draft
   *
   * @param data - Evaluation submission data
   * @returns Created/updated evaluation
   */
  async saveDraft(data: EvaluationSubmissionData): Promise<Evaluation> {
    try {
      logger.info(`Saving evaluation draft for call report: ${data.call_report_id}`);

      // Check if draft already exists
      const existing = await this.evaluationRepo.findByCallReportAndEvaluator(
        data.call_report_id,
        data.evaluator_id
      );

      // Get evaluator info
      const evaluator = await this.userRepo.findById(data.evaluator_id);

      if (existing) {
        // Update existing draft
        return await this.evaluationRepo.updateEvaluation(existing.id, {
          ...data,
          evaluator_name: evaluator?.name,
          evaluator_email: evaluator?.email,
          status: 'draft',
        });
      } else {
        // Create new draft
        return await this.evaluationRepo.createEvaluation({
          ...data,
          evaluator_name: evaluator?.name,
          evaluator_email: evaluator?.email,
          status: 'draft',
        });
      }
    } catch (error) {
      logger.error(`Failed to save draft: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to save draft',
        'SAVE_DRAFT_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update call report with current evaluation progress
   *
   * @param callReportId - Call report ID
   */
  private async updateCallReportProgress(callReportId: string): Promise<void> {
    try {
      // Get completed evaluations count by type
      const completedCounts = await this.assignmentRepo.countCompletedByType(callReportId);

      // Calculate average score
      const averageScore = await this.evaluationRepo.getAverageScore(callReportId);

      // Update call report
      await this.callReportRepo.updateEvaluationProgress(callReportId, {
        completed_evaluations: completedCounts.internal + completedCounts.external,
        completed_internal_evaluations: completedCounts.internal,
        completed_external_evaluations: completedCounts.external,
        current_average_score: averageScore ?? undefined,
      });

      logger.info(`Updated call report progress: ${callReportId}`);
    } catch (error) {
      logger.error(`Failed to update progress: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - this is a side effect
    }
  }

  /**
   * Get evaluation progress for a call report
   *
   * @param callReportId - Call report ID
   * @returns Progress data
   */
  async getEvaluationProgress(callReportId: string): Promise<EvaluationProgress> {
    try {
      logger.info(`Getting evaluation progress for call report: ${callReportId}`);

      const callReport = await this.callReportRepo.findById(callReportId);
      if (!callReport) {
        throw new EvaluationServiceError(
          'Call report not found',
          'CALL_REPORT_NOT_FOUND',
          { callReportId }
        );
      }

      const assignedCounts = await this.assignmentRepo.countByType(callReportId);
      const completedCounts = await this.assignmentRepo.countCompletedByType(callReportId);
      const averageScore = await this.evaluationRepo.getAverageScore(callReportId);

      const totalRequired = callReport.required_evaluations || 20;
      const internalRequired = callReport.required_internal_evaluators || 10;
      const externalRequired = callReport.required_external_evaluators || 10;
      const totalCompleted = completedCounts.internal + completedCounts.external;

      const progress: EvaluationProgress = {
        total_required: totalRequired,
        internal_required: internalRequired,
        external_required: externalRequired,
        total_completed: totalCompleted,
        internal_completed: completedCounts.internal,
        external_completed: completedCounts.external,
        total_assigned: assignedCounts.internal + assignedCounts.external,
        internal_assigned: assignedCounts.internal,
        external_assigned: assignedCounts.external,
        progress_percentage: Math.round((totalCompleted / totalRequired) * 100),
        average_score: averageScore,
        is_complete: totalCompleted >= totalRequired,
      };

      logger.info(`Progress calculated: ${progress.progress_percentage}%`);
      return progress;
    } catch (error) {
      if (error instanceof EvaluationServiceError) {
        throw error;
      }
      logger.error(`Failed to get progress: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to get evaluation progress',
        'GET_PROGRESS_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get criteria breakdown for a call report
   *
   * @param callReportId - Call report ID
   * @returns Criteria breakdown or null
   */
  async getCriteriaBreakdown(callReportId: string): Promise<CriteriaBreakdown | null> {
    try {
      return await this.evaluationRepo.getCriteriaBreakdown(callReportId);
    } catch (error) {
      logger.error(`Failed to get criteria breakdown: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to get criteria breakdown',
        'GET_BREAKDOWN_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get evaluations for a call report
   *
   * @param callReportId - Call report ID
   * @returns Array of evaluations
   */
  async getEvaluationsByCallReport(callReportId: string): Promise<Evaluation[]> {
    try {
      return await this.evaluationRepo.findByCallReportId(callReportId, {
        order: { column: 'submitted_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to get evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to get evaluations',
        'GET_EVALUATIONS_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get pending assignments for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @returns Array of pending call report IDs
   */
  async getPendingAssignments(evaluatorId: string): Promise<string[]> {
    try {
      const assignments = await this.assignmentRepo.findPendingByEvaluator(evaluatorId);
      return assignments.map(a => a.call_report_id);
    } catch (error) {
      logger.error(`Failed to get pending assignments: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to get pending assignments',
        'GET_PENDING_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get completed evaluations for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @returns Array of evaluations
   */
  async getEvaluatorCompletedEvaluations(evaluatorId: string): Promise<Evaluation[]> {
    try {
      return await this.evaluationRepo.findByEvaluator(evaluatorId, {
        filters: { status: 'submitted' },
        order: { column: 'submitted_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to get completed evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to get completed evaluations',
        'GET_COMPLETED_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get evaluator performance metrics
   *
   * @param evaluatorId - Evaluator ID
   * @returns Performance metrics
   */
  async getEvaluatorPerformance(evaluatorId: string): Promise<EvaluatorPerformance> {
    try {
      logger.info(`Calculating performance for evaluator: ${evaluatorId}`);

      const allAssignments = await this.assignmentRepo.findByEvaluator(evaluatorId);
      const completedAssignments = allAssignments.filter(a => a.status === 'completed');
      const pendingAssignments = allAssignments.filter(a => a.status === 'pending');

      const evaluations = await this.evaluationRepo.findByEvaluator(evaluatorId, {
        filters: { status: 'submitted' },
      });

      const totalScore = evaluations.reduce((sum, evaluation) => sum + evaluation.average_score, 0);
      const averageScore = evaluations.length > 0 ? totalScore / evaluations.length : 0;

      const performance: EvaluatorPerformance = {
        evaluator_id: evaluatorId,
        total_assigned: allAssignments.length,
        total_completed: completedAssignments.length,
        completion_rate:
          allAssignments.length > 0
            ? (completedAssignments.length / allAssignments.length) * 100
            : 0,
        average_score: Number(averageScore.toFixed(2)),
        pending_count: pendingAssignments.length,
      };

      logger.info(`Performance calculated for evaluator: ${evaluatorId}`);
      return performance;
    } catch (error) {
      logger.error(`Failed to get performance: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to get evaluator performance',
        'GET_PERFORMANCE_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Check if evaluator can evaluate a call report
   *
   * @param callReportId - Call report ID
   * @param evaluatorId - Evaluator ID
   * @returns True if evaluator can evaluate
   */
  async canEvaluate(callReportId: string, evaluatorId: string): Promise<boolean> {
    try {
      // Check if assigned
      const isAssigned = await this.assignmentRepo.isAssigned(callReportId, evaluatorId);
      if (!isAssigned) {
        return false;
      }

      // Check if already evaluated
      const hasEvaluated = await this.evaluationRepo.hasEvaluated(callReportId, evaluatorId);
      if (hasEvaluated) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to check can evaluate: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to check evaluation eligibility',
        'CHECK_ELIGIBILITY_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Remove evaluator assignment
   *
   * @param callReportId - Call report ID
   * @param evaluatorId - Evaluator ID
   */
  async removeAssignment(callReportId: string, evaluatorId: string): Promise<void> {
    try {
      logger.info(`Removing evaluator assignment: ${evaluatorId} from ${callReportId}`);

      const assignment = await this.assignmentRepo.findByCallReportAndEvaluator(
        callReportId,
        evaluatorId
      );

      if (assignment) {
        await this.assignmentRepo.removeAssignment(assignment.id);
        logger.info(`Assignment removed`);
      }
    } catch (error) {
      logger.error(`Failed to remove assignment: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to remove assignment',
        'REMOVE_ASSIGNMENT_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get evaluation draft for evaluator
   *
   * @param callReportId - Call report ID
   * @param evaluatorId - Evaluator ID
   * @returns Draft evaluation or null
   */
  async getDraft(callReportId: string, evaluatorId: string): Promise<Evaluation | null> {
    try {
      const evaluation = await this.evaluationRepo.findByCallReportAndEvaluator(
        callReportId,
        evaluatorId
      );

      return evaluation && evaluation.status === 'draft' ? evaluation : null;
    } catch (error) {
      logger.error(`Failed to get draft: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to get draft',
        'GET_DRAFT_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Delete evaluation (admin only)
   *
   * @param evaluationId - Evaluation ID
   * @param performedBy - ID of user performing the action
   */
  async deleteEvaluation(evaluationId: string, performedBy: string): Promise<void> {
    try {
      logger.info(`Deleting evaluation: ${evaluationId}`);

      // Validate user is admin
      const user = await this.userRepo.findById(performedBy);
      if (!user || user.role !== 'admin') {
        throw new EvaluationServiceError(
          'Only admins can delete evaluations',
          'PERMISSION_DENIED',
          { performedBy }
        );
      }

      // Get evaluation to update call report progress after deletion
      const evaluation = await this.evaluationRepo.findById(evaluationId);
      if (evaluation) {
        await this.evaluationRepo.deleteEvaluation(evaluationId);

        // Update call report progress
        await this.updateCallReportProgress(evaluation.call_report_id);

        logger.info(`Evaluation deleted: ${evaluationId}`);
      }
    } catch (error) {
      if (error instanceof EvaluationServiceError) {
        throw error;
      }
      logger.error(`Failed to delete evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw new EvaluationServiceError(
        'Failed to delete evaluation',
        'DELETE_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

/**
 * Helper function to create an EvaluationService instance
 *
 * @param context - Repository context
 * @returns EvaluationService instance
 */
export function createEvaluationService(context: RepositoryContextType = 'server'): EvaluationService {
  return new EvaluationService(context);
}
