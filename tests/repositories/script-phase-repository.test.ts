/**
 * ScriptPhase Repository Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScriptPhaseRepository } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../mocks/supabase-mock';
import {
  mockScriptPhase,
  mockScriptPhases,
  mockScriptPhaseInProgress,
  createMockScriptPhase,
} from '../mocks/mock-data';
import { RepositoryContext } from '@/lib/repositories/base/repository-context';

vi.mock('@/lib/repositories/base/repository-context');

describe('ScriptPhaseRepository', () => {
  let repository: ScriptPhaseRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    repository = new ScriptPhaseRepository('server');
  });

  describe('findByContractId', () => {
    it('should find all phases for a contract', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockScriptPhases);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByContractId('contract-123');

      expect(result).toEqual(mockScriptPhases);
      expect(result).toHaveLength(3);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('contract_id', 'contract-123');
    });

    it('should order by phase number', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await repository.findByContractId('contract-123');

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('phase_number', { ascending: true });
    });
  });

  describe('findByStatus', () => {
    it('should find phases by status', async () => {
      const completed = mockScriptPhases.filter(p => p.status === 'completed');
      const mockQueryBuilder = createMockQueryBuilderWithData(completed);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStatus('completed');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });
  });

  describe('getProgress', () => {
    it('should calculate progress percentage', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockScriptPhases);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.getProgress('contract-123');

      expect(result.completed).toBe(1); // One completed phase
      expect(result.total).toBe(3);
      expect(result.percentage).toBe(33); // Rounded: 1/3 * 100
    });

    it('should return 0% for no phases', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.getProgress('contract-999');

      expect(result.percentage).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findCurrentPhase', () => {
    it('should find the in-progress phase', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockScriptPhaseInProgress);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findCurrentPhase('contract-123');

      expect(result).toEqual(mockScriptPhaseInProgress);
      expect(result?.status).toBe('in_progress');
    });

    it('should return null when no current phase', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(null);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findCurrentPhase('contract-123');

      expect(result).toBeNull();
    });
  });

  describe('findCompleted', () => {
    it('should find all completed phases', async () => {
      const completed = [mockScriptPhase];
      const mockQueryBuilder = createMockQueryBuilderWithData(completed);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findCompleted('contract-123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });
  });

  describe('markAsCompleted', () => {
    it('should mark phase as completed with timestamp', async () => {
      const updatedPhase = { ...mockScriptPhaseInProgress, status: 'completed', completed_at: new Date().toISOString() };
      const mockQueryBuilder = createMockQueryBuilderWithData(updatedPhase);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.markAsCompleted('phase-456');

      expect(result.status).toBe('completed');
      expect(result.completed_at).toBeTruthy();
    });
  });
});
