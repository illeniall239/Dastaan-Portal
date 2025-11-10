/**
 * Negotiation Repository
 *
 * Handles data access for negotiations table (contract terms).
 * Negotiations track price discussions before final contract signing.
 *
 * NOTE: This table may be deprecated. Check git status showed deleted negotiation files.
 * Kept for backward compatibility but may need removal in future.
 *
 * Usage:
 * ```typescript
 * const negotiationRepo = new NegotiationRepository('server');
 * const activeNegotiations = await negotiationRepo.findActive();
 * ```
 */

import { BaseRepository, QueryOptions, type RepositoryContextType } from './base';
import { logger } from '@/lib/logger';

/**
 * Negotiation data structure
 */
export interface Negotiation {
  id: string;
  story_id: string;
  proposed_price: number;
  status: string; // 'pending' | 'in_progress' | 'counter_offer' | 'agreed' | 'failed'
  last_updated: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  story?: any;
}

/**
 * Negotiation create data
 */
export interface NegotiationCreateData {
  story_id: string;
  proposed_price: number;
  status?: string;
  notes?: string;
}

/**
 * Negotiation update data
 */
export interface NegotiationUpdateData {
  proposed_price?: number;
  status?: string;
  notes?: string;
  last_updated?: string;
}

/**
 * Negotiation repository
 * Provides data access methods for negotiations
 */
export class NegotiationRepository extends BaseRepository<Negotiation> {
  constructor(context: RepositoryContextType = 'server') {
    super('negotiations', context);
  }

  /**
   * Find negotiation by story ID
   *
   * @param storyId - Story ID
   * @param select - Fields to select
   * @returns Negotiation or null
   */
  async findByStoryId(
    storyId: string,
    select: string = '*'
  ): Promise<Negotiation | null> {
    try {
      logger.info(`Finding negotiation for story: ${storyId}`);

      return await this.findOne(
        { story_id: storyId },
        select
      );
    } catch (error) {
      logger.error(`Error finding negotiation by story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find negotiations by status
   *
   * @param status - Negotiation status or array of statuses
   * @param options - Query options
   * @returns Array of negotiations
   */
  async findByStatus(
    status: string | string[],
    options?: QueryOptions
  ): Promise<Negotiation[]> {
    try {
      logger.info(`Finding negotiations by status: ${status}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, status },
        order: options?.order || { column: 'last_updated', ascending: false },
      });
    } catch (error) {
      logger.error(`Error finding negotiations by status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find active negotiations
   *
   * @param options - Query options
   * @returns Array of active negotiations
   */
  async findActive(options?: QueryOptions): Promise<Negotiation[]> {
    try {
      logger.info('Finding active negotiations');

      return await this.findByStatus(['pending', 'in_progress', 'counter_offer'], options);
    } catch (error) {
      logger.error(`Error finding active negotiations: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find negotiations by date range
   *
   * @param fromDate - Start date
   * @param toDate - End date
   * @param options - Query options
   * @returns Array of negotiations
   */
  async findByDateRange(
    fromDate: Date,
    toDate: Date,
    options?: QueryOptions
  ): Promise<Negotiation[]> {
    try {
      logger.info(`Finding negotiations between ${fromDate.toISOString()} and ${toDate.toISOString()}`);

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

      logger.info(`Found ${data?.length || 0} negotiations in date range`);
      return (data as unknown as Negotiation[]) || [];
    } catch (error) {
      logger.error(`Error finding negotiations by date range: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find negotiations with story details
   *
   * @param options - Query options
   * @returns Array of negotiations with joined story data
   */
  async findWithStory(options?: QueryOptions): Promise<Negotiation[]> {
    try {
      logger.info('Finding negotiations with story details');

      return await this.findAll({
        ...options,
        select: options?.select || `
          *,
          story:stories (
            id,
            story_id,
            title,
            status
          )
        `,
      });
    } catch (error) {
      logger.error(`Error finding negotiations with story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Sum pipeline value of negotiations
   *
   * @param filters - Optional filters
   * @returns Total proposed price sum
   */
  async sumPipelineValue(filters?: Record<string, any>): Promise<number> {
    try {
      logger.info('Calculating sum of negotiation pipeline value');

      const negotiations = await this.findAll({
        select: 'proposed_price',
        filters,
      });

      const sum = negotiations.reduce((acc, negotiation) => acc + (negotiation.proposed_price || 0), 0);

      logger.info(`Total negotiation pipeline value: ${sum}`);
      return sum;
    } catch (error) {
      logger.error(`Error summing negotiation pipeline value: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create negotiation
   *
   * @param data - Negotiation data
   * @returns Created negotiation
   */
  async createNegotiation(data: NegotiationCreateData): Promise<Negotiation> {
    try {
      logger.info(`Creating negotiation for story: ${data.story_id}`);

      const negotiationData = {
        ...data,
        status: data.status || 'pending',
        last_updated: new Date().toISOString(),
      };

      return await this.create(negotiationData as unknown as Partial<Negotiation>);
    } catch (error) {
      logger.error(`Error creating negotiation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update negotiation status
   *
   * @param negotiationId - Negotiation ID
   * @param status - New status
   * @returns Updated negotiation
   */
  async updateStatus(negotiationId: string, status: string): Promise<Negotiation> {
    try {
      logger.info(`Updating negotiation ${negotiationId} status to: ${status}`);

      return await this.update(negotiationId, {
        status,
        last_updated: new Date().toISOString(),
      } as unknown as Partial<Negotiation>);
    } catch (error) {
      logger.error(`Error updating negotiation status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update negotiation
   *
   * @param negotiationId - Negotiation ID
   * @param data - Update data
   * @returns Updated negotiation
   */
  async updateNegotiation(negotiationId: string, data: NegotiationUpdateData): Promise<Negotiation> {
    try {
      logger.info(`Updating negotiation: ${negotiationId}`);

      const updateData = {
        ...data,
        last_updated: data.last_updated || new Date().toISOString(),
      };

      return await this.update(negotiationId, updateData as unknown as Partial<Negotiation>);
    } catch (error) {
      logger.error(`Error updating negotiation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark negotiation as agreed
   *
   * @param negotiationId - Negotiation ID
   * @returns Updated negotiation
   */
  async markAsAgreed(negotiationId: string): Promise<Negotiation> {
    try {
      logger.info(`Marking negotiation ${negotiationId} as agreed`);

      return await this.updateStatus(negotiationId, 'agreed');
    } catch (error) {
      logger.error(`Error marking negotiation as agreed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark negotiation as failed
   *
   * @param negotiationId - Negotiation ID
   * @returns Updated negotiation
   */
  async markAsFailed(negotiationId: string): Promise<Negotiation> {
    try {
      logger.info(`Marking negotiation ${negotiationId} as failed`);

      return await this.updateStatus(negotiationId, 'failed');
    } catch (error) {
      logger.error(`Error marking negotiation as failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
