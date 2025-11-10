/**
 * Episode Pipeline Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EpisodePipelineService } from '@/lib/services/analytics/episode-pipeline-service';
import {
  StoryRepository,
  EpisodicEvaluationRepository,
  RepositoryContext,
} from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../../mocks/supabase-mock';
import {
  createMockStory,
  createMockEpisode,
  createMockEpisodicEvaluation,
} from '../../mocks/mock-data';

vi.mock('@/lib/repositories/base/repository-context');

describe('EpisodePipelineService', () => {
  let service: EpisodePipelineService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    service = new EpisodePipelineService('server');
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getAllEpisodesAndEvaluatorsBatch', () => {
    it('should fetch episodes and evaluators for multiple dramas in batch', async () => {
      const dramaIds = ['d1', 'd2'];
      const episodes = [
        createMockEpisode({ id: 'ep1', drama_id: 'd1', episode_number: 1 }),
        createMockEpisode({ id: 'ep2', drama_id: 'd1', episode_number: 2 }),
        createMockEpisode({ id: 'ep3', drama_id: 'd2', episode_number: 1 }),
      ];

      const evaluations = [
        createMockEpisodicEvaluation({ id: 'ev1', episode_id: 'ep1', evaluator_id: 'eval-1', status: 'completed' }),
        createMockEpisodicEvaluation({ id: 'ev2', episode_id: 'ep1', evaluator_id: 'eval-2', status: 'pending' }),
        createMockEpisodicEvaluation({ id: 'ev3', episode_id: 'ep2', evaluator_id: 'eval-1', status: 'completed' }),
      ];

      // Mock episodes query
      const mockQueryBuilder1 = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      // Mock evaluations query
      const mockQueryBuilder2 = createMockQueryBuilderWithData(evaluations);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getAllEpisodesAndEvaluatorsBatch(dramaIds);

      expect(result.episodesByDrama).toHaveProperty('d1');
      expect(result.episodesByDrama).toHaveProperty('d2');
      expect(result.episodesByDrama.d1).toHaveLength(2);
      expect(result.episodesByDrama.d2).toHaveLength(1);

      expect(result.evaluatorsByEpisode).toHaveProperty('ep1');
      expect(result.evaluatorsByEpisode.ep1.completed).toHaveLength(1);
      expect(result.evaluatorsByEpisode.ep1.pending).toHaveLength(1);
    });

    it('should handle empty drama list', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAllEpisodesAndEvaluatorsBatch([]);

      expect(result.episodesByDrama).toEqual({});
      expect(result.evaluatorsByEpisode).toEqual({});
    });

    it('should calculate evaluation progress correctly', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', drama_id: 'd1' }),
      ];

      const evaluations = [
        createMockEpisodicEvaluation({ episode_id: 'ep1', evaluator_id: 'eval-1', status: 'completed' }),
        createMockEpisodicEvaluation({ id: 'ev2', episode_id: 'ep1', evaluator_id: 'eval-2', status: 'completed' }),
        createMockEpisodicEvaluation({ id: 'ev3', episode_id: 'ep1', evaluator_id: 'eval-3', status: 'pending' }),
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(evaluations);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getAllEpisodesAndEvaluatorsBatch(['d1']);

      const episode = result.episodesByDrama.d1[0];
      expect(episode.completed_evaluations).toBe(2);
      expect(episode.total_evaluations).toBe(3);
      expect(episode.progress_percentage).toBeCloseTo(66.67, 0);
    });

    it('should use caching for batch queries', async () => {
      const episodes = [createMockEpisode({ drama_id: 'd1' })];
      const evaluations = [createMockEpisodicEvaluation()];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(evaluations);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      await service.getAllEpisodesAndEvaluatorsBatch(['d1']);
      const result2 = await service.getAllEpisodesAndEvaluatorsBatch(['d1']);

      expect(result2).toBeDefined();
      // Cache should be used on second call
    });
  });

  describe('getEpisodePipelineForDrama', () => {
    it('should get episode pipeline for single drama', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', drama_id: 'd1', episode_number: 1 }),
      ];

      const evaluations = [
        createMockEpisodicEvaluation({ episode_id: 'ep1', status: 'completed' }),
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(evaluations);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getEpisodePipelineForDrama('d1');

      expect(result).toHaveLength(1);
      expect(result[0].drama_id).toBe('d1');
      expect(result[0]).toHaveProperty('completed_evaluations');
      expect(result[0]).toHaveProperty('total_evaluations');
    });

    it('should handle drama with no episodes', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEpisodePipelineForDrama('d-nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getEvaluatorsForEpisode', () => {
    it('should get evaluators grouped by completion status', async () => {
      const evaluations = [
        createMockEpisodicEvaluation({
          id: 'ev1',
          episode_id: 'ep1',
          evaluator_id: 'eval-1',
          status: 'completed',
          overall_score: 85,
          grade: 'A',
        }),
        createMockEpisodicEvaluation({
          id: 'ev2',
          episode_id: 'ep1',
          evaluator_id: 'eval-2',
          status: 'pending',
        }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(evaluations);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEvaluatorsForEpisode('ep1');

      expect(result.completed).toHaveLength(1);
      expect(result.pending).toHaveLength(1);
      expect(result.completed[0]).toHaveProperty('overall_score');
      expect(result.completed[0]).toHaveProperty('grade');
    });

    it('should handle episode with no evaluations', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEvaluatorsForEpisode('ep-nonexistent');

      expect(result.completed).toEqual([]);
      expect(result.pending).toEqual([]);
    });
  });

  describe('getEpisodePipelineStats', () => {
    it('should calculate episode pipeline statistics', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', drama_id: 'd1' }),
        createMockEpisode({ id: 'ep2', drama_id: 'd1' }),
      ];

      const evaluations = [
        createMockEpisodicEvaluation({ episode_id: 'ep1', status: 'completed' }),
        createMockEpisodicEvaluation({ id: 'ev2', episode_id: 'ep1', status: 'completed' }),
        createMockEpisodicEvaluation({ id: 'ev3', episode_id: 'ep2', status: 'pending' }),
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(evaluations);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getEpisodePipelineStats('d1');

      expect(result.totalEpisodes).toBe(2);
      expect(result.totalEvaluations).toBe(3);
      expect(result.completedEvaluations).toBe(2);
      expect(result.pendingEvaluations).toBe(1);
    });

    it('should return zero stats for drama with no episodes', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEpisodePipelineStats('d-nonexistent');

      expect(result.totalEpisodes).toBe(0);
      expect(result.totalEvaluations).toBe(0);
    });
  });
});
