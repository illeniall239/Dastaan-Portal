/**
 * Evaluation Repository
 *
 * Handles all database operations for evaluator forms (evaluations).
 * Manages the 8-criteria scoring system for story evaluations.
 *
 * Usage:
 * ```typescript
 * const repo = new EvaluationRepository('server');
 *
 * // Get evaluations for a call report
 * const evaluations = await repo.findByCallReportId(callReportId);
 *
 * // Calculate average score
 * const avgScore = await repo.getAverageScore(callReportId);
 *
 * // Get evaluator's pending assignments
 * const pending = await repo.findPendingByEvaluator(evaluatorId);
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';

/**
 * Evaluation entity (evaluator_forms table)
 */
export interface Evaluation {
  id: string;
  call_report_id: string;
  evaluator_id: string;
  evaluator_name?: string;
  evaluator_email?: string;

  // 8 Evaluation Criteria (1-10 scale)
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  whats_next_element_score: number;
  overall_oneliner_grade_score: number;

  // Calculated
  average_score: number;

  // Feedback
  comments: string;

  // Status
  status: 'draft' | 'submitted';

  // Metadata
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Evaluation creation data
 */
export interface EvaluationCreateData {
  call_report_id: string;
  evaluator_id: string;
  evaluator_name?: string;
  evaluator_email?: string;
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  whats_next_element_score: number;
  overall_oneliner_grade_score: number;
  comments: string;
  status?: 'draft' | 'submitted';
}

/**
 * Evaluation search filters
 */
export interface EvaluationSearchFilters {
  call_report_id?: string;
  evaluator_id?: string;
  status?: 'draft' | 'submitted';
  min_score?: number;
  max_score?: number;
}

/**
 * Evaluation statistics
 */
export interface EvaluationStatistics {
  total: number;
  by_status: Record<string, number>;
  average_score: number;
  score_distribution: {
    excellent: number; // 8-10
    good: number; // 6-7.9
    fair: number; // 4-5.9
    poor: number; // 0-3.9
  };
  by_evaluator: Record<string, number>;
}

/**
 * Criteria scores breakdown
 */
export interface CriteriaBreakdown {
  conflict_of_content: number;
  characterization: number;
  story_progression: number;
  whats_next_element: number;
  overall_oneliner_grade: number;
}

/**
 * Evaluation repository for managing evaluation data
 */
export class EvaluationRepository extends BaseRepository<Evaluation> {
  constructor(context: RepositoryContextType = 'server') {
    super('evaluator_forms', context);
  }

  /**
   * Calculate average score from criteria scores
   */
  private calculateAverageScore(scores: {
    conflict_of_content_score: number;
    characterization_score: number;
    story_progression_score: number;
    whats_next_element_score: number;
    overall_oneliner_grade_score: number;
  }): number {
    const sum =
      scores.conflict_of_content_score +
      scores.characterization_score +
      scores.story_progression_score +
      scores.whats_next_element_score +
      scores.overall_oneliner_grade_score;

    return Number((sum / 5).toFixed(2));
  }

