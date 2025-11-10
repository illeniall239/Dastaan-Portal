/**
 * EpisodicEvaluation Service
 *
 * Business logic for episodic evaluations.
 * Handles evaluation creation, draft management, and score calculations.
 *
 * Usage:
 * ```typescript
 * const service = new EpisodicEvaluationService();
 *
 * // Submit evaluation
 * const evaluation = await service.submitEvaluation({
 *   episode_id: '...',
 *   evaluator_id: '...',
 *   ...scores
 * });
 *
 * // Save draft
 * await service.saveDraft(episodeId, evaluatorId, formData);
 * ```
 */

import {
  EpisodicEvaluationRepository,
  type EpisodicEvaluationCreateData,
  type EpisodeEvaluationSummary,
} from '../repositories/episodic-evaluation-repository';
import {
  EpisodicEvaluationDraftRepository,
  type DraftData,
} from '../repositories/episodic-evaluation-draft-repository';
import { EpisodeRepository } from '../repositories/episode-repository';
import { UserRepository } from '../repositories/user-repository';
import { logger } from '@/lib/logger';
import type { EpisodicEvaluation, EpisodicEvaluationDraft, EventItem } from '@/types';

/**
 * Service error class
 */
export class EpisodicEvaluationServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'EpisodicEvaluationServiceError';
  }
}

/**
 * Episodic evaluation submission data
 */
export interface EpisodicEvaluationSubmissionData {
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
 * Evaluator performance metrics for episodic evaluations
 */
export interface EpisodicEvaluatorPerformance {
  evaluator_id: string;
  total_evaluations: number;
  average_overall_score: number;
  grade_distribution: Record<string, number>;
  average_pages: number;
  average_scenes: number;
}

/**
 * Episodic evaluation service for managing evaluation business logic
 */
export class EpisodicEvaluationService {
  private readonly evaluationRepo: EpisodicEvaluationRepository;
  private readonly draftRepo: EpisodicEvaluationDraftRepository;
  private readonly episodeRepo: EpisodeRepository;
  private readonly userRepo: UserRepository;

  constructor(context: 'server' | 'client' | 'admin' = 'server') {
    this.evaluationRepo = new EpisodicEvaluationRepository(context);
    this.draftRepo = new EpisodicEvaluationDraftRepository(context);
    this.episodeRepo = new EpisodeRepository(context);
    this.userRepo = new UserRepository(context);
  }

