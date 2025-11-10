/**
 * OneLiner Repository
 *
 * Handles data access for one_liners table (executive approvals).
 * One-liners are executive decision summaries for story approvals.
 *
 * Usage:
 * ```typescript
 * const oneLinerRepo = new OneLinerRepository('server');
 * const recentDecisions = await oneLinerRepo.findRecent();
 * ```
 */

import { BaseRepository, QueryOptions, type RepositoryContextType } from './base';
import { logger } from '@/lib/logger';

/**
 * OneLiner data structure
 */
export interface OneLiner {
  id: string;
  story_id: string;
  one_liner_text: string;
  decision: string; // 'approved' | 'rejected' | 'needs_revision'
  decided_by: string;
  decided_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  story?: any;
  decider?: any;
}

/**
 * OneLiner create data
 */
export interface OneLinerCreateData {
  story_id: string;
  one_liner_text: string;
  decision: string;
  decided_by: string;
  decided_at?: string;
  notes?: string;
}

/**
 * OneLiner update data
 */
export interface OneLinerUpdateData {
  one_liner_text?: string;
  decision?: string;
  decided_by?: string;
  decided_at?: string;
  notes?: string;
}

/**
 * OneLiner repository
 * Provides data access methods for one-liners (executive approvals)
 */
export class OneLinerRepository extends BaseRepository<OneLiner> {
  constructor(context: RepositoryContextType = 'server') {
    super('one_liners', context);
  }

  /**
   * Find one-liner by story ID
   *
   * @param storyId - Story ID
   * @param select - Fields to select
   * @returns OneLiner or null
   */
  async findByStoryId(
    storyId: string,
    select: string = '*'
  ): Promise<OneLiner | null> {
    try {
      logger.info(`Finding one-liner for story: ${storyId}`);

      return await this.findOne(
        { story_id: storyId },
        select
      );
    } catch (error) {
      logger.error(`Error finding one-liner by story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find one-liners by decision type
   *
   * @param decision - Decision type
   * @param options - Query options
   * @returns Array of one-liners
   */
  async findByDecision(
    decision: string,
    options?: QueryOptions
  ): Promise<OneLiner[]> {
    try {
      logger.info(`Finding one-liners by decision: ${decision}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, decision },
        order: options?.order || { column: 'decided_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Error finding one-liners by decision: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find one-liners by decider (user who made the decision)
   *
   * @param decidedBy - User ID
   * @param options - Query options
   * @returns Array of one-liners
   */
  async findByDecider(
    decidedBy: string,
    options?: QueryOptions
  ): Promise<OneLiner[]> {
    try {
      logger.info(`Finding one-liners by decider: ${decidedBy}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, decided_by: decidedBy },
        order: options?.order || { column: 'decided_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Error finding one-liners by decider: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find one-liners by date range
   *
   * @param fromDate - Start date
   * @param toDate - End date
   * @param options - Query options
   * @returns Array of one-liners
   */
  async findByDateRange(
    fromDate: Date,
    toDate: Date,
    options?: QueryOptions
  ): Promise<OneLiner[]> {
    try {
      logger.info(`Finding one-liners between ${fromDate.toISOString()} and ${toDate.toISOString()}`);

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .gte('decided_at', fromDate.toISOString())
        .lte('decided_at', toDate.toISOString());

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

      logger.info(`Found ${data?.length || 0} one-liners in date range`);
      return (data as unknown as OneLiner[]) || [];
    } catch (error) {
      logger.error(`Error finding one-liners by date range: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find one-liners with story details
   *
   * @param options - Query options
   * @returns Array of one-liners with joined story data
   */
  async findWithStory(options?: QueryOptions): Promise<OneLiner[]> {
    try {
      logger.info('Finding one-liners with story details');

      return await this.findAll({
        ...options,
        select: options?.select || `
          *,
          story:stories (
            id,
            story_id,
            title,
            status
          ),
          decider:users!one_liners_decided_by_fkey (
            id,
            name,
            email
          )
        `,
      });
    } catch (error) {
      logger.error(`Error finding one-liners with story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find recent one-liners (last N days)
   *
   * @param days - Number of days to look back (default: 30)
   * @param options - Query options
   * @returns Array of recent one-liners
   */
  async findRecent(days: number = 30, options?: QueryOptions): Promise<OneLiner[]> {
    try {
      logger.info(`Finding one-liners from last ${days} days`);

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      return await this.findByDateRange(fromDate, new Date(), options);
    } catch (error) {
      logger.error(`Error finding recent one-liners: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find approved one-liners
   *
   * @param options - Query options
   * @returns Array of approved one-liners
   */
  async findApproved(options?: QueryOptions): Promise<OneLiner[]> {
    try {
      logger.info('Finding approved one-liners');

      return await this.findByDecision('approved', options);
    } catch (error) {
      logger.error(`Error finding approved one-liners: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find rejected one-liners
   *
   * @param options - Query options
   * @returns Array of rejected one-liners
   */
  async findRejected(options?: QueryOptions): Promise<OneLiner[]> {
    try {
      logger.info('Finding rejected one-liners');

      return await this.findByDecision('rejected', options);
    } catch (error) {
      logger.error(`Error finding rejected one-liners: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create one-liner
   *
   * @param data - OneLiner data
   * @returns Created one-liner
   */
  async createOneLiner(data: OneLinerCreateData): Promise<OneLiner> {
    try {
      logger.info(`Creating one-liner for story: ${data.story_id}`);

      const oneLinerData = {
        ...data,
        decided_at: data.decided_at || new Date().toISOString(),
      };

      return await this.create(oneLinerData as unknown as Partial<OneLiner>);
    } catch (error) {
      logger.error(`Error creating one-liner: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update one-liner
   *
   * @param oneLinerId - OneLiner ID
   * @param data - Update data
   * @returns Updated one-liner
   */
  async updateOneLiner(oneLinerId: string, data: OneLinerUpdateData): Promise<OneLiner> {
    try {
      logger.info(`Updating one-liner: ${oneLinerId}`);

      return await this.update(oneLinerId, data as unknown as Partial<OneLiner>);
    } catch (error) {
      logger.error(`Error updating one-liner: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count one-liners by decision
   *
   * @param fromDate - Optional start date
   * @param toDate - Optional end date
   * @returns Object with counts by decision type
   */
  async countByDecision(fromDate?: Date, toDate?: Date): Promise<Record<string, number>> {
    try {
      logger.info('Counting one-liners by decision');

      const oneLiners = fromDate && toDate
        ? await this.findByDateRange(fromDate, toDate, { select: 'decision' })
        : await this.findAll({ select: 'decision' });

      const counts: Record<string, number> = {};
      oneLiners.forEach((ol) => {
        counts[ol.decision] = (counts[ol.decision] || 0) + 1;
      });

      return counts;
    } catch (error) {
      logger.error(`Error counting one-liners by decision: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
