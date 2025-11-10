/**
 * Contract Repository
 *
 * Handles data access for contracts table.
 * Contracts represent signed agreements with payment milestones.
 *
 * Usage:
 * ```typescript
 * const contractRepo = new ContractRepository('server');
 * const activeContracts = await contractRepo.findActive();
 * ```
 */

import { BaseRepository, QueryOptions, type RepositoryContextType } from './base';
import { logger } from '@/lib/logger';

/**
 * Contract data structure
 */
export interface Contract {
  id: string;
  contract_number: string;
  story_id: string;
  total_amount: number;
  status: string;
  signed_date: string;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  story?: any;
  payment_schedules?: any[];
  payments?: any[];
  script_phases?: any[];
}

/**
 * Contract create data
 */
export interface ContractCreateData {
  story_id: string;
  contract_number?: string;
  total_amount: number;
  status?: string;
  signed_date?: string;
}

/**
 * Contract update data
 */
export interface ContractUpdateData {
  total_amount?: number;
  status?: string;
  signed_date?: string;
}

/**
 * Contract repository
 * Provides data access methods for contracts
 */
export class ContractRepository extends BaseRepository<Contract> {
  constructor(context: RepositoryContextType = 'server') {
    super('contracts', context);
  }

  /**
   * Find contract by contract number
   *
   * @param contractNumber - Contract number
   * @param select - Fields to select
   * @returns Contract or null
   */
  async findByContractNumber(
    contractNumber: string,
    select: string = '*'
  ): Promise<Contract | null> {
    try {
      logger.info(`Finding contract by number: ${contractNumber}`);

      return await this.findOne(
        { contract_number: contractNumber },
        select
      );
    } catch (error) {
      logger.error(`Error finding contract by number: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find contracts by story ID
   *
   * @param storyId - Story ID
   * @param options - Query options
   * @returns Array of contracts
   */
  async findByStoryId(
    storyId: string,
    options?: QueryOptions
  ): Promise<Contract[]> {
    try {
      logger.info(`Finding contracts for story: ${storyId}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, story_id: storyId },
      });
    } catch (error) {
      logger.error(`Error finding contracts by story: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find active contracts
   *
   * @param options - Query options
   * @returns Array of active contracts
   */
  async findActive(options?: QueryOptions): Promise<Contract[]> {
    try {
      logger.info('Finding active contracts');

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, status: 'active' },
        order: options?.order || { column: 'signed_date', ascending: false },
      });
    } catch (error) {
      logger.error(`Error finding active contracts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find contracts by status
   *
   * @param status - Contract status or array of statuses
   * @param options - Query options
   * @returns Array of contracts
   */
  async findByStatus(
    status: string | string[],
    options?: QueryOptions
  ): Promise<Contract[]> {
    try {
      logger.info(`Finding contracts by status: ${status}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, status },
      });
    } catch (error) {
      logger.error(`Error finding contracts by status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find contracts by date range
   *
   * @param fromDate - Start date
   * @param toDate - End date
   * @param options - Query options
   * @returns Array of contracts
   */
  async findByDateRange(
    fromDate: Date,
    toDate: Date,
    options?: QueryOptions
  ): Promise<Contract[]> {
    try {
      logger.info(`Finding contracts between ${fromDate.toISOString()} and ${toDate.toISOString()}`);

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

      logger.info(`Found ${data?.length || 0} contracts in date range`);
      return (data as unknown as Contract[]) || [];
    } catch (error) {
      logger.error(`Error finding contracts by date range: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find contracts with script phases
   *
   * @param options - Query options
   * @returns Array of contracts with script phases
   */
  async findWithScriptPhases(options?: QueryOptions): Promise<Contract[]> {
    try {
      logger.info('Finding contracts with script phases');

      return await this.findAll({
        ...options,
        select: options?.select || `
          *,
          story:stories (
            id,
            story_id,
            title
          ),
          script_phases (
            id,
            phase_name,
            status,
            completed_at
          )
        `,
      });
    } catch (error) {
      logger.error(`Error finding contracts with script phases: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Sum total value of contracts
   *
   * @param filters - Optional filters
   * @returns Total amount sum
   */
  async sumTotalValue(filters?: Record<string, any>): Promise<number> {
    try {
      logger.info('Calculating sum of contract values');

      const contracts = await this.findAll({
        select: 'total_amount',
        filters,
      });

      const sum = contracts.reduce((acc, contract) => acc + (contract.total_amount || 0), 0);

      logger.info(`Total contract value: ${sum}`);
      return sum;
    } catch (error) {
      logger.error(`Error summing contract values: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create contract
   *
   * @param data - Contract data
   * @returns Created contract
   */
  async createContract(data: ContractCreateData): Promise<Contract> {
    try {
      logger.info(`Creating contract for story: ${data.story_id}`);

      const contractData = {
        ...data,
        status: data.status || 'draft',
      };

      return await this.create(contractData as unknown as Partial<Contract>);
    } catch (error) {
      logger.error(`Error creating contract: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update contract status
   *
   * @param contractId - Contract ID
   * @param status - New status
   * @returns Updated contract
   */
  async updateStatus(contractId: string, status: string): Promise<Contract> {
    try {
      logger.info(`Updating contract ${contractId} status to: ${status}`);

      return await this.update(contractId, {
        status,
      } as unknown as Partial<Contract>);
    } catch (error) {
      logger.error(`Error updating contract status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update contract
   *
   * @param contractId - Contract ID
   * @param data - Update data
   * @returns Updated contract
   */
  async updateContract(contractId: string, data: ContractUpdateData): Promise<Contract> {
    try {
      logger.info(`Updating contract: ${contractId}`);

      return await this.update(contractId, data as unknown as Partial<Contract>);
    } catch (error) {
      logger.error(`Error updating contract: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