  /**
   * Submit an episodic evaluation
   *
   * Validates:
   * - Episode exists
   * - Evaluator exists and has evaluator role
   * - Evaluator hasn't already evaluated this episode
   * - All scores are within valid range (1-10)
   *
   * Note: pages_score, scenes_score, overall_average, and overall_grade
   * are auto-calculated by the database
   *
   * @param data - Episodic evaluation submission data
   * @returns Created evaluation
   */
  async submitEvaluation(data: EpisodicEvaluationSubmissionData): Promise<EpisodicEvaluation> {
    try {
      logger.info(`Processing evaluation submission for episode ${data.episode_id}`);

      // Validate episode exists
      const episode = await this.episodeRepo.findById(data.episode_id);
      if (!episode) {
        throw new EpisodicEvaluationServiceError(
          'Episode not found',
          'EPISODE_NOT_FOUND',
          404
        );
      }

      // Validate evaluator exists and has correct role
      const evaluator = await this.userRepo.findById(data.evaluator_id);
      if (!evaluator) {
        throw new EpisodicEvaluationServiceError(
          'Evaluator not found',
          'EVALUATOR_NOT_FOUND',
          404
        );
      }

      if (evaluator.role !== 'evaluator' && evaluator.role !== 'admin') {
        throw new EpisodicEvaluationServiceError(
          'User is not an evaluator',
          'NOT_EVALUATOR',
          403
        );
      }

      // Check if already evaluated
      const existing = await this.evaluationRepo.hasEvaluated(data.episode_id, data.evaluator_id);
      if (existing) {
        throw new EpisodicEvaluationServiceError(
          'Evaluator has already evaluated this episode',
          'ALREADY_EVALUATED',
          409
        );
      }

      // Validate score ranges (1-10)
      const scores = [
        data.conflict_of_content_score,
        data.characterization_score,
        data.story_progression_score,
        data.freezes_score,
        data.whats_next_element_score,
      ];

      for (const score of scores) {
        if (score < 1 || score > 10) {
          throw new EpisodicEvaluationServiceError(
            'Scores must be between 1 and 10',
            'INVALID_SCORE_RANGE',
            400
          );
        }
      }

      // Validate events array
      if (!data.events || data.events.length === 0) {
        throw new EpisodicEvaluationServiceError(
          'At least one event is required',
          'NO_EVENTS',
          400
        );
      }

      // Create evaluation (database will auto-calculate pages_score, scenes_score, overall_average, overall_grade)
      const createData: EpisodicEvaluationCreateData = {
        episode_id: data.episode_id,
        evaluator_id: data.evaluator_id,
        no_of_pages: data.no_of_pages,
        no_of_scenes: data.no_of_scenes,
        events: data.events,
        summary_analysis: data.summary_analysis,
        conflict_of_content_score: data.conflict_of_content_score,
        characterization_score: data.characterization_score,
        story_progression_score: data.story_progression_score,
        freezes_score: data.freezes_score,
        whats_next_element_score: data.whats_next_element_score,
      };

      const evaluation = await this.evaluationRepo.createEvaluation(createData);

      // Delete draft if exists (evaluation submitted successfully)
      try {
        await this.draftRepo.deleteDraftByEpisodeAndEvaluator(data.episode_id, data.evaluator_id);
      } catch (error) {
        // Non-critical - continue even if draft deletion fails
        logger.error(`Failed to delete draft after evaluation submission: ${error instanceof Error ? error.message : String(error)}`);
      }

      logger.info(`Evaluation submitted successfully: ${evaluation.id}`);
      return evaluation;
    } catch (error) {
      if (error instanceof EpisodicEvaluationServiceError) {
        throw error;
      }
      logger.error(`Failed to submit evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to submit evaluation',
        'SUBMISSION_FAILED',
        500
      );
    }
  }

  /**
   * Save evaluation draft
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @param draftData - Draft form data
   * @returns Saved draft
   */
  async saveDraft(
    episodeId: string,
    evaluatorId: string,
    draftData: DraftData
  ): Promise<EpisodicEvaluationDraft> {
    try {
      logger.info(`Saving draft for episode ${episodeId} and evaluator ${evaluatorId}`);

      // Validate episode exists
      const episode = await this.episodeRepo.findById(episodeId);
      if (!episode) {
        throw new EpisodicEvaluationServiceError(
          'Episode not found',
          'EPISODE_NOT_FOUND',
          404
        );
      }

      // Validate evaluator exists
      const evaluator = await this.userRepo.findById(evaluatorId);
      if (!evaluator) {
        throw new EpisodicEvaluationServiceError(
          'Evaluator not found',
          'EVALUATOR_NOT_FOUND',
          404
        );
      }

      // Check if already evaluated (can't save draft if already submitted)
      const existing = await this.evaluationRepo.hasEvaluated(episodeId, evaluatorId);
      if (existing) {
        throw new EpisodicEvaluationServiceError(
          'Evaluation already submitted - cannot save draft',
          'ALREADY_EVALUATED',
          409
        );
      }

      const draft = await this.draftRepo.saveDraft({
        episode_id: episodeId,
        evaluator_id: evaluatorId,
        draft_data: draftData,
      });

      logger.info(`Draft saved: ${draft.id}`);
      return draft;
    } catch (error) {
      if (error instanceof EpisodicEvaluationServiceError) {
        throw error;
      }
      logger.error(`Failed to save draft: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to save draft',
        'DRAFT_SAVE_FAILED',
        500
      );
    }
  }

