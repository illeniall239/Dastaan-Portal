/**
 * Payment Analytics Service
 *
 * Handles analytics for overdue payments in the management dashboard.
 * Tracks payment milestones that are past their due date.
 *
 * Usage:
 * ```typescript
 * const service = new PaymentAnalyticsService('server');
 * const overduePayments = await service.getOverduePayments();
 * const stats = await service.getOverduePaymentsStats();
 * ```
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Overdue payment data structure
 */
export interface OverduePayment {
  id: string;
  payment_id: string;
  story_title: string;
  story_id: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  milestone: string;
  status: string;
  contract_id: string;
}

/**
 * Overdue payments statistics
 */
export interface OverduePaymentsStats {
  total: number;
  totalAmount: number;
  avgDaysOverdue: number;
  criticalCount: number; // >30 days overdue
}

/**
 * Payment analytics service
 * TODO: Migrate to PaymentRepository once created
 */
export class PaymentAnalyticsService extends BaseAnalyticsService {
  private context: RepositoryContextType;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.context = context;
  }

  /**
   * Get Supabase client based on context
   */
  private async getClient() {
    switch (this.context) {
      case 'server':
        return await createServerClient();
      case 'client':
        return createBrowserClient();
      case 'admin':
        return createAdminClient();
      default:
        throw new Error(`Invalid repository context type: ${this.context}`);
    }
  }

  /**
   * Get all overdue payments
   * Payments with status = 'pending' and due_date < now
   *
   * @returns Array of overdue payments with calculated metrics
   */
  async getOverduePayments(): Promise<OverduePayment[]> {
    try {
      logger.info('Getting overdue payments');

      return await this.withCache(
        'analytics:overdue-payments',
        async () => {
          const supabase = await this.getClient();
          const now = new Date();

          // Get all payments that are overdue (status = 'pending' and due_date < now)
          // TODO: Replace with PaymentRepository.findOverdue() once created
          const { data: payments, error } = await supabase
            .from('payments')
            .select(
              `
              id,
              amount,
              due_date,
              milestone_description,
              status,
              contract_id,
              contract:contracts (
                id,
                story:stories (
                  id,
                  story_id,
                  title
                )
              )
            `
            )
            .eq('status', 'pending')
            .lt('due_date', now.toISOString())
            .order('due_date', { ascending: true });

          if (error) {
            throw new Error(`Failed to fetch overdue payments: ${error.message}`);
          }

          // Transform to OverduePayment format with calculated metrics
          const overduePayments: OverduePayment[] = (payments || []).map((payment: any) => {
            const story = payment.contract?.story;

            return {
              id: payment.id,
              payment_id: `PAY-${payment.id.slice(0, 8).toUpperCase()}`,
              story_title: story?.title || 'Unknown',
              story_id: story?.story_id || 'N/A',
              amount: payment.amount,
              due_date: payment.due_date,
              days_overdue: TimeUtils.daysSince(payment.due_date),
              milestone: payment.milestone_description || 'N/A',
              status: payment.status,
              contract_id: payment.contract_id,
            };
          });

          logger.info(`Found ${overduePayments.length} overdue payments`);
          return overduePayments;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get overdue payments');
    }
  }

  /**
   * Get overdue payments statistics
   * Includes totals, amounts, and averages
   *
   * @returns Statistics object
   */
  async getOverduePaymentsStats(): Promise<OverduePaymentsStats> {
    try {
      logger.info('Getting overdue payments statistics');

      return await this.withCache(
        'analytics:overdue-payments-stats',
        async () => {
          const payments = await this.getOverduePayments();

          const stats: OverduePaymentsStats = {
            total: payments.length,
            totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
            avgDaysOverdue: 0,
            criticalCount: payments.filter((p) => p.days_overdue > 30).length,
          };

          // Calculate average days overdue
          if (payments.length > 0) {
            const avgDays = StatsUtils.average(payments.map((p) => p.days_overdue));
            stats.avgDaysOverdue = Math.round(avgDays);
          }

          logger.info(
            `Overdue payments stats: ${stats.total} total, ${stats.totalAmount} amount, ${stats.criticalCount} critical`
          );
          return stats;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get overdue payments stats');
    }
  }

  /**
   * Get critical overdue payments (overdue for more than threshold days)
   *
   * @param daysThreshold - Number of days to consider critical (default: 30)
   * @returns Array of critical overdue payments
   */
  async getCriticalOverduePayments(daysThreshold: number = 30): Promise<OverduePayment[]> {
    try {
      logger.info(`Getting critical overdue payments (>${daysThreshold} days)`);

      const allPayments = await this.getOverduePayments();
      const critical = allPayments.filter((p) => p.days_overdue > daysThreshold);

      logger.info(`Found ${critical.length} critical overdue payments`);
      return critical;
    } catch (error) {
      this.handleError(error, `get critical overdue payments (threshold: ${daysThreshold})`);
    }
  }

  /**
   * Get overdue payments by contract
   *
   * @param contractId - Contract ID to filter by
   * @returns Array of overdue payments for the contract
   */
  async getOverduePaymentsByContract(contractId: string): Promise<OverduePayment[]> {
    try {
      logger.info(`Getting overdue payments for contract: ${contractId}`);

      const allPayments = await this.getOverduePayments();
      return allPayments.filter((p) => p.contract_id === contractId);
    } catch (error) {
      this.handleError(error, `get overdue payments by contract ${contractId}`);
    }
  }

  /**
   * Get large overdue payments (amount above threshold)
   *
   * @param amountThreshold - Minimum amount (default: 100000)
   * @returns Array of large overdue payments
   */
  async getLargeOverduePayments(amountThreshold: number = 100000): Promise<OverduePayment[]> {
    try {
      logger.info(`Getting large overdue payments (>${amountThreshold})`);

      const allPayments = await this.getOverduePayments();
      const large = allPayments.filter((p) => p.amount >= amountThreshold);

      logger.info(`Found ${large.length} large overdue payments`);
      return large;
    } catch (error) {
      this.handleError(error, `get large overdue payments (threshold: ${amountThreshold})`);
    }
  }

  /**
   * Invalidate cache when payments change
   */
  async invalidatePaymentsCache(): Promise<void> {
    await this.invalidateCache('analytics:overdue-payments');
    await this.invalidateCache('analytics:overdue-payments-stats');
    logger.info('Payments cache invalidated');
  }
}

/**
 * Helper function to create a PaymentAnalyticsService instance
 */
export function createPaymentAnalyticsService(
  context: RepositoryContextType = 'server'
): PaymentAnalyticsService {
  return new PaymentAnalyticsService(context);
}
