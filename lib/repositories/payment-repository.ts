/**
 * Payment Repository
 *
 * Handles data access for payments table.
 * Payments track individual payment transactions for contract milestones.
 *
 * Usage:
 * ```typescript
 * const paymentRepo = new PaymentRepository('server');
 * const overduePayments = await paymentRepo.findOverdue();
 * ```
 */

import { BaseRepository, QueryOptions, type RepositoryContextType } from './base';
import { logger } from '@/lib/logger';

/**
 * Payment data structure
 */
export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  milestone_description: string;
  status: string;
  paid_date?: string;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  contract?: any;
}

/**
 * Payment create data
 */
export interface PaymentCreateData {
  contract_id: string;
  amount: number;
  due_date: string;
  milestone_description: string;
  status?: string;
}

/**
 * Payment update data
 */
export interface PaymentUpdateData {
  amount?: number;
  due_date?: string;
  milestone_description?: string;
  status?: string;
  paid_date?: string;
}

/**
 * Payment repository
 * Provides data access methods for payments
 */
export class PaymentRepository extends BaseRepository<Payment> {
  constructor(context: RepositoryContextType = 'server') {
    super('payments', context);
  }

  /**
   * Find payments by contract ID
   *
   * @param contractId - Contract ID
   * @param options - Query options
   * @returns Array of payments
   */
  async findByContractId(
    contractId: string,
    options?: QueryOptions
  ): Promise<Payment[]> {
    try {
      logger.info(`Finding payments for contract: ${contractId}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, contract_id: contractId },
        order: options?.order || { column: 'due_date', ascending: true },
      });
    } catch (error) {
      logger.error(`Error finding payments by contract: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find payments by status
   *
   * @param status - Payment status or array of statuses
   * @param options - Query options
   * @returns Array of payments
   */
  async findByStatus(
    status: string | string[],
    options?: QueryOptions
  ): Promise<Payment[]> {
    try {
      logger.info(`Finding payments by status: ${status}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, status },
      });
    } catch (error) {
      logger.error(`Error finding payments by status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find overdue payments
   *
   * @param options - Query options
   * @returns Array of overdue payments
   */
  async findOverdue(options?: QueryOptions): Promise<Payment[]> {
    try {
      logger.info('Finding overdue payments');

      const client = await this.getClient();
      const now = new Date();

      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .eq('status', 'pending')
        .lt('due_date', now.toISOString());

      // Apply order
      if (options?.order) {
        const orders = Array.isArray(options.order) ? options.order : [options.order];
        orders.forEach(order => {
          query = query.order(order.column, {
            ascending: order.ascending ?? true,
          });
        });
      } else {
        query = query.order('due_date', { ascending: true });
      }

      // Apply pagination
      if (options?.pagination) {
        const { limit, offset } = options.pagination;
        if (limit !== undefined) {
          if (offset !== undefined) {
            query = query.range(offset, offset + limit - 1);
          } else {
            query = query.limit(limit);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      logger.info(`Found ${data?.length || 0} overdue payments`);
      return (data as unknown as Payment[]) || [];
    } catch (error) {
      logger.error(`Error finding overdue payments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find payments by date range
   *
   * @param fromDate - Start date
   * @param toDate - End date
   * @param options - Query options
   * @returns Array of payments
   */
  async findByDateRange(
    fromDate: Date,
    toDate: Date,
    options?: QueryOptions
  ): Promise<Payment[]> {
    try {
      logger.info(`Finding payments between ${fromDate.toISOString()} and ${toDate.toISOString()}`);

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString());

      // Apply additional filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      // Apply order
      if (options?.order) {
        const orders = Array.isArray(options.order) ? options.order : [options.order];
        orders.forEach(order => {
          query = query.order(order.column, {
            ascending: order.ascending ?? true,
          });
        });
      }

      // Apply pagination
      if (options?.pagination) {
        const { limit, offset } = options.pagination;
        if (limit !== undefined) {
          if (offset !== undefined) {
            query = query.range(offset, offset + limit - 1);
          } else {
            query = query.limit(limit);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      logger.info(`Found ${data?.length || 0} payments in date range`);
      return (data as unknown as Payment[]) || [];
    } catch (error) {
      logger.error(`Error finding payments by date range: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find pending payments
   *
   * @param options - Query options
   * @returns Array of pending payments
   */
  async findPending(options?: QueryOptions): Promise<Payment[]> {
    try {
      logger.info('Finding pending payments');

      return await this.findByStatus('pending', options);
    } catch (error) {
      logger.error(`Error finding pending payments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find paid payments
   *
   * @param options - Query options
   * @returns Array of paid payments
   */
  async findPaid(options?: QueryOptions): Promise<Payment[]> {
    try {
      logger.info('Finding paid payments');

      return await this.findByStatus('paid', options);
    } catch (error) {
      logger.error(`Error finding paid payments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create payment
   *
   * @param data - Payment data
   * @returns Created payment
   */
  async createPayment(data: PaymentCreateData): Promise<Payment> {
    try {
      logger.info(`Creating payment for contract: ${data.contract_id}`);

      const paymentData = {
        ...data,
        status: data.status || 'pending',
      };

      return await this.create(paymentData as unknown as Partial<Payment>);
    } catch (error) {
      logger.error(`Error creating payment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark payment as paid
   *
   * @param paymentId - Payment ID
   * @param paidDate - Payment date (defaults to now)
   * @returns Updated payment
   */
  async markAsPaid(paymentId: string, paidDate?: Date): Promise<Payment> {
    try {
      logger.info(`Marking payment ${paymentId} as paid`);

      return await this.update(paymentId, {
        status: 'paid',
        paid_date: (paidDate || new Date()).toISOString(),
      } as unknown as Partial<Payment>);
    } catch (error) {
      logger.error(`Error marking payment as paid: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update payment
   *
   * @param paymentId - Payment ID
   * @param data - Update data
   * @returns Updated payment
   */
  async updatePayment(paymentId: string, data: PaymentUpdateData): Promise<Payment> {
    try {
      logger.info(`Updating payment: ${paymentId}`);

      return await this.update(paymentId, data as unknown as Partial<Payment>);
    } catch (error) {
      logger.error(`Error updating payment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Sum total amount of payments
   *
   * @param filters - Optional filters
   * @returns Total amount sum
   */
  async sumAmount(filters?: Record<string, any>): Promise<number> {
    try {
      logger.info('Calculating sum of payment amounts');

      const payments = await this.findAll({
        select: 'amount',
        filters,
      });

      const sum = payments.reduce((acc, payment) => acc + (payment.amount || 0), 0);

      logger.info(`Total payment amount: ${sum}`);
      return sum;
    } catch (error) {
      logger.error(`Error summing payment amounts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