  /**
   * Get draft for episode and evaluator
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns Draft or null
   */
  async getDraft(episodeId: string, evaluatorId: string): Promise<EpisodicEvaluationDraft | null> {
    try {
      logger.info(`Getting draft for episode ${episodeId} and evaluator ${evaluatorId}`);

      return await this.draftRepo.findDraft(episodeId, evaluatorId);
    } catch (error) {
      logger.error(`Failed to get draft: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to get draft',
        'DRAFT_GET_FAILED',
        500
      );
    }
  }

  /**
   * Get all drafts for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @returns Array of drafts
   */
  async getEvaluatorDrafts(evaluatorId: string): Promise<EpisodicEvaluationDraft[]> {
    try {
      logger.info(`Getting drafts for evaluator: ${evaluatorId}`);

      return await this.draftRepo.findByEvaluatorId(evaluatorId);
    } catch (error) {
      logger.error(`Failed to get evaluator drafts: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to get drafts',
        'DRAFTS_GET_FAILED',
        500
      );
    }
  }

  /**
   * Delete draft
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns True if deleted
   */
  async deleteDraft(episodeId: string, evaluatorId: string): Promise<boolean> {
    try {
      logger.info(`Deleting draft for episode ${episodeId} and evaluator ${evaluatorId}`);

      return await this.draftRepo.deleteDraftByEpisodeAndEvaluator(episodeId, evaluatorId);
    } catch (error) {
      logger.error(`Failed to delete draft: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to delete draft',
        'DRAFT_DELETE_FAILED',
        500
      );
    }
  }

  /**
   * Get evaluation for episode and evaluator
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns Evaluation or null
   */
  async getEvaluation(episodeId: string, evaluatorId: string): Promise<EpisodicEvaluation | null> {
    try {
      logger.info(`Getting evaluation for episode ${episodeId} and evaluator ${evaluatorId}`);

      return await this.evaluationRepo.findByEpisodeAndEvaluator(episodeId, evaluatorId);
    } catch (error) {
      logger.error(`Failed to get evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to get evaluation',
        'EVALUATION_GET_FAILED',
        500
      );
    }
  }

  /**
   * Get all evaluations for an episode
   *
   * @param episodeId - Episode ID
   * @returns Array of evaluations
   */
  async getEpisodeEvaluations(episodeId: string): Promise<EpisodicEvaluation[]> {
    try {
      logger.info(`Getting evaluations for episode: ${episodeId}`);

      return await this.evaluationRepo.findByEpisodeId(episodeId);
    } catch (error) {
      logger.error(`Failed to get episode evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to get evaluations',
        'EVALUATIONS_GET_FAILED',
        500
      );
    }
  }

  /**
   * Get all evaluations by an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @returns Array of evaluations
   */
  async getEvaluatorEvaluations(evaluatorId: string): Promise<EpisodicEvaluation[]> {
    try {
      logger.info(`Getting evaluations by evaluator: ${evaluatorId}`);

      return await this.evaluationRepo.findByEvaluatorId(evaluatorId);
    } catch (error) {
      logger.error(`Failed to get evaluator evaluations: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to get evaluations',
        'EVALUATIONS_GET_FAILED',
        500
      );
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

      return await this.evaluationRepo.getEpisodeSummary(episodeId);
    } catch (error) {
      logger.error(`Failed to get episode summary: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to get episode summary',
        'SUMMARY_GET_FAILED',
        500
      );
    }
  }

  /**
   * Get evaluator performance metrics for episodic evaluations
   *
   * @param evaluatorId - Evaluator ID
   * @returns Evaluator performance metrics
   */
  async getEvaluatorPerformance(evaluatorId: string): Promise<EpisodicEvaluatorPerformance> {
    try {
      logger.info(`Getting performance metrics for evaluator: ${evaluatorId}`);

      const evaluations = await this.evaluationRepo.findByEvaluatorId(evaluatorId);

      const performance: EpisodicEvaluatorPerformance = {
        evaluator_id: evaluatorId,
        total_evaluations: evaluations.length,
        average_overall_score: 0,
        grade_distribution: {},
        average_pages: 0,
        average_scenes: 0,
      };

      if (evaluations.length === 0) {
        return performance;
      }

      let totalScore = 0;
      let totalPages = 0;
      let totalScenes = 0;

      for (const evaluation of evaluations) {
        totalScore += evaluation.overall_average;
        totalPages += evaluation.no_of_pages;
        totalScenes += evaluation.no_of_scenes;

        const grade = evaluation.overall_grade;
        performance.grade_distribution[grade] = (performance.grade_distribution[grade] || 0) + 1;
      }

      performance.average_overall_score = Number((totalScore / evaluations.length).toFixed(2));
      performance.average_pages = Number((totalPages / evaluations.length).toFixed(2));
      performance.average_scenes = Number((totalScenes / evaluations.length).toFixed(2));

      logger.info(`Performance metrics calculated`);
      return performance;
    } catch (error) {
      logger.error(`Failed to get evaluator performance: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to get evaluator performance',
        'PERFORMANCE_GET_FAILED',
        500
      );
    }
  }

