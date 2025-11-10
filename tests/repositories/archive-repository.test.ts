/**
 * Archive Repository Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArchiveRepository } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../mocks/supabase-mock';
import {
  mockArchive,
  mockRejectedArchive,
  createMockArchive,
} from '../mocks/mock-data';
import { RepositoryContext } from '@/lib/repositories/base/repository-context';

vi.mock('@/lib/repositories/base/repository-context');

describe('ArchiveRepository', () => {
  let repository: ArchiveRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    repository = new ArchiveRepository('server');
  });

  describe('findAllStoryArchives', () => {
    it('should find all story archives', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockArchive]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findAllStoryArchives();

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('archived_at', { ascending: false });
    });
  });

  describe('findStoryArchivesByGenre', () => {
    it('should find archives by genre', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockArchive]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findStoryArchivesByGenre('Drama');

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('story.genre', 'Drama');
    });
  });

  describe('findAllRejectedReports', () => {
    it('should find all rejected call reports', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockRejectedArchive]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findAllRejectedReports();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('working_title');
    });
  });

  describe('findByStoryId', () => {
    it('should find archive by story ID', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockArchive);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStoryId('story-123');

      expect(result).toEqual(mockArchive);
    });
  });

  describe('findByRejectionStage', () => {
    it('should find archives by rejection stage', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockArchive]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByRejectionStage('evaluation');

      expect(result).toHaveLength(1);
      expect(result[0].rejection_stage).toBe('evaluation');
    });
  });

  describe('findByDateRange', () => {
    it('should find archives in date range', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');
      const mockQueryBuilder = createMockQueryBuilderWithData([mockArchive]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByDateRange(fromDate, toDate);

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('archived_at', fromDate.toISOString());
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('archived_at', toDate.toISOString());
    });
  });

  describe('countStoryArchives', () => {
    it('should count story archives', async () => {
      mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: 5, error: null }),
      });

      const result = await repository.countStoryArchives();

      expect(result).toBe(5);
    });
  });

  describe('countRejectedReports', () => {
    it('should count rejected call reports', async () => {
      mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: 3, error: null }),
      });

      const result = await repository.countRejectedReports();

      expect(result).toBe(3);
    });
  });

  describe('createStoryArchive', () => {
    it('should create story archive with default archived_at', async () => {
      const archiveData = {
        story_id: 'story-123',
        rejection_stage: 'evaluation',
        rejection_reason: 'Low scores',
      };

      const created = { ...archiveData, id: 'archive-new', archived_at: new Date().toISOString() };
      const mockQueryBuilder = createMockQueryBuilderWithData(created);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.createStoryArchive(archiveData);

      expect(result.archived_at).toBeTruthy();
    });
  });

  describe('createRejectedReport', () => {
    it('should create rejected report with default archived_at', async () => {
      const reportData = {
        call_report_id: 'report-123',
        working_title: 'Test Report',
        writer_name: 'John Writer',
      };

      const created = { ...reportData, id: 'rejected-new', archived_at: new Date().toISOString() };
      const mockQueryBuilder = createMockQueryBuilderWithData(created);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.createRejectedReport(reportData);

      expect(result.archived_at).toBeTruthy();
    });
  });
});
