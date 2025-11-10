/**
 * Scripting Analytics Service
 *
 * Handles analytics for script development phases.
 * Tracks progress through scriptwriting stages.
 *
 * Usage:
 * ```typescript
 * const service = new ScriptingAnalyticsService('server');
 * const scriptingData = await service.getScriptingPhaseData();
 * const overview = await service.getScriptingOverview();
 * ```
 */

import {
  CallReportRepository,
  StoryRepository,
  ContractRepository,
  ScriptPhaseRepository,
  type RepositoryContextType,
} from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Scripting phase data structure
 */
export interface ScriptingPhaseData {
  id: string;
  call_report_id: string;
  story_id: string;
  title: string;
  contract_id: string;
  total_amount: number;
  progress: number; // Percentage (0-100)
  current_phase: string | null;
  status: 'on_schedule' | 'on_hold' | 'behind_schedule';
  is_late: boolean;
  last_updated: string;
}

/**
 * Scripting overview statistics
 */
export interface ScriptingOverview {
  total: number;
  onSchedule: number;
  onHold: number;
  behindSchedule: number;
  avgProgress: number;
}

/**
 * Total script steps (hardcoded as per original implementation)
 */
const TOTAL_SCRIPT_STEPS = 6;

/**
 * Scripting analytics service
 * Tracks dramas in scripting phase with progress metrics
 */
