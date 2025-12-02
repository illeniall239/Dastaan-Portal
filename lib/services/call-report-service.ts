/**
 * CallReport Service
 *
 * Business logic layer for call report (Writer Engagement Report) operations.
 * Orchestrates repositories, handles evaluation workflows, and enforces business rules.
 *
 * Usage:
 * ```typescript
 * const service = new CallReportService('server');
 *
 * // Create new call report with automatic deadline
 * const report = await service.createCallReport({
 *   story_id: 'story-123',
 *   writer_name: 'John Doe',
 *   working_title: 'The Story',
 *   ...
 * });
 *
 * // Update evaluation progress
 * await service.recordEvaluationCompletion(reportId, {
 *   completed: 5,
 *   internal: 3,
 *   external: 2,
 *   averageScore: 8.2
 * });
 * ```
 */

import { CallReportRepository, type CallReportSearchFilters } from '@/lib/repositories/call-report-repository';
import { UserRepository } from '@/lib/repositories/user-repository';
import { StoryRepository } from '@/lib/repositories/story-repository';
import { executeTransaction, type RepositoryContextType } from '@/lib/repositories/base';
import { logger } from '@/lib/logger';
import type { CallReport, EvaluationStatus } from '@/types';

/**
 * Call report creation data
 */
export interface CreateCallReportData {
  story_id: string;
  meeting_date: string;
  duration_minutes?: number;
  writer_name: string;
  contact_type: 'Direct' | 'Agent' | 'Production Company' | 'Other';
  contact_email: string;
  contact_phone?: string;
  contact_address?: string;
  working_title: string;
  logline: string;
  usp: string;
  genre: string[];
  meeting_notes: string;
  meeting_attendees: string[];
  next_steps?: string;
  overall_rating?: number;
  created_by: string;
}

/**
 * Call report update data
 */
export interface UpdateCallReportData {
  meeting_date?: string;
  duration_minutes?: number;
  writer_name?: string;
  contact_type?: 'Direct' | 'Agent' | 'Production Company' | 'Other';
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  working_title?: string;
  logline?: string;
  usp?: string;
  genre?: string[];
  meeting_notes?: string;
  meeting_attendees?: string[];
  next_steps?: string;
  overall_rating?: number;
  status?: string;
}

/**
 * Evaluation completion data
 */
export interface EvaluationCompletionData {
  completed: number;
  internal: number;
  external: number;
  averageScore: number;
}

/**
 * Call report search criteria
 */
export interface CallReportSearchCriteria extends CallReportSearchFilters {
  page?: number;
  limit?: number;
}

/**
 * Service error
 */
export class CallReportServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'CallReportServiceError';
  }
}

/**
 * CallReport service for managing call report business logic
 */
export class CallReportService {
  private readonly callReportRepo: CallReportRepository;
  private readonly userRepo: UserRepository;
  private readonly context: RepositoryContextType;

  // Configuration constants
  private readonly DEFAULT_REQUIRED_EVALUATIONS = 1;
  private readonly DEFAULT_REQUIRED_INTERNAL = 1;
  private readonly DEFAULT_REQUIRED_EXTERNAL = 0;
  private readonly EVALUATION_DEADLINE_DAYS = 5;
  private readonly MINIMUM_EVALUATIONS_FOR_DEADLINE = 1;

  constructor(context: RepositoryContextType = 'server') {
    this.context = context;
    this.callReportRepo = new CallReportRepository(context);
    this.userRepo = new UserRepository(context);
  }

