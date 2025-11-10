/**
 * Pipeline Value Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PipelineValueService } from '@/lib/services/analytics/pipeline-value-service';
import {
  ContractRepository,
  NegotiationRepository,
  RepositoryContext,
} from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../../mocks/supabase-mock';
import {
  mockContract,
  mockContracts,
  mockNegotiation,
  createMockContract,
  createMockNegotiation,
} from '../../mocks/mock-data';

vi.mock('@/lib/repositories/base/repository-context');

describe('PipelineValueService', () => {
  let service: PipelineValueService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    service = new PipelineValueService('server');
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getPipelineValue', () => {
    it('should get pipeline value from contracts and negotiations', async () => {
      const activeContracts = [
        createMockContract({ id: 'c1', story_id: 's1', total_amount: 5000000, status: 'active' }),
        createMockContract({ id: 'c2', story_id: 's2', total_amount: 3000000, status: 'pending' }),
      ];
      const activeNegotiations = [
        createMockNegotiation({ id: 'n1', story_id: 's3', proposed_price: 2000000, status: 'pending' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(activeContracts);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(activeNegotiations);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getPipelineValue();

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('contract');
      expect(result[2].type).toBe('contractTerm');
    });

    it('should handle empty pipeline', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getPipelineValue();

      expect(result).toEqual([]);
    });

    it('should use caching on second call', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockContract]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await service.getPipelineValue();
      const result2 = await service.getPipelineValue();

      expect(mockClient.from).toHaveBeenCalledTimes(2); // First call only
      expect(result2).toBeDefined();
    });
  });

  describe('getPipelineValueStats', () => {
    it('should calculate pipeline statistics', async () => {
      const contracts = [
        createMockContract({ total_amount: 5000000, status: 'active' }),
        createMockContract({ id: 'c2', total_amount: 3000000, status: 'pending' }),
      ];
      const negotiations = [
        createMockNegotiation({ proposed_price: 2000000, status: 'pending' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(contracts);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(negotiations);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getPipelineValueStats();

      expect(result.totalValue).toBe(10000000);
      expect(result.contractValue).toBe(8000000);
      expect(result.contractTermValue).toBe(2000000);
      expect(result.totalCount).toBe(3);
      expect(result.contractCount).toBe(2);
      expect(result.contractTermCount).toBe(1);
      expect(result.avgDealSize).toBeGreaterThan(0);
    });

    it('should return zero stats for empty pipeline', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getPipelineValueStats();

      expect(result.totalValue).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.avgDealSize).toBe(0);
    });
  });

  describe('getPipelineValueByStatus', () => {
    it('should group pipeline value by status', async () => {
      const contracts = [
        createMockContract({ total_amount: 5000000, status: 'active' }),
        createMockContract({ id: 'c2', total_amount: 3000000, status: 'pending' }),
        createMockContract({ id: 'c3', total_amount: 2000000, status: 'active' }),
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(contracts);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getPipelineValueByStatus();

      expect(result.active).toBe(7000000);
      expect(result.pending).toBe(3000000);
    });
  });
});
