/**
 * Contract Repository Tests
 *
 * Tests for ContractRepository methods including:
 * - Finding contracts by various criteria
 * - Creating and updating contracts
 * - Aggregation methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContractRepository } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
  createMockQueryBuilderWithError,
  createSuccessResponse,
  createErrorResponse,
} from '../mocks/supabase-mock';
import {
  mockContract,
  mockContracts,
  createMockContract,
} from '../mocks/mock-data';
import { RepositoryContext } from '@/lib/repositories/base/repository-context';

// Mock the repository context
vi.mock('@/lib/repositories/base/repository-context');

describe('ContractRepository', () => {
  let repository: ContractRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    repository = new ContractRepository('server');
  });

  describe('findByContractNumber', () => {
    it('should find contract by contract number', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockContract);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByContractNumber('CON-2025-0001');

      expect(result).toEqual(mockContract);
      expect(mockClient.from).toHaveBeenCalledWith('contracts');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('contract_number', 'CON-2025-0001');
    });

    it('should return null when contract not found', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(null);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByContractNumber('NON-EXISTENT');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithError('Database error');
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByContractNumber('CON-2025-0001');

      // Repository returns null on error rather than throwing
      expect(result).toBeNull();
    });
  });

  describe('findByStoryId', () => {
    it('should find all contracts for a story', async () => {
      const storyContracts = [mockContracts[0], mockContracts[1]];
      const mockQueryBuilder = createMockQueryBuilderWithData(storyContracts);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStoryId('story-123');

      expect(result).toEqual(storyContracts);
      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('story_id', 'story-123');
    });

    it('should return empty array when no contracts found', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStoryId('story-999');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findActive', () => {
    it('should find all active contracts', async () => {
      const activeContracts = mockContracts.filter(c => c.status === 'active');
      const mockQueryBuilder = createMockQueryBuilderWithData(activeContracts);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findActive();

      expect(result).toEqual(activeContracts);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should apply custom select fields', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await repository.findActive({ select: 'id, contract_number' });

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('id, contract_number');
    });
  });

  describe('findByStatus', () => {
    it('should find contracts by single status', async () => {
      const pendingContracts = mockContracts.filter(c => c.status === 'pending');
      const mockQueryBuilder = createMockQueryBuilderWithData(pendingContracts);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStatus('pending');

      expect(result).toEqual(pendingContracts);
    });

    it('should find contracts by multiple statuses', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockContracts);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStatus(['active', 'pending']);

      expect(result).toEqual(mockContracts);
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('status', ['active', 'pending']);
    });
  });

  describe('findByDateRange', () => {
    it('should find contracts within date range', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');
      const mockQueryBuilder = createMockQueryBuilderWithData([mockContract]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByDateRange(fromDate, toDate);

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('created_at', fromDate.toISOString());
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('created_at', toDate.toISOString());
    });

    it('should apply additional filters', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await repository.findByDateRange(fromDate, toDate, {
        filters: { status: 'active' },
      });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('findWithScriptPhases', () => {
    it('should find contracts with script phases included', async () => {
      const contractWithPhases = {
        ...mockContract,
        script_phases: [
          { id: 'phase-1', phase_name: 'Draft 1', status: 'completed' },
        ],
      };
      const mockQueryBuilder = createMockQueryBuilderWithData([contractWithPhases]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findWithScriptPhases();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('script_phases');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });

    it('should apply custom select fields for script phases', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await repository.findWithScriptPhases({
        select: 'id, script_phases(phase_name, status)',
      });

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('id, script_phases(phase_name, status)');
    });
  });

  describe('sumTotalValue', () => {
    it('should calculate sum of all contract values', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockContracts);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.sumTotalValue();

      const expectedSum = mockContracts.reduce((sum, c) => sum + c.total_amount, 0);
      expect(result).toBe(expectedSum);
    });

    it('should return 0 when no contracts found', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.sumTotalValue();

      expect(result).toBe(0);
    });

    it('should apply filters when summing', async () => {
      const activeContracts = mockContracts.filter(c => c.status === 'active');
      const mockQueryBuilder = createMockQueryBuilderWithData(activeContracts);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.sumTotalValue({ status: 'active' });

      const expectedSum = activeContracts.reduce((sum, c) => sum + c.total_amount, 0);
      expect(result).toBe(expectedSum);
    });
  });

  describe('createContract', () => {
    it('should create a new contract with default status', async () => {
      const newContractData = {
        contract_number: 'CON-2025-0004',
        story_id: 'story-456',
        project_title: 'New Drama',
        total_amount: 7000000,
        signed_date: '2025-02-01',
        created_by: 'user-123',
      };

      const createdContract = { ...newContractData, id: 'contract-new', status: 'pending' };
      const mockQueryBuilder = createMockQueryBuilderWithData(createdContract);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.createContract(newContractData);

      expect(result).toEqual(createdContract);
      expect(result.status).toBe('pending');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it('should create contract with custom status', async () => {
      const newContractData = {
        contract_number: 'CON-2025-0005',
        story_id: 'story-456',
        project_title: 'Another Drama',
        total_amount: 4000000,
        signed_date: '2025-02-01',
        status: 'active',
        created_by: 'user-123',
      };

      const mockQueryBuilder = createMockQueryBuilderWithData(newContractData);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.createContract(newContractData);

      expect(result.status).toBe('active');
    });
  });

  describe('updateStatus', () => {
    it('should update contract status', async () => {
      const updatedContract = { ...mockContract, status: 'completed' };
      const mockQueryBuilder = createMockQueryBuilderWithData(updatedContract);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.updateStatus('contract-123', 'completed');

      expect(result.status).toBe('completed');
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'contract-123');
    });

    it('should handle update errors', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithError('Update failed');
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await expect(
        repository.updateStatus('contract-123', 'completed')
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      vi.mocked(RepositoryContext.getClient).mockRejectedValue(new Error('Connection failed'));

      await expect(repository.findByContractNumber('CON-2025-0001')).rejects.toThrow('Connection failed');
    });

    it('should handle malformed query responses', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(null);
      mockQueryBuilder.then = vi.fn((resolve) => resolve({ data: undefined, error: null }));
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByContractNumber('CON-2025-0001');

      expect(result).toBeNull();
    });
  });
});