export class ScriptingAnalyticsService extends BaseAnalyticsService {
  private callReportRepo: CallReportRepository;
  private storyRepo: StoryRepository;
  private contractRepo: ContractRepository;
  private scriptPhaseRepo: ScriptPhaseRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.callReportRepo = new CallReportRepository(context);
    this.storyRepo = new StoryRepository(context);
    this.contractRepo = new ContractRepository(context);
    this.scriptPhaseRepo = new ScriptPhaseRepository(context);
  }

  /**
   * Get scripting phase data for all dramas in scripting
   * Excludes completed dramas (progress < 100%)
   *
   * @returns Array of scripting phase data
   */
  async getScriptingPhaseData(): Promise<ScriptingPhaseData[]> {
    try {
      logger.info('Getting scripting phase data');

      return await this.withCache(
        'analytics:scripting-phase-data',
        async () => {
          // Get contracts with script phases
          const contracts = await this.contractRepo.findWithScriptPhases({
            select: `
              id,
              contract_number,
              total_amount,
              updated_at,
              story:stories (
                id,
                story_id,
                title,
                call_reports (
                  id,
                  call_report_id
                )
              ),
              script_phases (
                id,
                phase_name,
                status,
                completed_at,
                updated_at
              )
            `,
          });

          const scriptingData: ScriptingPhaseData[] = [];

          for (const contract of contracts) {
            const story = (contract as any).story;
            const scriptPhases = (contract as any).script_phases || [];

            // Skip if no story or call reports
            if (!story || !story.call_reports || story.call_reports.length === 0) {
              continue;
            }

            const callReport = story.call_reports[0];

            // Calculate progress
            const completedPhases = scriptPhases.filter(
              (phase: any) => phase.status === 'completed'
            ).length;
            const progress = Math.round((completedPhases / TOTAL_SCRIPT_STEPS) * 100);

            // Skip if completed (100% progress)
            if (progress >= 100) {
              continue;
            }

            // Determine current phase
            const currentPhase = scriptPhases.find(
              (phase: any) => phase.status === 'in_progress'
            )?.phase_name || scriptPhases.find(
              (phase: any) => phase.status === 'pending'
            )?.phase_name || null;

            // Determine status based on progress
            let status: 'on_schedule' | 'on_hold' | 'behind_schedule' = 'on_schedule';
            if (progress < 40) {
              status = 'behind_schedule';
            } else if (progress < 70) {
              status = 'on_schedule';
            } else {
              status = 'on_schedule';
            }

            // Check if late (has on_hold phases)
            const is_late = scriptPhases.some((phase: any) => phase.status === 'on_hold');

            scriptingData.push({
              id: contract.id,
              call_report_id: callReport.id,
              story_id: story.id,
              title: story.title,
              contract_id: contract.id,
              total_amount: contract.total_amount,
              progress,
              current_phase: currentPhase,
              status,
              is_late,
              last_updated: contract.updated_at,
            });
          }

          logger.info(`Found ${scriptingData.length} dramas in scripting phase`);
          return scriptingData;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get scripting phase data');
    }
  }

  /**
   * Get scripting overview statistics
   * Includes status counts and average progress
   *
   * @returns Overview statistics
   */
  async getScriptingOverview(): Promise<ScriptingOverview> {
    try {
      logger.info('Getting scripting overview');

      return await this.withCache(
        'analytics:scripting-overview',
        async () => {
          const scriptingData = await this.getScriptingPhaseData();

          const overview: ScriptingOverview = {
            total: scriptingData.length,
            onSchedule: scriptingData.filter((d) => d.status === 'on_schedule').length,
            onHold: scriptingData.filter((d) => d.status === 'on_hold').length,
            behindSchedule: scriptingData.filter((d) => d.status === 'behind_schedule').length,
            avgProgress: 0,
          };

          // Calculate average progress
          if (scriptingData.length > 0) {
            const totalProgress = scriptingData.reduce((sum, d) => sum + d.progress, 0);
            overview.avgProgress = Math.round(totalProgress / scriptingData.length);
          }

          logger.info(
            `Scripting overview: ${overview.total} total, ${overview.avgProgress}% avg progress`
          );

          return overview;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get scripting overview');
    }
  }

  /**
   * Get dramas by scripting status
   *
   * @param status - Status filter
   * @returns Array of scripting phase data
   */
  async getDramasByStatus(
    status: 'on_schedule' | 'on_hold' | 'behind_schedule'
  ): Promise<ScriptingPhaseData[]> {
    try {
      logger.info(`Getting dramas by status: ${status}`);

      const allData = await this.getScriptingPhaseData();
      return allData.filter((d) => d.status === status);
    } catch (error) {
      this.handleError(error, `get dramas by status (${status})`);
    }
  }

  /**
   * Get late dramas (with on_hold phases)
   *
   * @returns Array of late dramas
   */
  async getLateDramas(): Promise<ScriptingPhaseData[]> {
    try {
      logger.info('Getting late dramas');

      const allData = await this.getScriptingPhaseData();
      const late = allData.filter((d) => d.is_late);

      logger.info(`Found ${late.length} late dramas`);
      return late;
    } catch (error) {
      this.handleError(error, 'get late dramas');
    }
  }

  /**
   * Get dramas with low progress
   *
   * @param threshold - Progress threshold (default: 40%)
   * @returns Array of dramas with low progress
   */
  async getDramasWithLowProgress(threshold: number = 40): Promise<ScriptingPhaseData[]> {
    try {
      logger.info(`Getting dramas with progress <${threshold}%`);

      const allData = await this.getScriptingPhaseData();
      const lowProgress = allData.filter((d) => d.progress < threshold);

      logger.info(`Found ${lowProgress.length} dramas with low progress`);
      return lowProgress;
    } catch (error) {
      this.handleError(error, `get dramas with low progress (threshold: ${threshold})`);
    }
  }

  /**
   * Invalidate cache when scripting data changes
   */
  async invalidateScriptingCache(): Promise<void> {
    await this.invalidateCache('analytics:scripting-phase-data');
    await this.invalidateCache('analytics:scripting-overview');
    logger.info('Scripting analytics cache invalidated');
  }
}

/**
 * Helper function to create a ScriptingAnalyticsService instance
 */
export function createScriptingAnalyticsService(
  context: RepositoryContextType = 'server'
): ScriptingAnalyticsService {
  return new ScriptingAnalyticsService(context);
}
