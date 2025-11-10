/**
 * Contracts Analytics Service
 *
 * Handles analytics for active contracts.
 * Tracks contract progress, milestones, and payment status.
 *
 * Usage:
 * ```typescript
 * const service = new ContractsAnalyticsService('server');
 * const contracts = await service.getActiveContracts();
 * const stats = await service.getActiveContractsStats();
 * ```
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RepositoryContextType } from '@/lib/repositories';
import { BaseAnalyticsService, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Active contract data structure
 */
export interface ActiveContract {
  id: string;
  contract_id: string;
  story_title: string;
  story_id: string;
  total_amount: number;
  signed_date: string;
  status: string;
  milestones_completed: number;
  milestones_total: number;
  milestone_progress: number;
  paid_amount: number;
  remaining_amount: number;
}

/**
 * Active contracts statistics
 */
export interface ActiveContractsStats {
  total: number;
  totalValue: number;
  totalPaid: number;
  totalRemaining: number;
  avgProgress: number;
}

/**
 * Contracts analytics service
 * TODO: Create ContractRepository for better abstraction
 */
export class ContractsAnalyticsService extends BaseAnalyticsService {
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
   * Get all active contracts with milestone and payment tracking
   *
   * @returns Array of active contracts with progress data
   */
  async getActiveContracts(): Promise<ActiveContract[]> {
    try {
      logger.info('Getting active contracts');

      return await this.withCache(
        'analytics:active-contracts',
        async () => {
          const supabase = await this.getClient();

          const { data: contracts, error } = await supabase
            .from('contracts')
            .select(
              `
              id,
              contract_number,
              total_amount,
              signed_date,
              status,
              updated_at,
              story:stories (
                id,
                story_id,
                title
              ),
              payment_schedules (
                id,
                milestone_number,
                status
              ),
              payments (
                amount,
                status
              )
            `
            )
            .eq('status', 'active')
            .order('signed_date', { ascending: false });

          if (error) {
            throw new Error(`Failed to fetch active contracts: ${error.message}`);
          }

          const activeContracts: ActiveContract[] = (contracts || []).map(
            (contract: any) => {
              const story = contract.story;
              const paymentSchedules = (contract.payment_schedules as any[]) || [];
              const payments = (contract.payments as any[]) || [];

              // Calculate milestone progress
              const milestonesTotal = paymentSchedules.length;
              const milestonesCompleted = paymentSchedules.filter(
                (ps: any) => ps.status === 'completed' || ps.status === 'paid'
              ).length;
              const milestoneProgress =
                milestonesTotal > 0
                  ? Math.round((milestonesCompleted / milestonesTotal) * 100)
                  : 0;

              // Calculate paid amount
              const paidAmount = payments
                .filter((p: any) => p.status === 'paid')
                .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

              return {
                id: contract.id,
                contract_id:
                  contract.contract_number ||
                  `CON-${contract.id.slice(0, 8).toUpperCase()}`,
                story_title: story?.title || 'Unknown',
                story_id: story?.story_id || 'N/A',
                total_amount: contract.total_amount,
                signed_date: contract.signed_date || contract.updated_at,
                status: contract.status,
                milestones_completed: milestonesCompleted,
                milestones_total: milestonesTotal,
                milestone_progress: milestoneProgress,
                paid_amount: paidAmount,
                remaining_amount: contract.total_amount - paidAmount,
              };
            }
          );

          logger.info(`Found ${activeContracts.length} active contracts`);
          return activeContracts;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get active contracts');
    }
  }

  /**
   * Get active contracts statistics
   *
   * @returns Statistics object
   */
  async getActiveContractsStats(): Promise<ActiveContractsStats> {
    try {
      logger.info('Getting active contracts statistics');

      return await this.withCache(
        'analytics:active-contracts-stats',
        async () => {
          const contracts = await this.getActiveContracts();

          const stats: ActiveContractsStats = {
            total: contracts.length,
            totalValue: contracts.reduce((sum, c) => sum + c.total_amount, 0),
            totalPaid: contracts.reduce((sum, c) => sum + c.paid_amount, 0),
            totalRemaining: contracts.reduce((sum, c) => sum + c.remaining_amount, 0),
            avgProgress: 0,
          };

          if (contracts.length > 0) {
            const avgProgress = StatsUtils.average(
              contracts.map((c) => c.milestone_progress)
            );
            stats.avgProgress = Math.round(avgProgress);
          }

          logger.info(
            `Active contracts stats: ${stats.total} contracts, ${stats.totalValue} total value, ${stats.avgProgress}% avg progress`
          );

          return stats;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get active contracts stats');
    }
  }

  /**
   * Get contracts nearing completion (>80% progress)
   *
   * @returns Array of contracts near completion
   */
  async getContractsNearingCompletion(): Promise<ActiveContract[]> {
    try {
      logger.info('Getting contracts nearing completion');

      const allContracts = await this.getActiveContracts();
      const nearing = allContracts.filter((c) => c.milestone_progress >= 80);

      logger.info(`Found ${nearing.length} contracts nearing completion`);
      return nearing;
    } catch (error) {
      this.handleError(error, 'get contracts nearing completion');
    }
  }

  /**
   * Get contracts with low progress (<30%)
   *
   * @returns Array of contracts with low progress
   */
  async getContractsWithLowProgress(): Promise<ActiveContract[]> {
    try {
      logger.info('Getting contracts with low progress');

      const allContracts = await this.getActiveContracts();
      const lowProgress = allContracts.filter((c) => c.milestone_progress < 30);

      logger.info(`Found ${lowProgress.length} contracts with low progress`);
      return lowProgress;
    } catch (error) {
      this.handleError(error, 'get contracts with low progress');
    }
  }

  /**
   * Get high-value contracts (amount above threshold)
   *
   * @param amountThreshold - Minimum amount (default: 500000)
   * @returns Array of high-value contracts
   */
  async getHighValueContracts(amountThreshold: number = 500000): Promise<ActiveContract[]> {
    try {
      logger.info(`Getting high-value contracts (>${amountThreshold})`);

      const allContracts = await this.getActiveContracts();
      const highValue = allContracts.filter((c) => c.total_amount >= amountThreshold);

      logger.info(`Found ${highValue.length} high-value contracts`);
      return highValue;
    } catch (error) {
      this.handleError(error, `get high-value contracts (threshold: ${amountThreshold})`);
    }
  }

  /**
   * Get contract by ID
   *
   * @param contractId - Contract ID
   * @returns Contract data or null
   */
  async getContractById(contractId: string): Promise<ActiveContract | null> {
    try {
      logger.info(`Getting contract by ID: ${contractId}`);

      const allContracts = await this.getActiveContracts();
      return allContracts.find((c) => c.id === contractId) || null;
    } catch (error) {
      this.handleError(error, `get contract by ID ${contractId}`);
    }
  }

  /**
   * Invalidate cache when contracts change
   */
  async invalidateContractsCache(): Promise<void> {
    await this.invalidateCache('analytics:active-contracts');
    await this.invalidateCache('analytics:active-contracts-stats');
    logger.info('Contracts cache invalidated');
  }
}

/**
 * Helper function to create a ContractsAnalyticsService instance
 */
export function createContractsAnalyticsService(
  context: RepositoryContextType = 'server'
): ContractsAnalyticsService {
  return new ContractsAnalyticsService(context);
}
