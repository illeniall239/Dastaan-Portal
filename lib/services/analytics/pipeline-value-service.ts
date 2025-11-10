/**
 * Pipeline Value Service
 *
 * Handles analytics for total pipeline value from contracts and negotiations.
 * Tracks financial value at different stages of the pipeline.
 *
 * Usage:
 * ```typescript
 * const service = new PipelineValueService('server');
 * const pipelineValue = await service.getPipelineValue();
 * const stats = await service.getPipelineValueStats();
 * ```
 */

import {
  ContractRepository,
  NegotiationRepository,
  type RepositoryContextType,
} from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Pipeline item data structure
 */
export interface PipelineItem {
  id: string;
  type: 'contract' | 'contractTerm';
  story_id: string;
  story_title: string;
  value: number;
  status: string;
  stage: string;
  last_update: string;
  created_at: string;
}

/**
 * Pipeline value statistics
 */
export interface PipelineValueStats {
  totalValue: number;
  contractValue: number;
  contractTermValue: number;
  totalCount: number;
  contractCount: number;
  contractTermCount: number;
  avgDealSize: number;
}

/**
 * Pipeline value service
 * Combines contracts and negotiations (contract terms) for total pipeline value
 */
export class PipelineValueService extends BaseAnalyticsService {
  private contractRepo: ContractRepository;
  private negotiationRepo: NegotiationRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.contractRepo = new ContractRepository(context);
    this.negotiationRepo = new NegotiationRepository(context);
  }

  /**
   * Get all pipeline items (contracts + negotiations)
   * Sorted by last update descending
   *
   * @returns Array of pipeline items
   */
  async getPipelineValue(): Promise<PipelineItem[]> {
    try {
      logger.info('Getting pipeline value');

      return await this.withCache(
        'analytics:pipeline-value',
        async () => {
          // Get contracts
          const contracts = await this.contractRepo.findByStatus(
            ['active', 'pending', 'in_progress'],
            {
              select: `
                id,
                total_amount,
                status,
                signed_date,
                updated_at,
                story:stories (
                  id,
                  story_id,
                  title
                )
              `,
            }
          );

          // Get negotiations (contract terms)
          const negotiations = await this.negotiationRepo.findByStatus(
            ['pending', 'in_progress', 'counter_offer'],
            {
              select: `
                id,
                proposed_price,
                status,
                last_updated,
                created_at,
                story:stories (
                  id,
                  story_id,
                  title
                )
              `,
            }
          );

          const items: PipelineItem[] = [];

          // Process contracts
          contracts.forEach((contract: any) => {
            const story = contract.story;
            items.push({
              id: contract.id,
              type: 'contract',
              story_id: story?.story_id || 'N/A',
              story_title: story?.title || 'Unknown',
              value: contract.total_amount,
              status: contract.status,
              stage: 'Contracted',
              last_update: contract.updated_at,
              created_at: contract.signed_date || contract.updated_at,
            });
          });

          // Process contract terms (negotiations)
          negotiations.forEach((negotiation: any) => {
            const story = negotiation.story;
            items.push({
              id: negotiation.id,
              type: 'contractTerm',
              story_id: story?.story_id || 'N/A',
              story_title: story?.title || 'Unknown',
              value: negotiation.proposed_price,
              status: negotiation.status,
              stage: 'Contract Terms',
              last_update: negotiation.last_updated || negotiation.created_at,
              created_at: negotiation.created_at,
            });
          });

          // Sort by last update (most recent first)
          const sorted = items.sort(
            (a, b) =>
              new Date(b.last_update).getTime() - new Date(a.last_update).getTime()
          );

          logger.info(
            `Found ${sorted.length} pipeline items (${items.filter((i) => i.type === 'contract').length} contracts, ${items.filter((i) => i.type === 'contractTerm').length} contract terms)`
          );

          return sorted;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get pipeline value');
    }
  }

  /**
   * Get pipeline value statistics
   * Includes totals, counts, and averages
   *
   * @returns Statistics object
   */
  async getPipelineValueStats(): Promise<PipelineValueStats> {
    try {
      logger.info('Getting pipeline value statistics');

      return await this.withCache(
        'analytics:pipeline-value-stats',
        async () => {
          const items = await this.getPipelineValue();

          const stats: PipelineValueStats = {
            totalValue: items.reduce((sum, item) => sum + item.value, 0),
            contractValue: items
              .filter((i) => i.type === 'contract')
              .reduce((sum, i) => sum + i.value, 0),
            contractTermValue: items
              .filter((i) => i.type === 'contractTerm')
              .reduce((sum, i) => sum + i.value, 0),
            totalCount: items.length,
            contractCount: items.filter((i) => i.type === 'contract').length,
            contractTermCount: items.filter((i) => i.type === 'contractTerm').length,
            avgDealSize: 0,
          };

          if (items.length > 0) {
            stats.avgDealSize = Math.round(stats.totalValue / items.length);
          }

          logger.info(
            `Pipeline value stats: ${stats.totalValue} total, ${stats.contractCount} contracts, ${stats.contractTermCount} contract terms`
          );

          return stats;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get pipeline value stats');
    }
  }

  /**
   * Get contracts only
   *
   * @returns Array of contract pipeline items
   */
  async getContractsOnly(): Promise<PipelineItem[]> {
    try {
      logger.info('Getting contracts only');

      const allItems = await this.getPipelineValue();
      return allItems.filter((item) => item.type === 'contract');
    } catch (error) {
      this.handleError(error, 'get contracts only');
    }
  }

  /**
   * Get contract terms only
   *
   * @returns Array of contract term pipeline items
   */
  async getContractTermsOnly(): Promise<PipelineItem[]> {
    try {
      logger.info('Getting contract terms only');

      const allItems = await this.getPipelineValue();
      return allItems.filter((item) => item.type === 'contractTerm');
    } catch (error) {
      this.handleError(error, 'get contract terms only');
    }
  }

  /**
   * Invalidate cache when pipeline changes
   */
  async invalidatePipelineValueCache(): Promise<void> {
    await this.invalidateCache('analytics:pipeline-value');
    await this.invalidateCache('analytics:pipeline-value-stats');
    logger.info('Pipeline value cache invalidated');
  }
}

/**
 * Helper function to create a PipelineValueService instance
 */
export function createPipelineValueService(
  context: RepositoryContextType = 'server'
): PipelineValueService {
  return new PipelineValueService(context);
}
