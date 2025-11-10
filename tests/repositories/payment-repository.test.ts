/**
 * Payment Repository Tests
 *
 * Tests for PaymentRepository methods including:
 * - Finding payments by various criteria
 * - Managing payment status
 * - Aggregation methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentRepository } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
  createMockQueryBuilderWithError,
} from '../mocks/supabase-mock';
import {
  mockPayment,
  mockPayments,
  mockPaymentPaid,
  createMockPayment,
} from '../mocks/mock-data';
import { RepositoryContext } from '@/lib/repositories/base/repository-context';

vi.mock('@/lib/repositories/base/repository-context');

describe('PaymentRepository', () => {
  let repository: PaymentRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    repository = new PaymentRepository('server');
  });

  describe('findByContractId', () => {
    it('should find payments for a contract', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockPayments);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByContractId('contract-123');

      expect(result).toEqual(mockPayments);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('contract_id', 'contract-123');
    });

    it('should order by due date by default', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await repository.findByContractId('contract-123');

      expect(mockQueryBuilder.order).toHaveBeenCalled();
    });
  });

  describe('findByStatus', () => {
    it('should find payments by single status', async () => {
      const pendingPayments = mockPayments.filter(p => p.status === 'pending');
      const mockQueryBuilder = createMockQueryBuilderWithData(pendingPayments);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStatus('pending');

      expect(result).toHaveLength(pendingPayments.length);
    });

    it('should find payments by multiple statuses', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockPayments);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByStatus(['pending', 'paid']);

      expect(mockQueryBuilder.in).toHaveBeenCalled();
    });
  });

  describe('findOverdue', () => {
    it('should find overdue pending payments', async () => {
      const overduePayment = createMockPayment({
        due_date: '2024-12-01',
        status: 'pending',
      });
      const mockQueryBuilder = createMockQueryBuilderWithData([overduePayment]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findOverdue();

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'pending');
      expect(mockQueryBuilder.lt).toHaveBeenCalled();
    });

    it('should order by due date ascending', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await repository.findOverdue();

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('due_date', { ascending: true });
    });
  });

  describe('findByDateRange', () => {
    it('should find payments in date range', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-03-31');
      const mockQueryBuilder = createMockQueryBuilderWithData(mockPayments);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByDateRange(fromDate, toDate);

      expect(result).toHaveLength(mockPayments.length);
      expect(mockQueryBuilder.gte).toHaveBeenCalled();
      expect(mockQueryBuilder.lte).toHaveBeenCalled();
    });
  });

  describe('findPending', () => {
    it('should find all pending payments', async () => {
      const pendingPayments = mockPayments.filter(p => p.status === 'pending');
      const mockQueryBuilder = createMockQueryBuilderWithData(pendingPayments);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findPending();

      expect(result).toHaveLength(pendingPayments.length);
    });
  });

  describe('findPaid', () => {
    it('should find all paid payments', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([mockPaymentPaid]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findPaid();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('paid');
    });
  });

  describe('createPayment', () => {
    it('should create payment with default pending status', async () => {
      const paymentData = {
        contract_id: 'contract-123',
        amount: 500000,
        due_date: '2025-04-01',
        milestone_description: 'Test milestone',
      };

      const createdPayment = { ...paymentData, id: 'payment-new', status: 'pending' };
      const mockQueryBuilder = createMockQueryBuilderWithData(createdPayment);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.createPayment(paymentData);

      expect(result.status).toBe('pending');
    });
  });

  describe('markAsPaid', () => {
    it('should mark payment as paid with current date', async () => {
      const updatedPayment = { ...mockPayment, status: 'paid', paid_date: new Date().toISOString() };
      const mockQueryBuilder = createMockQueryBuilderWithData(updatedPayment);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.markAsPaid('payment-123');

      expect(result.status).toBe('paid');
      expect(result.paid_date).toBeTruthy();
    });

    it('should mark payment as paid with specific date', async () => {
      const paidDate = new Date('2025-03-01');
      const updatedPayment = { ...mockPayment, status: 'paid', paid_date: paidDate.toISOString() };
      const mockQueryBuilder = createMockQueryBuilderWithData(updatedPayment);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.markAsPaid('payment-123', paidDate);

      expect(result.paid_date).toBe(paidDate.toISOString());
    });
  });

  describe('sumAmount', () => {
    it('should calculate sum of all payment amounts', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData(mockPayments);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.sumAmount();

      const expectedSum = mockPayments.reduce((sum, p) => sum + p.amount, 0);
      expect(result).toBe(expectedSum);
    });

    it('should return 0 when no payments found', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.sumAmount();

      expect(result).toBe(0);
    });

    it('should sum with filters', async () => {
      const paidPayments = mockPayments.filter(p => p.status === 'paid');
      const mockQueryBuilder = createMockQueryBuilderWithData(paidPayments);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await repository.sumAmount({ status: 'paid' });

      const expectedSum = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      expect(result).toBe(expectedSum);
    });
  });
});
