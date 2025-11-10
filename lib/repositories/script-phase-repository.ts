/**
 * ScriptPhase Repository
 *
 * Handles data access for script_phases table.
 * Script phases track the progress of script development through multiple stages.
 *
 * Usage:
 * ```typescript
 * const scriptPhaseRepo = new ScriptPhaseRepository('server');
 * const phases = await scriptPhaseRepo.findByContractId(contractId);
 * ```
 */

import { BaseRepository, QueryOptions, type RepositoryContextType } from './base';
import { logger } from '@/lib/logger';

/**
 * ScriptPhase data structure
 */
export interface ScriptPhase {
  id: string;
  contract_id: string;
  phase_name: string;
  phase_number: number;
  status: string; // 'pending' | 'in_progress' | 'completed' | 'on_hold'
  start_date?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  contract?: any;
}

/**
 * ScriptPhase create data
 */
export interface ScriptPhaseCreateData {
  contract_id: string;
  phase_name: string;
  phase_number: number;
  status?: string;
  start_date?: string;
  notes?: string;
}

/**
 * ScriptPhase update data
 */
export interface ScriptPhaseUpdateData {
  phase_name?: string;
  status?: string;
  start_date?: string;
  completed_at?: string;
  notes?: string;
}

/**
 * ScriptPhase repository
 * Provides data access methods for script phases
 */
export class ScriptPhaseRepository extends BaseRepository<ScriptPhase> {
  constructor(context: RepositoryContextType = 'server') {
    super('script_phases', context);
  }

  /**
   * Find script phases by contract ID
   *
   * @param contractId - Contract ID
   * @param options - Query options
   * @returns Array of script phases
   */
  async findByContractId(
    contractId: string,
    options?: QueryOptions
  ): Promise<ScriptPhase[]> {
    try {
      logger.info(`Finding script phases for contract: ${contractId}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, contract_id: contractId },
        order: options?.order || { column: 'phase_number', ascending: true },
      });
    } catch (error) {
      logger.error(`Error finding script phases by contract: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find script phases by status
   *
   * @param status - Phase status
   * @param options - Query options
   * @returns Array of script phases
   */
  async findByStatus(
    status: string,
    options?: QueryOptions
  ): Promise<ScriptPhase[]> {
    try {
      logger.info(`Finding script phases by status: ${status}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, status },
      });
    } catch (error) {
      logger.error(`Error finding script phases by status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find script phases with contract details
   *
   * @param options - Query options
   * @returns Array of script phases with joined contract data
   */
  async findWithContract(options?: QueryOptions): Promise<ScriptPhase[]> {
    try {
      logger.info('Finding script phases with contract details');

      return await this.findAll({
        ...options,
        select: options?.select || `
          *,
          contract:contracts (
            id,
            contract_number,
            total_amount,
            status,
            story:stories (
              id,
              story_id,
              title
            )
          )
        `,
      });
    } catch (error) {
      logger.error(`Error finding script phases with contract: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get progress for a contract
   * Returns completed phases count and total phases count
   *
   * @param contractId - Contract ID
   * @returns Progress object
   */
  async getProgress(contractId: string): Promise<{
    completed: number;
    total: number;
    percentage: number;
  }> {
    try {
      logger.info(`Getting script phase progress for contract: ${contractId}`);

      const phases = await this.findByContractId(contractId, {
        select: 'id, status',
      });

      const total = phases.length;
      const completed = phases.filter((p) => p.status === 'completed').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      logger.info(`Script progress: ${completed}/${total} phases (${percentage}%)`);

      return {
        completed,
        total,
        percentage,
      };
    } catch (error) {
      logger.error(`Error getting script phase progress: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find current phase for a contract
   *
   * @param contractId - Contract ID
   * @returns Current script phase or null
   */
  async findCurrentPhase(contractId: string): Promise<ScriptPhase | null> {
    try {
      logger.info(`Finding current phase for contract: ${contractId}`);

      // First try to find in_progress phase
      const inProgress = await this.findOne({
        contract_id: contractId,
        status: 'in_progress',
      });

      if (inProgress) {
        return inProgress;
      }

      // If no in_progress phase, find first pending phase
      const phases = await this.findByContractId(contractId, {
        filters: { status: 'pending' },
        order: { column: 'phase_number', ascending: true },
        pagination: { limit: 1 },
      });

      return phases.length > 0 ? phases[0] : null;
    } catch (error) {
      logger.error(`Error finding current phase: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find completed phases for a contract
   *
   * @param contractId - Contract ID
   * @param options - Query options
   * @returns Array of completed script phases
   */
  async findCompleted(contractId: string, options?: QueryOptions): Promise<ScriptPhase[]> {
    try {
      logger.info(`Finding completed phases for contract: ${contractId}`);

      return await this.findAll({
        ...options,
        filters: { ...options?.filters, contract_id: contractId, status: 'completed' },
        order: options?.order || { column: 'completed_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Error finding completed phases: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create script phase
   *
   * @param data - ScriptPhase data
   * @returns Created script phase
   */
  async createPhase(data: ScriptPhaseCreateData): Promise<ScriptPhase> {
    try {
      logger.info(`Creating script phase for contract: ${data.contract_id}`);

      const phaseData = {
        ...data,
        status: data.status || 'pending',
      };

      return await this.create(phaseData as unknown as Partial<ScriptPhase>);
    } catch (error) {
      logger.error(`Error creating script phase: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark phase as completed
   *
   * @param phaseId - ScriptPhase ID
   * @param completedAt - Completion date (defaults to now)
   * @returns Updated script phase
   */
  async markAsCompleted(phaseId: string, completedAt?: Date): Promise<ScriptPhase> {
    try {
      logger.info(`Marking script phase ${phaseId} as completed`);

      return await this.update(phaseId, {
        status: 'completed',
        completed_at: (completedAt || new Date()).toISOString(),
      } as unknown as Partial<ScriptPhase>);
    } catch (error) {
      logger.error(`Error marking phase as completed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update phase status
   *
   * @param phaseId - ScriptPhase ID
   * @param status - New status
   * @returns Updated script phase
   */
  async updateStatus(phaseId: string, status: string): Promise<ScriptPhase> {
    try {
      logger.info(`Updating script phase ${phaseId} status to: ${status}`);

      return await this.update(phaseId, {
        status,
      } as unknown as Partial<ScriptPhase>);
    } catch (error) {
      logger.error(`Error updating phase status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update script phase
   *
   * @param phaseId - ScriptPhase ID
   * @param data - Update data
   * @returns Updated script phase
   */
  async updatePhase(phaseId: string, data: ScriptPhaseUpdateData): Promise<ScriptPhase> {
    try {
      logger.info(`Updating script phase: ${phaseId}`);

      return await this.update(phaseId, data as unknown as Partial<ScriptPhase>);
    } catch (error) {
      logger.error(`Error updating script phase: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
