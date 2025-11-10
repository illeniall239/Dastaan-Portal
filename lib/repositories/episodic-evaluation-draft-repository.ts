/**
 * EpisodicEvaluationDraft Repository
 *
 * Handles all database operations for episodic evaluation drafts.
 * Allows evaluators to save work-in-progress evaluations before final submission.
 *
 * Usage:
 * ```typescript
 * const repo = new EpisodicEvaluationDraftRepository('server');
 *
 * // Save draft
 * const draft = await repo.saveDraft({
 *   episode_id: '...',
 *   evaluator_id: '...',
 *   draft_data: { ...formData }
 * });
 *
 * // Get draft
 * const draft = await repo.findDraft(episodeId, evaluatorId);
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';
import type { EpisodicEvaluationDraft } from '@/types';

/**
 * Draft data structure
 */
export interface DraftData {
  noOfPages?: number;
  noOfScenes?: number;
  events?: any[];
  summaryAnalysis?: string;
  conflictScore?: number;
  characterizationScore?: number;
  progressionScore?: number;
  freezesScore?: number;
  whatsNextScore?: number;
  [key: string]: any; // Allow additional fields
}

/**
 * Draft creation/update data
 */
export interface DraftSaveData {
  episode_id: string;
  evaluator_id: string;
  draft_data: DraftData;
}

/**
 * EpisodicEvaluationDraft repository for managing draft data
 */
export class EpisodicEvaluationDraftRepository extends BaseRepository<EpisodicEvaluationDraft> {
  constructor(context: RepositoryContextType = 'server') {
    super('episodic_evaluation_drafts', context);
  }

