/**
 * Archive Details Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArchiveDetailsService } from '@/lib/services/analytics/archive-details-service';
import { ArchiveRepository, RepositoryContext } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../../mocks/supabase-mock';
import {
  mockArchive,
  mockRejectedArchive,
  createMockArchive,
} from '../../mocks/mock-data';

vi.mock('@/lib/repositories/base/repository-context');

describe('ArchiveDetailsService', () => {
  let service: ArchiveDetailsService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    service = new ArchiveDetailsService('server');
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getArchiveStoriesByGenre', () => {
    it('should get all archived stories when no genre specified', async () => {
      const archives = [
        createMockArchive({ id: 'a1', story: { genre: 'Drama' } }),
        createMockArchive({ id: 'a2', story: { genre: 'Comedy' } }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(archives);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getArchiveStoriesByGenre();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('genre');
      expect(result[0]).toHaveProperty('rejection_reason');
    });

    it('should filter by specific genre', async () => {
      const dramaArchives = [
        createMockArchive({ id: 'a1', story: { genre: 'Drama' } }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(dramaArchives);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getArchiveStoriesByGenre('Drama');

      expect(result).toHaveLength(1);
      expect(result[0].genre).toBe('Drama');
    });

    it('should handle "all" genre filter', async () => {
      const archives = [
        createMockArchive({ id: 'a1', story: { genre: 'Drama' } }),
        createMockArchive({ id: 'a2', story: { genre: 'Comedy' } }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(archives);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getArchiveStoriesByGenre('all');

      expect(result).toHaveLength(2);
    });
  });

  describe('getRejectedCallReportsByGenre', () => {
    it('should get all rejected call reports', async () => {
      const rejectedReports = [
        { ...mockRejectedArchive, id: 'r1' },
        { ...mockRejectedArchive, id: 'r2' },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(rejectedReports);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRejectedCallReportsByGenre();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('working_title');
      expect(result[0].type).toBe('rejected_call_report');
    });

    it('should filter by genre', async () => {
      const dramaReports = [
        { ...mockRejectedArchive, genre: 'Drama' },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(dramaReports);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRejectedCallReportsByGenre('Drama');

      expect(result).toHaveLength(1);
      expect(result[0].genre).toBe('Drama');
    });
  });

  describe('getCombinedArchiveDetails', () => {
    it('should combine story archives and rejected reports', async () => {
      const storyArchives = [
        createMockArchive({ id: 'a1', archived_at: '2025-01-15' }),
      ];
      const rejectedReports = [
        { ...mockRejectedArchive, id: 'r1', archived_at: '2025-01-10' },
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(storyArchives);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(rejectedReports);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getCombinedArchiveDetails();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('archived_story');
      expect(result[1].type).toBe('rejected_call_report');
    });

    it('should sort by rejection date descending', async () => {
      const archives = [
        createMockArchive({ id: 'a1', archived_at: '2025-01-10' }),
        createMockArchive({ id: 'a2', archived_at: '2025-01-20' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(archives);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getCombinedArchiveDetails();

      // Most recent should be first
      expect(new Date(result[0].rejection_date).getTime()).toBeGreaterThan(
        new Date(result[1].rejection_date).getTime()
      );
    });

    it('should handle genre filtering', async () => {
      const dramaArchives = [
        createMockArchive({ id: 'a1', story: { genre: 'Drama' } }),
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(dramaArchives);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getCombinedArchiveDetails('Drama');

      expect(result).toHaveLength(1);
      expect(result[0].genre).toBe('Drama');
    });
  });

  describe('getArchiveStats', () => {
    it('should calculate archive statistics', async () => {
      const archives = [
        createMockArchive({ id: 'a1', story: { genre: 'Drama' }, rejection_stage: 'evaluation' }),
        createMockArchive({ id: 'a2', story: { genre: 'Comedy' }, rejection_stage: 'approval' }),
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(archives);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getArchiveStats();

      expect(result.totalArchived).toBe(2);
      expect(result.byGenre.Drama).toBe(1);
      expect(result.byGenre.Comedy).toBe(1);
      expect(result.byStage.evaluation).toBe(1);
      expect(result.byStage.approval).toBe(1);
    });

    it('should return zero stats for empty archive', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getArchiveStats();

      expect(result.totalArchived).toBe(0);
      expect(Object.keys(result.byGenre)).toHaveLength(0);
    });
  });
});