  /**
   * Create new call report with automatic deadline calculation
   *
   * @param data - Call report creation data
   * @returns Created call report
   */
  async createCallReport(data: CreateCallReportData): Promise<CallReport> {
    try {
      logger.info(`Creating call report for writer: ${data.writer_name}`);

      // Validate creator exists
      const creator = await this.userRepo.findById(data.created_by);
      if (!creator) {
        throw new CallReportServiceError(
          'Creator user not found',
          'CREATOR_NOT_FOUND',
          { created_by: data.created_by }
        );
      }

      // Calculate evaluation deadline (5 days from creation)
      const evaluationDeadline = new Date();
      evaluationDeadline.setDate(evaluationDeadline.getDate() + this.EVALUATION_DEADLINE_DAYS);

      // Calculate end time if duration provided
      let endTime: string | undefined;
      if (data.duration_minutes) {
        const meetingDate = new Date(data.meeting_date);
        meetingDate.setMinutes(meetingDate.getMinutes() + data.duration_minutes);
        endTime = meetingDate.toISOString();
      }

      // Create call report
      const callReport = await this.callReportRepo.create({
        ...data,
        end_time: endTime,
        status: 'ready_for_evaluation',
        evaluation_status: 'pending',
        required_evaluations: this.DEFAULT_REQUIRED_EVALUATIONS,
        required_internal_evaluators: this.DEFAULT_REQUIRED_INTERNAL,
        required_external_evaluators: this.DEFAULT_REQUIRED_EXTERNAL,
        completed_evaluations: 0,
        completed_internal_evaluations: 0,
        completed_external_evaluations: 0,
        evaluation_deadline: evaluationDeadline.toISOString(),
        minimum_evaluations_for_deadline: this.MINIMUM_EVALUATIONS_FOR_DEADLINE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      logger.info(`Call report created: ${callReport.id}`);
      return callReport;
    } catch (error) {
      if (error instanceof CallReportServiceError) {
        throw error;
      }
      logger.error(`Failed to create call report: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to create call report',
        'CREATE_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get call report by ID
   *
   * @param callReportId - Call report ID
   * @returns Call report or null if not found
   */
  async getCallReportById(callReportId: string): Promise<CallReport | null> {
    try {
      return await this.callReportRepo.findById(callReportId);
    } catch (error) {
      logger.error(`Failed to get call report: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to retrieve call report',
        'GET_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get call report by call_report_id (CR-YYYY-NNNN)
   *
   * @param callReportId - Call report ID format (e.g., 'CR-2025-0001')
   * @returns Call report or null if not found
   */
  async getCallReportByCallReportId(callReportId: string): Promise<CallReport | null> {
    try {
      return await this.callReportRepo.findByCallReportId(callReportId);
    } catch (error) {
      logger.error(`Failed to get call report: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to retrieve call report',
        'GET_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update call report
   *
   * @param callReportId - Call report ID
   * @param data - Update data
   * @returns Updated call report
   */
  async updateCallReport(callReportId: string, data: UpdateCallReportData): Promise<CallReport> {
    try {
      logger.info(`Updating call report: ${callReportId}`);

      // Validate call report exists
      const existing = await this.callReportRepo.findById(callReportId);
      if (!existing) {
        throw new CallReportServiceError(
          'Call report not found',
          'NOT_FOUND',
          { callReportId }
        );
      }

      // Calculate end time if duration updated
      let endTime = existing.end_time;
      if (data.duration_minutes && (data.meeting_date || existing.meeting_date)) {
        const meetingDate = new Date(data.meeting_date || existing.meeting_date);
        meetingDate.setMinutes(meetingDate.getMinutes() + data.duration_minutes);
        endTime = meetingDate.toISOString();
      }

      // Update call report
      const updated = await this.callReportRepo.update(callReportId, {
        ...data,
        end_time: data.duration_minutes ? endTime : existing.end_time,
        updated_at: new Date().toISOString(),
      } as unknown as Partial<CallReport>);

      logger.info(`Call report updated: ${callReportId}`);
      return updated;
    } catch (error) {
      if (error instanceof CallReportServiceError) {
        throw error;
      }
      logger.error(`Failed to update call report: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to update call report',
        'UPDATE_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Submit call report for evaluation
   *
   * @param callReportId - Call report ID
   * @returns Updated call report
   */
  async submitForEvaluation(callReportId: string): Promise<CallReport> {
    try {
      logger.info(`Submitting call report for evaluation: ${callReportId}`);

      // Validate call report exists and is in draft
      const existing = await this.callReportRepo.findById(callReportId);
      if (!existing) {
        throw new CallReportServiceError(
          'Call report not found',
          'NOT_FOUND',
          { callReportId }
        );
      }

      if (existing.status !== 'draft') {
        throw new CallReportServiceError(
          'Call report must be in draft status to submit',
          'INVALID_STATUS',
          { currentStatus: existing.status }
        );
      }

      // Update status to ready for evaluation
      const updated = await this.callReportRepo.updateStatus(callReportId, 'ready_for_evaluation');

      logger.info(`Call report submitted for evaluation: ${callReportId}`);
      return updated;
    } catch (error) {
      if (error instanceof CallReportServiceError) {
        throw error;
      }
      logger.error(`Failed to submit for evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to submit for evaluation',
        'SUBMIT_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Record evaluation completion and update progress
   *
   * @param callReportId - Call report ID
   * @param completionData - Evaluation completion data
   * @returns Updated call report
   */
  async recordEvaluationCompletion(
    callReportId: string,
    completionData: EvaluationCompletionData
  ): Promise<CallReport> {
    try {
      logger.info(`Recording evaluation completion: ${callReportId}`);

      // Validate call report exists
      const existing = await this.callReportRepo.findById(callReportId);
      if (!existing) {
        throw new CallReportServiceError(
          'Call report not found',
          'NOT_FOUND',
          { callReportId }
        );
      }

      // Determine evaluation status
      const required = existing.required_evaluations || this.DEFAULT_REQUIRED_EVALUATIONS;
      const isComplete = completionData.completed >= required;

      let evaluationStatus: EvaluationStatus;
      if (isComplete) {
        evaluationStatus = 'completed';
      } else if (completionData.completed > 0) {
        evaluationStatus = 'in_progress';
      } else {
        evaluationStatus = 'pending';
      }

      // Update evaluation progress
      const updated = await this.callReportRepo.updateEvaluationProgress(callReportId, {
        completed_evaluations: completionData.completed,
        completed_internal_evaluations: completionData.internal,
        completed_external_evaluations: completionData.external,
        current_average_score: completionData.averageScore,
        evaluation_status: evaluationStatus,
      });

      // If evaluation is complete, update status
      if (isComplete) {
        await this.callReportRepo.updateStatus(callReportId, 'in_review');
      }

      logger.info(`Evaluation progress recorded: ${callReportId} (${completionData.completed}/${required})`);
      return updated;
    } catch (error) {
      if (error instanceof CallReportServiceError) {
        throw error;
      }
      logger.error(`Failed to record evaluation completion: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to record evaluation completion',
        'RECORD_COMPLETION_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Archive call report with rejection reason
   *
   * @param callReportId - Call report ID
   * @param reason - Rejection reason
   * @returns Updated call report
   */
  async archiveCallReport(callReportId: string, reason: string): Promise<CallReport> {
    try {
      logger.info(`Archiving call report: ${callReportId}`);

      // Validate call report exists
      const existing = await this.callReportRepo.findById(callReportId);
      if (!existing) {
        throw new CallReportServiceError(
          'Call report not found',
          'NOT_FOUND',
          { callReportId }
        );
      }

      // Archive call report
      const archived = await this.callReportRepo.archive(callReportId, reason);

      logger.info(`Call report archived: ${callReportId}`);
      return archived;
    } catch (error) {
      if (error instanceof CallReportServiceError) {
        throw error;
      }
      logger.error(`Failed to archive call report: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to archive call report',
        'ARCHIVE_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Search call reports with filters
   *
   * @param criteria - Search criteria
   * @returns Matching call reports
   */
  async searchCallReports(criteria: CallReportSearchCriteria): Promise<CallReport[]> {
    try {
      logger.info(`Searching call reports`);

      return await this.callReportRepo.searchWithFilters(
        {
          query: criteria.query,
          status: criteria.status,
          evaluation_status: criteria.evaluation_status,
          created_by: criteria.created_by,
          writer_name: criteria.writer_name,
          genre: criteria.genre,
        },
        {
          order: { column: 'created_at', ascending: false },
          pagination: {
            page: criteria.page,
            limit: criteria.limit || 20,
          },
        }
      );
    } catch (error) {
      logger.error(`Failed to search call reports: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to search call reports',
        'SEARCH_FAILED',
        { criteria, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get pending evaluations (call reports ready for evaluation)
   *
   * @returns Array of pending call reports
   */
  async getPendingEvaluations(): Promise<CallReport[]> {
    try {
      return await this.callReportRepo.findPendingEvaluations();
    } catch (error) {
      logger.error(`Failed to get pending evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to retrieve pending evaluations',
        'GET_PENDING_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get overdue evaluations (past deadline)
   *
   * @returns Array of overdue call reports
   */
  async getOverdueEvaluations(): Promise<CallReport[]> {
    try {
      return await this.callReportRepo.findOverdueEvaluations();
    } catch (error) {
      logger.error(`Failed to get overdue evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to retrieve overdue evaluations',
        'GET_OVERDUE_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get call reports by creator
   *
   * @param userId - User ID
   * @returns Array of call reports
   */
  async getCallReportsByCreator(userId: string): Promise<CallReport[]> {
    try {
      return await this.callReportRepo.findByCreator(userId, {
        order: { column: 'created_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to get call reports by creator: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to retrieve call reports',
        'GET_BY_CREATOR_FAILED',
        { userId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get call report statistics
   *
   * @returns Statistics object
   */
  async getStatistics() {
    try {
      return await this.callReportRepo.getStatistics();
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to retrieve statistics',
        'GET_STATISTICS_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Check if evaluation is complete
   *
   * @param callReportId - Call report ID
   * @returns True if evaluation is complete
   */
  async isEvaluationComplete(callReportId: string): Promise<boolean> {
    try {
      const callReport = await this.callReportRepo.findById(callReportId);
      if (!callReport) {
        throw new CallReportServiceError(
          'Call report not found',
          'NOT_FOUND',
          { callReportId }
        );
      }

      const required = callReport.required_evaluations || this.DEFAULT_REQUIRED_EVALUATIONS;
      const completed = callReport.completed_evaluations || 0;

      return completed >= required;
    } catch (error) {
      if (error instanceof CallReportServiceError) {
        throw error;
      }
      logger.error(`Failed to check evaluation completion: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to check evaluation status',
        'CHECK_COMPLETION_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get evaluation progress percentage
   *
   * @param callReportId - Call report ID
   * @returns Progress percentage (0-100)
   */
  async getEvaluationProgress(callReportId: string): Promise<number> {
    try {
      const callReport = await this.callReportRepo.findById(callReportId);
      if (!callReport) {
        throw new CallReportServiceError(
          'Call report not found',
          'NOT_FOUND',
          { callReportId }
        );
      }

      const required = callReport.required_evaluations || this.DEFAULT_REQUIRED_EVALUATIONS;
      const completed = callReport.completed_evaluations || 0;

      return Math.round((completed / required) * 100);
    } catch (error) {
      if (error instanceof CallReportServiceError) {
        throw error;
      }
      logger.error(`Failed to get evaluation progress: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to get progress',
        'GET_PROGRESS_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Delete call report
   *
   * @param callReportId - Call report ID
   * @param performedBy - ID of user performing the action
   */
  async deleteCallReport(callReportId: string, performedBy: string): Promise<void> {
    try {
      logger.info(`Deleting call report: ${callReportId}`);

      // Validate call report exists
      const existing = await this.callReportRepo.findById(callReportId);
      if (!existing) {
        throw new CallReportServiceError(
          'Call report not found',
          'NOT_FOUND',
          { callReportId }
        );
      }

      // Store story_id BEFORE deletion so we can revert its status
      const storyId = existing.story_id;

      // Only allow creator or admin to delete
      const user = await this.userRepo.findById(performedBy);
      if (!user) {
        throw new CallReportServiceError(
          'User not found',
          'USER_NOT_FOUND',
          { performedBy }
        );
      }

      if (existing.created_by !== performedBy && user.role !== 'admin') {
        throw new CallReportServiceError(
          'Only the creator or an admin can delete this call report',
          'PERMISSION_DENIED',
          { callReportId, performedBy }
        );
      }

      // Delete call report
      await this.callReportRepo.delete(callReportId);

      // Revert story status to 'submitted' if it has a linked story
      if (storyId) {
        const storyRepo = new StoryRepository(this.context);
        await storyRepo.updateStatus(storyId, 'submitted');
        logger.info(`Story ${storyId} status reverted to 'submitted' after call report deletion`);
      }

      logger.info(`Call report deleted: ${callReportId}`);
    } catch (error) {
      if (error instanceof CallReportServiceError) {
        throw error;
      }
      logger.error(`Failed to delete call report: ${error instanceof Error ? error.message : String(error)}`);
      throw new CallReportServiceError(
        'Failed to delete call report',
        'DELETE_FAILED',
        { callReportId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

/**
 * Helper function to create a CallReportService instance
 *
 * @param context - Repository context
 * @returns CallReportService instance
 */
export function createCallReportService(context: RepositoryContextType = 'server'): CallReportService {
  return new CallReportService(context);
}