  /**
   * Save a draft (create or update existing)
   * Only one draft per evaluator per episode
   *
   * @param data - Draft save data
   * @returns Saved draft
   */
  async saveDraft(data: DraftSaveData): Promise<EpisodicEvaluationDraft> {
    try {
      logger.info(`Saving draft for episode ${data.episode_id} and evaluator ${data.evaluator_id}`);

      // Check if draft already exists
      const existing = await this.findDraft(data.episode_id, data.evaluator_id);

      if (existing) {
        // Update existing draft
        logger.info(`Updating existing draft: ${existing.id}`);
        return await this.update(existing.id, {
          draft_data: data.draft_data,
          updated_at: new Date().toISOString(),
        } as Partial<EpisodicEvaluationDraft>);
      }

      // Create new draft
      const draftData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const draft = await this.create(draftData as Partial<EpisodicEvaluationDraft>);
      logger.info(`Draft saved: ${draft.id}`);
      return draft;
    } catch (error) {
      logger.error(`Failed to save draft: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find draft for a specific episode and evaluator
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns Draft or null
   */
  async findDraft(episodeId: string, evaluatorId: string): Promise<EpisodicEvaluationDraft | null> {
    try {
      logger.info(`Finding draft for episode ${episodeId} and evaluator ${evaluatorId}`);

      return await this.findOne({
        episode_id: episodeId,
        evaluator_id: evaluatorId,
      });
    } catch (error) {
      logger.error(`Failed to find draft: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all drafts for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @param options - Query options
   * @returns Array of drafts
   */
  async findByEvaluatorId(evaluatorId: string, options?: QueryOptions): Promise<EpisodicEvaluationDraft[]> {
    try {
      logger.info(`Finding drafts for evaluator: ${evaluatorId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          evaluator_id: evaluatorId,
        },
        order: options?.order || { column: 'updated_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find drafts by evaluator: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find all drafts for an episode
   *
   * @param episodeId - Episode ID
   * @param options - Query options
   * @returns Array of drafts
   */
  async findByEpisodeId(episodeId: string, options?: QueryOptions): Promise<EpisodicEvaluationDraft[]> {
    try {
      logger.info(`Finding drafts for episode: ${episodeId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          episode_id: episodeId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find drafts by episode: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if draft exists for episode and evaluator
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns True if draft exists
   */
  async draftExists(episodeId: string, evaluatorId: string): Promise<boolean> {
    try {
      logger.info(`Checking if draft exists`);

      const draft = await this.findDraft(episodeId, evaluatorId);
      return draft !== null;
    } catch (error) {
      logger.error(`Failed to check draft existence: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update draft data
   *
   * @param draftId - Draft ID
   * @param draftData - Updated draft data
   * @returns Updated draft
   */
  async updateDraft(draftId: string, draftData: DraftData): Promise<EpisodicEvaluationDraft> {
    try {
      logger.info(`Updating draft: ${draftId}`);

      return await this.update(draftId, {
        draft_data: draftData,
        updated_at: new Date().toISOString(),
      } as Partial<EpisodicEvaluationDraft>);
    } catch (error) {
      logger.error(`Failed to update draft: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete a draft
   *
   * @param draftId - Draft ID
   */
  async deleteDraft(draftId: string): Promise<void> {
    try {
      logger.info(`Deleting draft: ${draftId}`);
      await this.delete(draftId);
      logger.info(`Draft deleted: ${draftId}`);
    } catch (error) {
      logger.error(`Failed to delete draft: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete draft by episode and evaluator
   *
   * @param episodeId - Episode ID
   * @param evaluatorId - Evaluator ID
   * @returns True if draft was deleted
   */
  async deleteDraftByEpisodeAndEvaluator(episodeId: string, evaluatorId: string): Promise<boolean> {
    try {
      logger.info(`Deleting draft for episode ${episodeId} and evaluator ${evaluatorId}`);

      const draft = await this.findDraft(episodeId, evaluatorId);

      if (!draft) {
        logger.info(`No draft found to delete`);
        return false;
      }

      await this.deleteDraft(draft.id);
      return true;
    } catch (error) {
      logger.error(`Failed to delete draft: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete all drafts for an episode
   *
   * @param episodeId - Episode ID
   * @returns Number of drafts deleted
   */
  async deleteByEpisodeId(episodeId: string): Promise<number> {
    try {
      logger.info(`Deleting all drafts for episode: ${episodeId}`);

      const count = await this.deleteMany({ episode_id: episodeId });

      logger.info(`Deleted ${count} drafts`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete drafts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete all drafts for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @returns Number of drafts deleted
   */
  async deleteByEvaluatorId(evaluatorId: string): Promise<number> {
    try {
      logger.info(`Deleting all drafts for evaluator: ${evaluatorId}`);

      const count = await this.deleteMany({ evaluator_id: evaluatorId });

      logger.info(`Deleted ${count} drafts`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete drafts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count drafts for an evaluator
   *
   * @param evaluatorId - Evaluator ID
   * @returns Draft count
   */
  async countByEvaluatorId(evaluatorId: string): Promise<number> {
    try {
      logger.info(`Counting drafts for evaluator: ${evaluatorId}`);

      return await this.count({ evaluator_id: evaluatorId });
    } catch (error) {
      logger.error(`Failed to count drafts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count drafts for an episode
   *
   * @param episodeId - Episode ID
   * @returns Draft count
   */
  async countByEpisodeId(episodeId: string): Promise<number> {
    try {
      logger.info(`Counting drafts for episode: ${episodeId}`);

      return await this.count({ episode_id: episodeId });
    } catch (error) {
      logger.error(`Failed to count drafts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get all drafts with pagination
   *
   * @param options - Query options
   * @returns Array of drafts
   */
  async getAllDrafts(options?: QueryOptions): Promise<EpisodicEvaluationDraft[]> {
    try {
      logger.info(`Getting all drafts`);

      return await this.findAll({
        ...options,
        order: options?.order || { column: 'updated_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to get all drafts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create an EpisodicEvaluationDraftRepository instance
 *
 * @param context - Repository context
 * @returns EpisodicEvaluationDraftRepository instance
 */
export function createEpisodicEvaluationDraftRepository(
  context: RepositoryContextType = 'server'
): EpisodicEvaluationDraftRepository {
  return new EpisodicEvaluationDraftRepository(context);
}
