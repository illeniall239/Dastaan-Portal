/**
 * OneLiner Repository Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OneLinerRepository } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../mocks/supabase-mock';
import { mockOneLiner, createMockOneLiner } from '../mocks/mock-data';
import { RepositoryContext } from '@/lib/repositories/base/repository-context';

vi.mock('@/lib/repositories/base/repository-context');

describe('OneLinerRepository', () => {
  let repository: OneLinerRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    repository = new OneLinerRepository('server');
  });

  describe('findByStoryId', () => {
    it('should find one-liner by story ID', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockOneLiner);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStoryId('story-123');

      expect(result).toEqual(mockOneLiner);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('story_id', 'story-123');
    });
  });

  describe('findByDecision', () => {
    it('should find one-liners by decision', async () => {
      const approved = [createMockOneLiner({ decision: 'approved' })];
      const mockQueryBuilder = createMockQueryBuilderWithData(approved);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByDecision('approved');

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('decision', 'approved');
    });
  });

  describe('findApproved', () => {
    it('should find all approved one-liners', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockOneLiner]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findApproved();

      expect(result).toHaveLength(1);
    });
  });

  describe('findRejected', () => {
    it('should find all rejected one-liners', async () => {
      const rejected = createMockOneLiner({ decision: 'rejected' });
      const mockQueryBuilder = createMockQueryBuilderWithData([rejected]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findRejected();

      expect(result).toHaveLength(1);
      expect(result[0].decision).toBe('rejected');
    });
  });

  describe('findByDateRange', () => {
    it('should find one-liners in date range', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');
      const mockQueryBuilder = createMockQueryBuilderWithData([mockOneLiner]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByDateRange(fromDate, toDate);

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.gte).toHaveBeenCalled();
      expect(mockQueryBuilder.lte).toHaveBeenCalled();
    });
  });

  describe('countByDecision', () => {
    it('should count one-liners by decision', async () => {
      const oneLiners = [
        createMockOneLiner({ decision: 'approved' }),
        createMockOneLiner({ id: 'ol-2', decision: 'approved' }),
        createMockOneLiner({ id: 'ol-3', decision: 'rejected' }),
      ];
      const mockQueryBuilder = createMockQueryBuilderWithData(oneLiners);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.countByDecision();

      expect(result).toEqual({ approved: 2, rejected: 1 });
    });

    it('should count with date range filter', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockOneLiner]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const fromDate = new Date('2025-01-01');
      const result = await repository.countByDecision(fromDate);

      expect(result).toEqual({ approved: 1 });
    });
  });
});
