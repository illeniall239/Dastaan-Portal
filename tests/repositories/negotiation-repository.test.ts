/**
 * Negotiation Repository Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NegotiationRepository } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../mocks/supabase-mock';
import {
  mockNegotiation,
  mockNegotiationAgreed,
  createMockNegotiation,
} from '../mocks/mock-data';
import { RepositoryContext } from '@/lib/repositories/base/repository-context';

vi.mock('@/lib/repositories/base/repository-context');

describe('NegotiationRepository', () => {
  let repository: NegotiationRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    repository = new NegotiationRepository('server');
  });

  describe('findByStoryId', () => {
    it('should find negotiation by story ID', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockNegotiation);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStoryId('story-123');

      expect(result).toEqual(mockNegotiation);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('story_id', 'story-123');
    });
  });

  describe('findByStatus', () => {
    it('should find negotiations by single status', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockNegotiation]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStatus('pending');

      expect(result).toHaveLength(1);
    });

    it('should find negotiations by multiple statuses', async () => {
      const negotiations = [mockNegotiation, mockNegotiationAgreed];
      const mockQueryBuilder = createMockQueryBuilderWithData(negotiations);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStatus(['pending', 'agreed']);

      expect(result).toHaveLength(2);
    });
  });

  describe('findActive', () => {
    it('should find active negotiations', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockNegotiation]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findActive();

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('status', ['pending', 'in_progress', 'counter_offer']);
    });
  });

  describe('sumPipelineValue', () => {
    it('should sum proposed prices', async () => {
      const negotiations = [
        createMockNegotiation({ proposed_price: 1000000 }),
        createMockNegotiation({ id: 'neg-2', proposed_price: 2000000 }),
      ];
      const mockQueryBuilder = createMockQueryBuilderWithData(negotiations);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.sumPipelineValue();

      expect(result).toBe(3000000);
    });

    it('should return 0 when no negotiations', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.sumPipelineValue();

      expect(result).toBe(0);
    });
  });

  describe('markAsAgreed', () => {
    it('should mark negotiation as agreed', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockNegotiationAgreed);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.markAsAgreed('negotiation-123');

      expect(result.status).toBe('agreed');
    });
  });

  describe('markAsFailed', () => {
    it('should mark negotiation as failed', async () => {
      const failed = { ...mockNegotiation, status: 'failed' };
      const mockQueryBuilder = createMockQueryBuilderWithData(failed);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.markAsFailed('negotiation-123');

      expect(result.status).toBe('failed');
    });
  });
});
