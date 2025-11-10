/**
 * EpisodicEvaluation Repository
 *
 * Handles all database operations for episodic evaluations.
 * Manages evaluator assessments of individual episodes with scoring criteria.
 *
 * Usage:
 * ```typescript
 * const repo = new EpisodicEvaluationRepository('server');
 *
 * // Create evaluation
 * const evaluation = await repo.createEvaluation({
 *   episode_id: '...',
 *   evaluator_id: '...',
 *   no_of_pages: 50,
 *   no_of_scenes: 25,
 *   ...scores
 * });
 *
 * // Find by episode
 * const evaluations = await repo.findByEpisodeId(episodeId);
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';
import type { EpisodicEvaluation, EpisodicGrade, EventItem } from '@/types';

/**
 * Episodic evaluation creation data
 */
export interface EpisodicEvaluationCreateData {
  episode_id: string;
  evaluator_id: string;
  no_of_pages: number;
  no_of_scenes: number;
  events: (string | EventItem)[];
  summary_analysis?: string;
  conflict_of_content_score: number;
  characterization_score: number;
  story_progression_score: number;
  freezes_score: number;
  whats_next_element_score: number;
}

/**
 * Score breakdown for analysis
 */
export interface ScoreBreakdown {
  conflict_of_content: number;
  characterization: number;
  story_progression: number;
  freezes: number;
  whats_next_element: number;
  overall_average: number;
  overall_grade: EpisodicGrade;
}

/**
 * Episodic evaluation statistics
 */
export interface EpisodicEvaluationStatistics {
  total: number;
  by_grade: Record<string, number>;
  average_overall_score: number;
  average_pages: number;
  average_scenes: number;
  by_evaluator: Record<string, number>;
}

/**
 * Episode evaluation summary
 */
export interface EpisodeEvaluationSummary {
  episode_id: string;
  evaluation_count: number;
  average_overall_score: number;
  grade_distribution: Record<string, number>;
  completed_evaluators: string[];
}

/**
 * EpisodicEvaluation repository for managing evaluation data
 */
export class EpisodicEvaluationRepository extends BaseRepository<EpisodicEvaluation> {
  constructor(context: RepositoryContextType = 'server') {
    super('episodic_evaluations', context);
  }

