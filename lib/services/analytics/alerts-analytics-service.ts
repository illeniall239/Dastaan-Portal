/**
 * Alerts Analytics Service
 *
 * Handles critical alerts generation and management for the pipeline.
 * Detects stuck stories, evaluation delays, prolonged negotiations, and bottlenecks.
 *
 * Usage:
 * ```typescript
 * const service = new AlertsAnalyticsService('server');
 * const alerts = await service.getCriticalAlerts();
 * const summary = await service.getAlertsSummary();
 * ```
 */

import {
  StoryRepository,
  CallReportRepository,
  type RepositoryContextType,
} from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert types
 */
export type AlertType =
  | 'bottleneck'
  | 'stuck_story'
  | 'evaluation_delay'
  | 'payment_overdue'
  | 'long_negotiation';

/**
 * Critical alert data structure
 */
export interface CriticalAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedEntity: string;
  entityId: string;
  daysDelayed?: number;
  createdAt: string;
}

/**
 * Alerts summary
 */
export interface AlertsSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

/**
 * Stagnation thresholds by stage (in days)
 */
const STAGNATION_THRESHOLDS: Record<string, number> = {
  in_evaluation: 10,
  in_negotiation: 21,
  approved: 14,
  contracted: 30,
  in_payment: 45,
  default: 14,
};

/**
 * Alerts analytics service
 * Uses StoryRepository and CallReportRepository instead of direct Supabase queries
 */
