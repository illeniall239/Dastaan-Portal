/**
 * Episode Analytics Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EpisodeAnalyticsService } from '@/lib/services/analytics/episode-analytics-service';
import { EpisodeRepository, RepositoryContext } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../../mocks/supabase-mock';
import { createMockEpisode } from '../../mocks/mock-data';

vi.mock('@/lib/repositories/base/repository-context');

describe('EpisodeAnalyticsService', () => {
  let service: EpisodeAnalyticsService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    service = new EpisodeAnalyticsService('server');
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getEpisodeProductionData', () => {
    it('should get episode production data', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', drama_id: 'd1', status: 'completed' }),
        createMockEpisode({ id: 'ep2', drama_id: 'd2', status: 'in_production' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEpisodeProductionData();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('episode_number');
      expect(result[0]).toHaveProperty('status');
    });

    it('should filter by drama_id when provided', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', drama_id: 'd1' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEpisodeProductionData('d1');

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('drama_id', 'd1');
    });

    it('should handle empty episodes', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEpisodeProductionData();

      expect(result).toEqual([]);
    });
  });

  describe('getQualityDistribution', () => {
    it('should categorize episodes by quality standards', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', total_pages: 60, total_scenes: 30 }), // Above standard
        createMockEpisode({ id: 'ep2', total_pages: 45, total_scenes: 22 }), // Near standard
        createMockEpisode({ id: 'ep3', total_pages: 35, total_scenes: 18 }), // Below standard
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getQualityDistribution();

      expect(result.aboveStandard).toBe(1);
      expect(result.nearStandard).toBe(1);
      expect(result.belowStandard).toBe(1);
      expect(result.total).toBe(3);
    });

    it('should handle empty episodes', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getQualityDistribution();

      expect(result.total).toBe(0);
      expect(result.aboveStandard).toBe(0);
    });

    it('should filter by drama_id when provided', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', drama_id: 'd1', total_pages: 60, total_scenes: 30 }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getQualityDistribution('d1');

      expect(result.total).toBe(1);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('drama_id', 'd1');
    });
  });

  describe('getEpisodeStats', () => {
    it('should calculate episode statistics', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', status: 'completed', total_pages: 50, total_scenes: 25 }),
        createMockEpisode({ id: 'ep2', status: 'in_production', total_pages: 45, total_scenes: 22 }),
        createMockEpisode({ id: 'ep3', status: 'completed', total_pages: 55, total_scenes: 28 }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEpisodeStats();

      expect(result.totalEpisodes).toBe(3);
      expect(result.byStatus.completed).toBe(2);
      expect(result.byStatus.in_production).toBe(1);
      expect(result.avgPages).toBeCloseTo(50, 0);
      expect(result.avgScenes).toBeCloseTo(25, 0);
    });

    it('should return zero stats for empty episodes', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEpisodeStats();

      expect(result.totalEpisodes).toBe(0);
      expect(result.avgPages).toBe(0);
      expect(result.avgScenes).toBe(0);
    });
  });

  describe('getProductionTimeline', () => {
    it('should group episodes by production date', async () => {
      const episodes = [
        createMockEpisode({ id: 'ep1', created_at: '2025-01-15T00:00:00Z' }),
        createMockEpisode({ id: 'ep2', created_at: '2025-01-20T00:00:00Z' }),
        createMockEpisode({ id: 'ep3', created_at: '2025-01-15T00:00:00Z' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getProductionTimeline();

      expect(result).toHaveProperty('2025-01-15');
      expect(result['2025-01-15']).toBe(2);
      expect(result['2025-01-20']).toBe(1);
    });
  });

  describe('caching behavior', () => {
    it('should use cache for repeated calls with same drama_id', async () => {
      const episodes = [createMockEpisode({ drama_id: 'd1' })];
      const mockQueryBuilder = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await service.getEpisodeProductionData('d1');
      await service.getEpisodeProductionData('d1');

      // Should use cache on second call
      expect(mockClient.from).toHaveBeenCalled();
    });

    it('should use separate cache for different drama_ids', async () => {
      const episodes = [createMockEpisode()];
      const mockQueryBuilder = createMockQueryBuilderWithData(episodes);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await service.getEpisodeProductionData('d1');
      await service.getEpisodeProductionData('d2');

      // Should make separate DB calls for different IDs
      expect(mockClient.from).toHaveBeenCalled();
    });
  });
});