  /**
   * Check if evaluator can evaluate an episode
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns Object with canEvaluate flag and reason
   */
  async canEvaluate(
    episodeId: string,
    evaluatorId: string
  ): Promise<{ canEvaluate: boolean; reason?: string }> {
    try {
      logger.info(`Checking if evaluator can evaluate episode`);

      // Check if episode exists
      const episode = await this.episodeRepo.findById(episodeId);
      if (!episode) {
        return { canEvaluate: false, reason: 'Episode not found' };
      }

      // Check if evaluator exists and has correct role
      const evaluator = await this.userRepo.findById(evaluatorId);
      if (!evaluator) {
        return { canEvaluate: false, reason: 'Evaluator not found' };
      }

      if (evaluator.role !== 'evaluator' && evaluator.role !== 'admin') {
        return { canEvaluate: false, reason: 'User is not an evaluator' };
      }

      // Check if already evaluated
      const hasEvaluated = await this.evaluationRepo.hasEvaluated(episodeId, evaluatorId);
      if (hasEvaluated) {
        return { canEvaluate: false, reason: 'Already evaluated this episode' };
      }

      return { canEvaluate: true };
    } catch (error) {
      logger.error(`Failed to check evaluation eligibility: ${error instanceof Error ? error.message : String(error)}`);
      return { canEvaluate: false, reason: 'Failed to check eligibility' };
    }
  }

  /**
   * Delete evaluation (only if allowed by RLS policies)
   *
   * @param evaluationId - Evaluation ID
   * @param evaluatorId - Evaluator ID (for verification)
   */
  async deleteEvaluation(evaluationId: string, evaluatorId: string): Promise<void> {
    try {
      logger.info(`Deleting evaluation: ${evaluationId}`);

      // Verify evaluation exists and belongs to evaluator
      const evaluation = await this.evaluationRepo.findById(evaluationId);
      if (!evaluation) {
        throw new EpisodicEvaluationServiceError(
          'Evaluation not found',
          'EVALUATION_NOT_FOUND',
          404
        );
      }

      if (evaluation.evaluator_id !== evaluatorId) {
        throw new EpisodicEvaluationServiceError(
          'Cannot delete evaluation from another evaluator',
          'UNAUTHORIZED_DELETE',
          403
        );
      }

      await this.evaluationRepo.deleteEvaluation(evaluationId);
      logger.info(`Evaluation deleted: ${evaluationId}`);
    } catch (error) {
      if (error instanceof EpisodicEvaluationServiceError) {
        throw error;
      }
      logger.error(`Failed to delete evaluation: ${error instanceof Error ? error.message : String(error)}`);
      throw new EpisodicEvaluationServiceError(
        'Failed to delete evaluation',
        'DELETE_FAILED',
        500
      );
    }
  }
}

/**
 * Helper function to create an EpisodicEvaluationService instance
 *
 * @param context - Service context
 * @returns EpisodicEvaluationService instance
 */
export function createEpisodicEvaluationService(
  context: 'server' | 'client' | 'admin' = 'server'
): EpisodicEvaluationService {
  return new EpisodicEvaluationService(context);
}