export class AlertsAnalyticsService extends BaseAnalyticsService {
  private storyRepo: StoryRepository;
  private callReportRepo: CallReportRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.storyRepo = new StoryRepository(context);
    this.callReportRepo = new CallReportRepository(context);
  }

  /**
   * Get all critical alerts for the pipeline
   * Detects stuck stories, evaluation delays, prolonged negotiations, and bottlenecks
   *
   * @returns Array of critical alerts sorted by severity
   */
  async getCriticalAlerts(): Promise<CriticalAlert[]> {
    try {
      logger.info('Getting critical alerts');

      return await this.withCache(
        'analytics:critical-alerts',
        async () => {
          const alerts: CriticalAlert[] = [];

          // Get all active stories
          const stories = await this.storyRepo.findAll({
            select: 'id, story_id, title, status, updated_at, created_at',
            order: { column: 'updated_at', ascending: true },
          });

          const activeStories = stories.filter(
            (s) => !['completed', 'rejected', 'archived'].includes(s.status)
          );

          // 1. Check for stuck stories (not updated in > 14 days)
          activeStories.forEach((story) => {
            const daysSinceUpdate = TimeUtils.daysSince(story.updated_at);

            if (daysSinceUpdate > 14) {
              alerts.push({
                id: `stuck-${story.id}`,
                type: 'stuck_story',
                severity: daysSinceUpdate > 30 ? 'critical' : 'warning',
                title: `Story stuck in ${story.status}`,
                description: `"${story.title}" has not been updated for ${daysSinceUpdate} days`,
                affectedEntity: story.title,
                entityId: story.id,
                daysDelayed: daysSinceUpdate,
                createdAt: story.updated_at,
              });
            }
          });

          // 2. Check for evaluation delays (call reports in ready_for_evaluation > 7 days)
          const callReports = await this.callReportRepo.findAll({
            select: 'id, working_title, created_at, status',
            filters: { status: 'ready_for_evaluation' },
          });

          callReports.forEach((report) => {
            const daysPending = TimeUtils.daysSince(report.created_at);

            if (daysPending > 7) {
              alerts.push({
                id: `eval-delay-${report.id}`,
                type: 'evaluation_delay',
                severity: daysPending > 14 ? 'critical' : 'warning',
                title: 'Evaluation pending',
                description: `"${report.working_title}" awaiting evaluation for ${daysPending} days`,
                affectedEntity: report.working_title,
                entityId: report.id,
                daysDelayed: daysPending,
                createdAt: report.created_at,
              });
            }
          });

          // 3. Check for prolonged negotiations (stories in negotiation > 21 days)
          const negotiationStories = activeStories.filter(
            (s) => s.status === 'in_negotiation'
          );

          negotiationStories.forEach((story) => {
            const daysInNegotiation = TimeUtils.daysSince(story.updated_at);

            if (daysInNegotiation > 21) {
              alerts.push({
                id: `negotiation-${story.id}`,
                type: 'long_negotiation',
                severity: daysInNegotiation > 45 ? 'critical' : 'warning',
                title: 'Prolonged negotiation',
                description: `"${story.title}" in negotiation for ${daysInNegotiation} days`,
                affectedEntity: story.title,
                entityId: story.id,
                daysDelayed: daysInNegotiation,
                createdAt: story.updated_at,
              });
            }
          });

          // 4. Check for bottleneck stages
          const stagnantByStage: Record<
            string,
            { stagnant: any[]; total: number }
          > = {};

          activeStories.forEach((story) => {
            if (!stagnantByStage[story.status]) {
              stagnantByStage[story.status] = { stagnant: [], total: 0 };
            }
            stagnantByStage[story.status].total++;

            const daysSinceUpdate = TimeUtils.daysSince(story.updated_at);
            const threshold =
              STAGNATION_THRESHOLDS[story.status] || STAGNATION_THRESHOLDS.default;

            if (daysSinceUpdate > threshold) {
              stagnantByStage[story.status].stagnant.push(story);
            }
          });

          // Create bottleneck alerts for stages with significant stagnation
          Object.entries(stagnantByStage).forEach(([status, data]) => {
            const stagnantCount = data.stagnant.length;
            const totalInStage = data.total;
            const stagnantPercent = (stagnantCount / totalInStage) * 100;

            // Bottleneck criteria: ≥5 stagnant stories OR ≥30% of stories in that stage are stagnant
            if (stagnantCount >= 5 || stagnantPercent >= 30) {
              const threshold =
                STAGNATION_THRESHOLDS[status] || STAGNATION_THRESHOLDS.default;

              const maxDaysDelayed = Math.max(
                ...data.stagnant.map((s) => TimeUtils.daysSince(s.updated_at))
              );

              alerts.push({
                id: `bottleneck-${status}`,
                type: 'bottleneck',
                severity: stagnantCount >= 10 ? 'critical' : 'warning',
                title: `Pipeline bottleneck: ${status}`,
                description: `${stagnantCount} of ${totalInStage} stories in ${status} are stagnant (>${threshold} days without update)`,
                affectedEntity: status,
                entityId: status,
                daysDelayed: maxDaysDelayed,
                createdAt: new Date().toISOString(),
              });
            }
          });

          // Sort by severity and date
          const severityOrder: Record<AlertSeverity, number> = {
            critical: 0,
            warning: 1,
            info: 2,
          };

          const sortedAlerts = alerts.sort((a, b) => {
            if (a.severity !== b.severity) {
              return severityOrder[a.severity] - severityOrder[b.severity];
            }
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });

          logger.info(
            `Found ${sortedAlerts.length} critical alerts (${sortedAlerts.filter((a) => a.severity === 'critical').length} critical, ${sortedAlerts.filter((a) => a.severity === 'warning').length} warning)`
          );

          return sortedAlerts;
        },
        180 // 3 minute cache (alerts need to be relatively fresh)
      );
    } catch (error) {
      this.handleError(error, 'get critical alerts');
    }
  }

  /**
   * Get count of alerts by severity
   *
   * @returns Summary of alert counts
   */
  async getAlertsSummary(): Promise<AlertsSummary> {
    try {
      logger.info('Getting alerts summary');

      return await this.withCache(
        'analytics:alerts-summary',
        async () => {
          const alerts = await this.getCriticalAlerts();

          const summary: AlertsSummary = {
            total: alerts.length,
            critical: alerts.filter((a) => a.severity === 'critical').length,
            warning: alerts.filter((a) => a.severity === 'warning').length,
            info: alerts.filter((a) => a.severity === 'info').length,
          };

          logger.info(
            `Alerts summary: ${summary.total} total (${summary.critical} critical, ${summary.warning} warning, ${summary.info} info)`
          );

          return summary;
        },
        180 // 3 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get alerts summary');
    }
  }

  /**
   * Get alerts by severity
   *
   * @param severity - Severity level to filter by
   * @returns Array of alerts with the specified severity
   */
  async getAlertsBySeverity(severity: AlertSeverity): Promise<CriticalAlert[]> {
    try {
      logger.info(`Getting alerts by severity: ${severity}`);

      const allAlerts = await this.getCriticalAlerts();
      const filtered = allAlerts.filter((a) => a.severity === severity);

      logger.info(`Found ${filtered.length} ${severity} alerts`);
      return filtered;
    } catch (error) {
      this.handleError(error, `get alerts by severity ${severity}`);
    }
  }

  /**
   * Get alerts by type
   *
   * @param type - Alert type to filter by
   * @returns Array of alerts with the specified type
   */
  async getAlertsByType(type: AlertType): Promise<CriticalAlert[]> {
    try {
      logger.info(`Getting alerts by type: ${type}`);

      const allAlerts = await this.getCriticalAlerts();
      const filtered = allAlerts.filter((a) => a.type === type);

      logger.info(`Found ${filtered.length} ${type} alerts`);
      return filtered;
    } catch (error) {
      this.handleError(error, `get alerts by type ${type}`);
    }
  }

  /**
   * Get critical alerts only (severity = critical)
   *
   * @returns Array of critical alerts
   */
  async getCriticalAlertsOnly(): Promise<CriticalAlert[]> {
    return this.getAlertsBySeverity('critical');
  }

  /**
   * Get stuck stories alerts
   *
   * @returns Array of stuck story alerts
   */
  async getStuckStoryAlerts(): Promise<CriticalAlert[]> {
    return this.getAlertsByType('stuck_story');
  }

  /**
   * Get evaluation delay alerts
   *
   * @returns Array of evaluation delay alerts
   */
  async getEvaluationDelayAlerts(): Promise<CriticalAlert[]> {
    return this.getAlertsByType('evaluation_delay');
  }

  /**
   * Get bottleneck alerts
   *
   * @returns Array of bottleneck alerts
   */
  async getBottleneckAlerts(): Promise<CriticalAlert[]> {
    return this.getAlertsByType('bottleneck');
  }

  /**
   * Invalidate cache when alerts need to be refreshed
   */
  async invalidateAlertsCache(): Promise<void> {
    await this.invalidateCache('analytics:critical-alerts');
    await this.invalidateCache('analytics:alerts-summary');
    logger.info('Alerts cache invalidated');
  }
}

/**
 * Helper function to create an AlertsAnalyticsService instance
 */
export function createAlertsAnalyticsService(
  context: RepositoryContextType = 'server'
): AlertsAnalyticsService {
  return new AlertsAnalyticsService(context);
}