  /**
   * Create evaluation with automatic score calculation
   *
   * @param data - Evaluation creation data
   * @returns Created evaluation
   */
  async createEvaluation(data: EvaluationCreateData): Promise<Evaluation> {
    try {
      logger.info(`Creating evaluation for call report: ${data.call_report_id}`);

      const averageScore = this.calculateAverageScore({
        conflict_of_content_score: data.conflict_of_content_score,
        characterization_score: data.characterization_score,
        story_progression_score: data.story_progression_score,
        whats_next_element_score: data.whats_next_element_score,
        overall_oneliner_grade_score: data.overall_oneliner_grade_score,
      });

      const evaluation = await this.create({
        ...data,
        average_score: averageScore,
        status: data.status || 'draft',
        submitted_at: data.status === 'submitted' ? new Date().toISOString() : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Partial<Evaluation>);

      logger.info(`Evaluation created: ${evaluation.id}`);
      return evaluation;
    } catch (error) {
      logger.error(`Failed to create evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update evaluation with automatic score recalculation
   *
   * @param evaluationId - Evaluation ID
   * @param data - Update data
   * @returns Updated evaluation
   */
  async updateEvaluation(evaluationId: string, data: Partial<EvaluationCreateData>): Promise<Evaluation> {
    try {
      logger.info(`Updating evaluation: ${evaluationId}`);

      // Get existing evaluation to recalculate score if criteria changed
      const existing = await this.findById(evaluationId);
      if (!existing) {
        throw new Error('Evaluation not found');
      }

      const scores = {
        conflict_of_content_score: data.conflict_of_content_score ?? existing.conflict_of_content_score,
        characterization_score: data.characterization_score ?? existing.characterization_score,
        story_progression_score: data.story_progression_score ?? existing.story_progression_score,
        whats_next_element_score: data.whats_next_element_score ?? existing.whats_next_element_score,
        overall_oneliner_grade_score: data.overall_oneliner_grade_score ?? existing.overall_oneliner_grade_score,
      };

      const averageScore = this.calculateAverageScore(scores);

      const updateData: any = {
        ...data,
        average_score: averageScore,
        updated_at: new Date().toISOString(),
      };

      // Set submitted_at if status is being changed to submitted
      if (data.status === 'submitted' && existing.status !== 'submitted') {
        updateData.submitted_at = new Date().toISOString();
      }

      return await this.update(evaluationId, updateData as unknown as Partial<Evaluation>);
    } catch (error) {
      logger.error(`Failed to update evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all evaluations for a call report
   *
   * @param callReportId - Call report ID
   * @param options - Query options
   * @returns Array of evaluations
   */
  async findByCallReportId(callReportId: string, options?: QueryOptions): Promise<Evaluation[]> {
    try {
      logger.info(`Finding evaluations for call report: ${callReportId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          call_report_id: callReportId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find evaluations by call report: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all evaluations by evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @param options - Query options
   * @returns Array of evaluations
   */
  async findByEvaluator(evaluatorId: string, options?: QueryOptions): Promise<Evaluation[]> {
    try {
      logger.info(`Finding evaluations by evaluator: ${evaluatorId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          evaluator_id: evaluatorId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find evaluations by evaluator: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find submitted evaluations
   *
   * @param options - Query options
   * @returns Array of submitted evaluations
   */
  async findSubmitted(options?: QueryOptions): Promise<Evaluation[]> {
    try {
      logger.info(`Finding submitted evaluations`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          status: 'submitted',
        },
      });
    } catch (error) {
      logger.error(`Failed to find submitted evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find draft evaluations by evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @param options - Query options
   * @returns Array of draft evaluations
   */
  async findDraftsByEvaluator(evaluatorId: string, options?: QueryOptions): Promise<Evaluation[]> {
    try {
      logger.info(`Finding draft evaluations for evaluator: ${evaluatorId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          evaluator_id: evaluatorId,
          status: 'draft',
        },
      });
    } catch (error) {
      logger.error(`Failed to find drafts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if evaluator has already evaluated a call report
   *
   * @param callReportId - Call report ID
   * @param evaluatorId - Evaluator ID
   * @returns True if evaluation exists
   */
  async hasEvaluated(callReportId: string, evaluatorId: string): Promise<boolean> {
    try {
      logger.info(`Checking if evaluator has evaluated call report`);

      const evaluation = await this.findOne({
        call_report_id: callReportId,
        evaluator_id: evaluatorId,
      });

      return evaluation !== null;
    } catch (error) {
      logger.error(`Failed to check evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get evaluation for call report by evaluator
   *
   * @param callReportId - Call report ID
   * @param evaluatorId - Evaluator ID
   * @returns Evaluation or null
   */
  async findByCallReportAndEvaluator(
    callReportId: string,
    evaluatorId: string
  ): Promise<Evaluation | null> {
    try {
      logger.info(`Finding evaluation for call report and evaluator`);

      return await this.findOne({
        call_report_id: callReportId,
        evaluator_id: evaluatorId,
      });
    } catch (error) {
      logger.error(`Failed to find evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get average score for a call report
   *
   * @param callReportId - Call report ID
   * @returns Average score or null if no evaluations
   */
  async getAverageScore(callReportId: string): Promise<number | null> {
    try {
      logger.info(`Calculating average score for call report: ${callReportId}`);

      const evaluations = await this.findByCallReportId(callReportId, {
        filters: { status: 'submitted' },
      });

      if (evaluations.length === 0) {
        return null;
      }

      const sum = evaluations.reduce((acc, evaluation) => acc + evaluation.average_score, 0);
      const average = sum / evaluations.length;

      logger.info(`Average score calculated: ${average.toFixed(2)}`);
      return Number(average.toFixed(2));
    } catch (error) {
      logger.error(`Failed to calculate average: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get criteria breakdown for a call report
   *
   * @param callReportId - Call report ID
   * @returns Average scores for each criterion
   */
  async getCriteriaBreakdown(callReportId: string): Promise<CriteriaBreakdown | null> {
    try {
      logger.info(`Getting criteria breakdown for call report: ${callReportId}`);

      const evaluations = await this.findByCallReportId(callReportId, {
        filters: { status: 'submitted' },
      });

      if (evaluations.length === 0) {
        return null;
      }

      const sums = evaluations.reduce(
        (acc, evaluation) => ({
          conflict_of_content: acc.conflict_of_content + evaluation.conflict_of_content_score,
          characterization: acc.characterization + evaluation.characterization_score,
          story_progression: acc.story_progression + evaluation.story_progression_score,
          whats_next_element: acc.whats_next_element + evaluation.whats_next_element_score,
          overall_oneliner_grade: acc.overall_oneliner_grade + evaluation.overall_oneliner_grade_score,
        }),
        {
          conflict_of_content: 0,
          characterization: 0,
          story_progression: 0,
          whats_next_element: 0,
          overall_oneliner_grade: 0,
        }
      );

      const count = evaluations.length;

      return {
        conflict_of_content: Number((sums.conflict_of_content / count).toFixed(2)),
        characterization: Number((sums.characterization / count).toFixed(2)),
        story_progression: Number((sums.story_progression / count).toFixed(2)),
        whats_next_element: Number((sums.whats_next_element / count).toFixed(2)),
        overall_oneliner_grade: Number((sums.overall_oneliner_grade / count).toFixed(2)),
      };
    } catch (error) {
      logger.error(`Failed to get criteria breakdown: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count submitted evaluations for a call report
   *
   * @param callReportId - Call report ID
   * @returns Count of submitted evaluations
   */
  async countSubmittedByCallReport(callReportId: string): Promise<number> {
    try {
      logger.info(`Counting submitted evaluations for call report: ${callReportId}`);

      return await this.count({
        call_report_id: callReportId,
        status: 'submitted',
      });
    } catch (error) {
      logger.error(`Failed to count evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get evaluations by score range
   *
   * @param minScore - Minimum average score
   * @param maxScore - Maximum average score
   * @param options - Query options
   * @returns Array of evaluations in score range
   */
  async findByScoreRange(minScore: number, maxScore: number, options?: QueryOptions): Promise<Evaluation[]> {
    try {
      logger.info(`Finding evaluations with score between ${minScore} and ${maxScore}`);

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .gte('average_score', minScore)
        .lte('average_score', maxScore);

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

      logger.info(`Found evaluations in score range`);
      return (data as unknown as Evaluation[]) || [];
    } catch (error) {
      logger.error(`Failed to find by score range: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search evaluations with complex filters
   *
   * @param filters - Search filters
   * @param options - Query options
   * @returns Array of matching evaluations
   */
  async searchWithFilters(
    filters: EvaluationSearchFilters,
    options?: QueryOptions
  ): Promise<Evaluation[]> {
    try {
      logger.info(`Searching evaluations with filters`);

      const queryFilters: any = { ...options?.filters };

      if (filters.call_report_id) {
        queryFilters.call_report_id = filters.call_report_id;
      }

      if (filters.evaluator_id) {
        queryFilters.evaluator_id = filters.evaluator_id;
      }

      if (filters.status) {
        queryFilters.status = filters.status;
      }

      // Handle score range
      if (filters.min_score !== undefined || filters.max_score !== undefined) {
        return await this.findByScoreRange(
          filters.min_score ?? 0,
          filters.max_score ?? 10,
          {
            ...options,
            filters: queryFilters,
          }
        );
      }

      return await this.findAll({
        ...options,
        filters: queryFilters,
      });
    } catch (error) {
      logger.error(`Failed to search evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get evaluation statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<EvaluationStatistics> {
    try {
      logger.info(`Calculating evaluation statistics`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('status, average_score, evaluator_id');

      if (error) this.handleError(error);

      const stats: EvaluationStatistics = {
        total: data?.length || 0,
        by_status: {},
        average_score: 0,
        score_distribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
        },
        by_evaluator: {},
      };

      let totalScore = 0;
      let countWithScore = 0;

      for (const row of data || []) {
        // Count by status
        if (row.status) {
          stats.by_status[row.status] = (stats.by_status[row.status] || 0) + 1;
        }

        // Calculate average score
        if (row.average_score) {
          totalScore += row.average_score;
          countWithScore++;

          // Score distribution
          if (row.average_score >= 8) {
            stats.score_distribution.excellent++;
          } else if (row.average_score >= 6) {
            stats.score_distribution.good++;
          } else if (row.average_score >= 4) {
            stats.score_distribution.fair++;
          } else {
            stats.score_distribution.poor++;
          }
        }

        // Count by evaluator
        if (row.evaluator_id) {
          stats.by_evaluator[row.evaluator_id] = (stats.by_evaluator[row.evaluator_id] || 0) + 1;
        }
      }

      stats.average_score = countWithScore > 0 ? Number((totalScore / countWithScore).toFixed(2)) : 0;

      logger.info(`Statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete evaluation
   *
   * @param evaluationId - Evaluation ID
   */
  async deleteEvaluation(evaluationId: string): Promise<void> {
    try {
      logger.info(`Deleting evaluation: ${evaluationId}`);
      await this.delete(evaluationId);
      logger.info(`Evaluation deleted: ${evaluationId}`);
    } catch (error) {
      logger.error(`Failed to delete evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get top evaluators by submission count
   *
   * @param limit - Number of evaluators to return
   * @returns Array of evaluator IDs with counts
   */
  async getTopEvaluators(limit: number = 10): Promise<Array<{ evaluator_id: string; count: number }>> {
    try {
      logger.info(`Getting top ${limit} evaluators`);

      const stats = await this.getStatistics();

      const evaluators = Object.entries(stats.by_evaluator)
        .map(([evaluator_id, count]) => ({ evaluator_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      logger.info(`Top evaluators retrieved`);
      return evaluators;
    } catch (error) {
      logger.error(`Failed to get top evaluators: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create an EvaluationRepository instance
 *
 * @param context - Repository context
 * @returns EvaluationRepository instance
 */
export function createEvaluationRepository(context: RepositoryContextType = 'server'): EvaluationRepository {
  return new EvaluationRepository(context);
}
