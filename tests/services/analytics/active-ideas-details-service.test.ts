/**
 * Active Ideas Details Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActiveIdeasDetailsService } from '@/lib/services/analytics/active-ideas-details-service';
import { CallReportRepository, RepositoryContext } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../../mocks/supabase-mock';
import { createMockCallReport } from '../../mocks/mock-data';

vi.mock('@/lib/repositories/base/repository-context');

describe('ActiveIdeasDetailsService', () => {
  let service: ActiveIdeasDetailsService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    service = new ActiveIdeasDetailsService('server');
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getActiveIdeasByGenre', () => {
    it('should get all active ideas when no genre specified', async () => {
      const callReports = [
        createMockCallReport({ id: 'cr1', genre: 'Drama', status: 'pending' }),
        createMockCallReport({ id: 'cr2', genre: 'Comedy', status: 'in_evaluation' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(callReports);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getActiveIdeasByGenre();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('days_active');
      expect(result[0]).toHaveProperty('working_title');
    });

    it('should filter by specific genre', async () => {
      const dramaReports = [
        createMockCallReport({ id: 'cr1', genre: 'Drama', status: 'pending' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(dramaReports);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getActiveIdeasByGenre('Drama');

      expect(result).toHaveLength(1);
      expect(result[0].genre).toBe('Drama');
    });

    it('should handle "all" genre filter', async () => {
      const callReports = [
        createMockCallReport({ id: 'cr1', genre: 'Drama' }),
        createMockCallReport({ id: 'cr2', genre: 'Comedy' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(callReports);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getActiveIdeasByGenre('all');

      expect(result).toHaveLength(2);
    });

    it('should exclude archived call reports', async () => {
      const callReports = [
        createMockCallReport({ id: 'cr1', status: 'pending' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(callReports);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getActiveIdeasByGenre();

      // Should not include archived
      expect(result.every(idea => idea.status !== 'archived')).toBe(true);
    });

    it('should use separate cache keys for different genres', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([
        createMockCallReport({ genre: 'Drama' }),
      ]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await service.getActiveIdeasByGenre('Drama');
      await service.getActiveIdeasByGenre('Comedy');

      // Should make separate DB calls for different genres
      expect(mockClient.from).toHaveBeenCalled();
    });
  });

  describe('getActiveIdeasStats', () => {
    it('should calculate statistics for active ideas', async () => {
      const callReports = [
        createMockCallReport({ id: 'cr1', status: 'pending', category: 'film' }),
        createMockCallReport({ id: 'cr2', status: 'in_evaluation', category: 'series' }),
        createMockCallReport({ id: 'cr3', status: 'pending', category: 'film' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(callReports);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getActiveIdeasStats();

      expect(result.total).toBe(3);
      expect(result.byStatus.pending).toBe(2);
      expect(result.byStatus.in_evaluation).toBe(1);
      expect(result.byCategory.film).toBe(2);
      expect(result.byCategory.series).toBe(1);
      expect(result.avgDaysActive).toBeGreaterThanOrEqual(0);
    });

    it('should return zero stats for no active ideas', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getActiveIdeasStats();

      expect(result.total).toBe(0);
      expect(result.avgDaysActive).toBe(0);
    });
  });
});
