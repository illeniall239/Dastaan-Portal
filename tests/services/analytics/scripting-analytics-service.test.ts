/**
 * Scripting Analytics Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScriptingAnalyticsService } from '@/lib/services/analytics/scripting-analytics-service';
import {
  ContractRepository,
  ScriptPhaseRepository,
  RepositoryContext,
} from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../../mocks/supabase-mock';
import {
  createMockContract,
  createMockScriptPhase,
  mockScriptPhases,
} from '../../mocks/mock-data';

vi.mock('@/lib/repositories/base/repository-context');

describe('ScriptingAnalyticsService', () => {
  let service: ScriptingAnalyticsService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    service = new ScriptingAnalyticsService('server');
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getScriptingPhaseData', () => {
    it('should get scripting phase data for active contracts', async () => {
      const activeContracts = [
        createMockContract({ id: 'c1', project_title: 'Drama 1', status: 'active' }),
        createMockContract({ id: 'c2', project_title: 'Drama 2', status: 'in_progress' }),
      ];

      const scriptPhases = [
        createMockScriptPhase({ contract_id: 'c1', status: 'completed', phase_number: 1 }),
        createMockScriptPhase({ id: 'sp2', contract_id: 'c1', status: 'in_progress', phase_number: 2 }),
        createMockScriptPhase({ id: 'sp3', contract_id: 'c2', status: 'pending', phase_number: 1 }),
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(activeContracts);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(scriptPhases.slice(0, 2));
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const mockQueryBuilder3 = createMockQueryBuilderWithData(scriptPhases.slice(2));
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder3 as any);

      const result = await service.getScriptingPhaseData();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('contract_id');
      expect(result[0]).toHaveProperty('progress');
      expect(result[0]).toHaveProperty('current_phase');
    });

    it('should exclude fully completed contracts (100% progress)', async () => {
      const contracts = [
        createMockContract({ id: 'c1', status: 'active' }),
      ];

      const completedPhases = Array.from({ length: 6 }, (_, i) =>
        createMockScriptPhase({
          id: `sp${i + 1}`,
          contract_id: 'c1',
          status: 'completed',
          phase_number: i + 1,
        })
      );

      const mockQueryBuilder1 = createMockQueryBuilderWithData(contracts);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(completedPhases);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getScriptingPhaseData();

      // Should exclude contracts at 100% progress
      expect(result).toHaveLength(0);
    });

    it('should calculate progress percentage correctly', async () => {
      const contracts = [
        createMockContract({ id: 'c1', status: 'active' }),
      ];

      const phases = [
        createMockScriptPhase({ contract_id: 'c1', status: 'completed', phase_number: 1 }),
        createMockScriptPhase({ id: 'sp2', contract_id: 'c1', status: 'completed', phase_number: 2 }),
        createMockScriptPhase({ id: 'sp3', contract_id: 'c1', status: 'in_progress', phase_number: 3 }),
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(contracts);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData(phases);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const result = await service.getScriptingPhaseData();

      expect(result).toHaveLength(1);
      expect(result[0].progress).toBe(33); // 2 completed out of 6 = 33%
    });

    it('should handle empty contracts', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getScriptingPhaseData();

      expect(result).toEqual([]);
    });
  });

  describe('getScriptingStats', () => {
    it('should calculate overall scripting statistics', async () => {
      const contracts = [
        createMockContract({ id: 'c1', status: 'active' }),
        createMockContract({ id: 'c2', status: 'in_progress' }),
      ];

      const phases = [
        createMockScriptPhase({ contract_id: 'c1', status: 'completed' }),
        createMockScriptPhase({ id: 'sp2', contract_id: 'c1', status: 'in_progress' }),
        createMockScriptPhase({ id: 'sp3', contract_id: 'c2', status: 'pending' }),
      ];

      const mockQueryBuilder1 = createMockQueryBuilderWithData(contracts);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      const mockQueryBuilder2 = createMockQueryBuilderWithData([phases[0], phases[1]]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      const mockQueryBuilder3 = createMockQueryBuilderWithData([phases[2]]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder3 as any);

      const result = await service.getScriptingStats();

      expect(result.totalContracts).toBe(2);
      expect(result.avgProgress).toBeGreaterThanOrEqual(0);
      expect(result.avgProgress).toBeLessThanOrEqual(100);
    });
  });
});