  /**
   * Create a new episodic evaluation
   *
   * Note: pages_score, scenes_score, overall_average, and overall_grade
   * are auto-calculated by database triggers
   *
   * @param data - Evaluation creation data
   * @returns Created evaluation
   */
  async createEvaluation(data: EpisodicEvaluationCreateData): Promise<EpisodicEvaluation> {
    try {
      logger.info(`Creating episodic evaluation for episode ${data.episode_id}`);

      // Check if evaluation already exists
      const existing = await this.findOne({
        episode_id: data.episode_id,
        evaluator_id: data.evaluator_id,
      });

      if (existing) {
        logger.info(`Evaluation already exists for this episode and evaluator`);
        throw new Error('Evaluator has already evaluated this episode');
      }

      const evaluationData = {
        ...data,
        events: data.events || [],
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const evaluation = await this.create(evaluationData as unknown as Partial<EpisodicEvaluation>);
      logger.info(`Episodic evaluation created: ${evaluation.id}`);
      return evaluation;
    } catch (error) {
      logger.error(`Failed to create episodic evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find evaluations by episode ID
   *
   * @param episodeId - Episode ID
   * @param options - Query options
   * @returns Array of evaluations
   */
  async findByEpisodeId(episodeId: string, options?: QueryOptions): Promise<EpisodicEvaluation[]> {
    try {
      logger.info(`Finding episodic evaluations for episode: ${episodeId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          episode_id: episodeId,
        },
        order: options?.order || { column: 'submitted_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find evaluations by episode: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find evaluations by evaluator ID
   *
   * @param evaluatorId - Evaluator ID
   * @param options - Query options
   * @returns Array of evaluations
   */
  async findByEvaluatorId(evaluatorId: string, options?: QueryOptions): Promise<EpisodicEvaluation[]> {
    try {
      logger.info(`Finding episodic evaluations by evaluator: ${evaluatorId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          evaluator_id: evaluatorId,
        },
        order: options?.order || { column: 'submitted_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find evaluations by evaluator: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find evaluation for a specific episode and evaluator
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns Evaluation or null
   */
  async findByEpisodeAndEvaluator(episodeId: string, evaluatorId: string): Promise<EpisodicEvaluation | null> {
    try {
      logger.info(`Finding evaluation for episode ${episodeId} and evaluator ${evaluatorId}`);

      return await this.findOne({
        episode_id: episodeId,
        evaluator_id: evaluatorId,
      });
    } catch (error) {
      logger.error(`Failed to find evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if evaluator has evaluated an episode
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns True if evaluated
   */
  async hasEvaluated(episodeId: string, evaluatorId: string): Promise<boolean> {
    try {
      logger.info(`Checking if evaluator has evaluated episode`);

      const evaluation = await this.findByEpisodeAndEvaluator(episodeId, evaluatorId);
      return evaluation !== null;
    } catch (error) {
      logger.error(`Failed to check evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find evaluations by grade
   *
   * @param grade - Overall grade
   * @param options - Query options
   * @returns Array of evaluations
   */
  async findByGrade(grade: EpisodicGrade, options?: QueryOptions): Promise<EpisodicEvaluation[]> {
    try {
      logger.info(`Finding episodic evaluations with grade: ${grade}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          overall_grade: grade,
        },
      });
    } catch (error) {
      logger.error(`Failed to find evaluations by grade: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get average score for an episode
   *
   * @param episodeId - Episode ID
   * @returns Average overall score or null if no evaluations
   */
  async getAverageScoreForEpisode(episodeId: string): Promise<number | null> {
    try {
      logger.info(`Calculating average score for episode: ${episodeId}`);

      const evaluations = await this.findByEpisodeId(episodeId);

      if (evaluations.length === 0) {
        return null;
      }

      const sum = evaluations.reduce((acc, evaluation) => acc + evaluation.overall_average, 0);
      const average = Number((sum / evaluations.length).toFixed(2));

      logger.info(`Average score for episode calculated: ${average}`);
      return average;
    } catch (error) {
      logger.error(`Failed to get average score: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get score breakdown for an episode (average of each criterion)
   *
   * @param episodeId - Episode ID
   * @returns Score breakdown or null if no evaluations
   */
  async getScoreBreakdownForEpisode(episodeId: string): Promise<Partial<ScoreBreakdown> | null> {
    try {
      logger.info(`Getting score breakdown for episode: ${episodeId}`);

      const evaluations = await this.findByEpisodeId(episodeId);

      if (evaluations.length === 0) {
        return null;
      }

      const count = evaluations.length;
      const breakdown = {
        conflict_of_content: 0,
        characterization: 0,
        story_progression: 0,
        freezes: 0,
        whats_next_element: 0,
      };

      for (const evaluation of evaluations) {
        breakdown.conflict_of_content += evaluation.conflict_of_content_score;
        breakdown.characterization += evaluation.characterization_score;
        breakdown.story_progression += evaluation.story_progression_score;
        breakdown.freezes += evaluation.freezes_score;
        breakdown.whats_next_element += evaluation.whats_next_element_score;
      }

      const result = {
        conflict_of_content: Number((breakdown.conflict_of_content / count).toFixed(2)),
        characterization: Number((breakdown.characterization / count).toFixed(2)),
        story_progression: Number((breakdown.story_progression / count).toFixed(2)),
        freezes: Number((breakdown.freezes / count).toFixed(2)),
        whats_next_element: Number((breakdown.whats_next_element / count).toFixed(2)),
      };

      logger.info(`Score breakdown calculated`);
      return result;
    } catch (error) {
      logger.error(`Failed to get score breakdown: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get episode evaluation summary
   *
   * @param episodeId - Episode ID
   * @returns Episode evaluation summary
   */
  async getEpisodeSummary(episodeId: string): Promise<EpisodeEvaluationSummary> {
    try {
      logger.info(`Getting evaluation summary for episode: ${episodeId}`);

      const evaluations = await this.findByEpisodeId(episodeId);

      const summary: EpisodeEvaluationSummary = {
        episode_id: episodeId,
        evaluation_count: evaluations.length,
        average_overall_score: 0,
        grade_distribution: {},
        completed_evaluators: [],
      };

      if (evaluations.length === 0) {
        return summary;
      }

      // Calculate average overall score
      const sum = evaluations.reduce((acc, evaluation) => acc + evaluation.overall_average, 0);
      summary.average_overall_score = Number((sum / evaluations.length).toFixed(2));

      // Build grade distribution
      for (const evaluation of evaluations) {
        const grade = evaluation.overall_grade;
        summary.grade_distribution[grade] = (summary.grade_distribution[grade] || 0) + 1;
        summary.completed_evaluators.push(evaluation.evaluator_id);
      }

      logger.info(`Episode summary calculated`);
      return summary;
    } catch (error) {
      logger.error(`Failed to get episode summary: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count evaluations for an episode
   *
   * @param episodeId - Episode ID
   * @returns Evaluation count
   */
  async countByEpisodeId(episodeId: string): Promise<number> {
    try {
      logger.info(`Counting evaluations for episode: ${episodeId}`);

      return await this.count({ episode_id: episodeId });
    } catch (error) {
      logger.error(`Failed to count evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count evaluations by evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @returns Evaluation count
   */
  async countByEvaluatorId(evaluatorId: string): Promise<number> {
    try {
      logger.info(`Counting evaluations by evaluator: ${evaluatorId}`);

      return await this.count({ evaluator_id: evaluatorId });
    } catch (error) {
      logger.error(`Failed to count evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get evaluations by grade distribution
   *
   * @returns Object with counts by grade
   */
  async countByGrade(): Promise<Record<EpisodicGrade, number>> {
    try {
      logger.info(`Counting evaluations by grade`);

      const client = await this.getClient();
      const { data, error } = await client.from(this.tableName).select('overall_grade');

      if (error) this.handleError(error);

      const counts: Record<string, number> = {};

      for (const row of data || []) {
        if (row.overall_grade) {
          counts[row.overall_grade] = (counts[row.overall_grade] || 0) + 1;
        }
      }

      logger.info(`Counted evaluations by grade`);
      return counts as Record<EpisodicGrade, number>;
    } catch (error) {
      logger.error(`Failed to count by grade: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get episodic evaluation statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<EpisodicEvaluationStatistics> {
    try {
      logger.info(`Calculating episodic evaluation statistics`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('overall_grade, overall_average, no_of_pages, no_of_scenes, evaluator_id');

      if (error) this.handleError(error);

      const stats: EpisodicEvaluationStatistics = {
        total: data?.length || 0,
        by_grade: {},
        average_overall_score: 0,
        average_pages: 0,
        average_scenes: 0,
        by_evaluator: {},
      };

      if (!data || data.length === 0) {
        return stats;
      }

      let totalScore = 0;
      let totalPages = 0;
      let totalScenes = 0;

      for (const row of data) {
        // Count by grade
        if (row.overall_grade) {
          stats.by_grade[row.overall_grade] = (stats.by_grade[row.overall_grade] || 0) + 1;
        }

        // Sum for averages
        totalScore += row.overall_average || 0;
        totalPages += row.no_of_pages || 0;
        totalScenes += row.no_of_scenes || 0;

        // Count by evaluator
        if (row.evaluator_id) {
          stats.by_evaluator[row.evaluator_id] = (stats.by_evaluator[row.evaluator_id] || 0) + 1;
        }
      }

      stats.average_overall_score = Number((totalScore / data.length).toFixed(2));
      stats.average_pages = Number((totalPages / data.length).toFixed(2));
      stats.average_scenes = Number((totalScenes / data.length).toFixed(2));

      logger.info(`Statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete an episodic evaluation
   * Note: Only allowed for evaluator's own evaluations or admins (enforced by RLS)
   *
   * @param evaluationId - Evaluation ID
   */
  async deleteEvaluation(evaluationId: string): Promise<void> {
    try {
      logger.info(`Deleting episodic evaluation: ${evaluationId}`);
      await this.delete(evaluationId);
      logger.info(`Episodic evaluation deleted: ${evaluationId}`);
    } catch (error) {
      logger.error(`Failed to delete episodic evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete all evaluations for an episode
   *
   * @param episodeId - Episode ID
   * @returns Number of evaluations deleted
   */
  async deleteByEpisodeId(episodeId: string): Promise<number> {
    try {
      logger.info(`Deleting all evaluations for episode: ${episodeId}`);

      const count = await this.deleteMany({ episode_id: episodeId });

      logger.info(`Deleted ${count} evaluations`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create an EpisodicEvaluationRepository instance
 *
 * @param context - Repository context
 * @returns EpisodicEvaluationRepository instance
 */
export function createEpisodicEvaluationRepository(
  context: RepositoryContextType = 'server'
): EpisodicEvaluationRepository {
  return new EpisodicEvaluationRepository(context);
}
