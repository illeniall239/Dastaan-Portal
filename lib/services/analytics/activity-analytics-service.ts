/**
 * Activity Analytics Service
 *
 * Handles analytics for recent system activity.
 * Combines data from audit logs and entity updates.
 *
 * Usage:
 * ```typescript
 * const service = new ActivityAnalyticsService('server');
 * const activity = await service.getRecentActivity(20);
 * const grouped = service.groupActivitiesByTime(activity);
 * ```
 */

import {
  AuditLogRepository,
  StoryRepository,
  EvaluationRepository,
  EpisodicEvaluationRepository,
  type RepositoryContextType,
} from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Recent activity data structure
 */
export interface RecentActivity {
  id: string;
  action: string;
  description: string;
  entityType: string;
  entityName: string;
  entityId: string;
  performedBy: string;
  performedByEmail: string;
  timestamp: string;
  icon: 'story' | 'evaluation' | 'approval' | 'contract' | 'payment' | 'user' | 'episode';
}

/**
 * Grouped activities by time period
 */
export interface GroupedActivities {
  today: RecentActivity[];
  yesterday: RecentActivity[];
  thisWeek: RecentActivity[];
  older: RecentActivity[];
}

/**
 * Activity analytics service
 * Tracks recent system activity from audit logs and entity updates
 */
export class ActivityAnalyticsService extends BaseAnalyticsService {
  private auditLogRepo: AuditLogRepository;
  private storyRepo: StoryRepository;
  private evaluationRepo: EvaluationRepository;
  private episodicEvalRepo: EpisodicEvaluationRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.auditLogRepo = new AuditLogRepository(context);
    this.storyRepo = new StoryRepository(context);
    this.evaluationRepo = new EvaluationRepository(context);
    this.episodicEvalRepo = new EpisodicEvaluationRepository(context);
  }

  /**
   * Get recent activity from audit logs and table updates
   * Combines audit logs with recent entity updates if needed
   *
   * @param limit - Maximum number of activities to return (default: 15)
   * @returns Array of recent activities
   */
  async getRecentActivity(limit: number = 15): Promise<RecentActivity[]> {
    try {
      logger.info(`Getting recent activity (limit: ${limit})`);

      return await this.withCache(
        `analytics:recent-activity:${limit}`,
        async () => {
          const activities: RecentActivity[] = [];

          // Get recent audit logs (primary source)
          const auditLogs = await this.auditLogRepo.findAll({
            select: `
              *,
              user:users!audit_logs_performed_by_fkey(name, email)
            `,
            order: { column: 'timestamp', ascending: false },
            pagination: { limit, offset: 0 },
          });

          // Transform audit logs to activities
          auditLogs.forEach((log: any) => {
            activities.push({
              id: log.id,
              action: log.action,
              description: this.formatActionDescription(log.action, log.entity_type, log.details),
              entityType: log.entity_type,
              entityName: log.details?.entity_name || 'Unknown',
              entityId: log.entity_id,
              performedBy: log.user?.name || 'System',
              performedByEmail: log.user?.email || '',
              timestamp: log.timestamp,
              icon: this.getIconForEntityType(log.entity_type),
            });
          });

          // If not enough audit logs, supplement with recent updates from main tables
          if (activities.length < limit) {
            logger.info(
              `Only ${activities.length} audit logs found, supplementing with entity updates`
            );

            // Get recent story updates
            const stories = await this.storyRepo.findAll({
              select: `
                id,
                title,
                status,
                updated_at,
                creator:users!stories_created_by_fkey(name, email)
              `,
              order: { column: 'updated_at', ascending: false },
              pagination: { limit: 10, offset: 0 },
            });

            stories.forEach((story: any) => {
              activities.push({
                id: `story-${story.id}`,
                action: 'updated',
                description: `Story status changed to ${story.status}`,
                entityType: 'story',
                entityName: story.title,
                entityId: story.id,
                performedBy: story.creator?.name || 'Unknown',
                performedByEmail: story.creator?.email || '',
                timestamp: story.updated_at,
                icon: 'story',
              });
            });

            // Get recent evaluations
            const evaluations = await this.evaluationRepo.findAll({
              select: `
                id,
                call_report_id,
                created_at,
                evaluator:users!evaluator_forms_evaluator_id_fkey(name, email),
                call_report:call_reports!evaluator_forms_call_report_id_fkey(working_title)
              `,
              order: { column: 'created_at', ascending: false },
              pagination: { limit: 10, offset: 0 },
            });

            evaluations.forEach((evaluation: any) => {
              activities.push({
                id: `eval-${evaluation.id}`,
                action: 'submitted_evaluation',
                description: `Evaluation submitted for "${evaluation.call_report?.working_title || 'Untitled'}"`,
                entityType: 'evaluation',
                entityName: evaluation.call_report?.working_title || 'Untitled',
                entityId: evaluation.call_report_id,
                performedBy: evaluation.evaluator?.name || 'Unknown',
                performedByEmail: evaluation.evaluator?.email || '',
                timestamp: evaluation.created_at,
                icon: 'evaluation',
              });
            });

            // Get recent episodic evaluations
            const episodicEvals = await this.episodicEvalRepo.findAll({
              select: `
                id,
                episode_id,
                submitted_at,
                evaluator:users!episodic_evaluations_evaluator_id_fkey(name, email),
                episode:episodes!episodic_evaluations_episode_id_fkey(
                  episode_number,
                  call_report:call_reports(working_title)
                )
              `,
              order: { column: 'submitted_at', ascending: false },
              pagination: { limit: 10, offset: 0 },
            });

            episodicEvals.forEach((episodicEval: any) => {
              const episode = episodicEval.episode;
              const title = episode?.call_report?.working_title || 'Unknown Drama';
              activities.push({
                id: `ep-eval-${episodicEval.id}`,
                action: 'submitted_episodic_evaluation',
                description: `Episode ${episode?.episode_number || '?'} evaluation submitted for "${title}"`,
                entityType: 'episode',
                entityName: `${title} - Episode ${episode?.episode_number || '?'}`,
                entityId: episodicEval.episode_id,
                performedBy: episodicEval.evaluator?.name || 'Unknown',
                performedByEmail: episodicEval.evaluator?.email || '',
                timestamp: episodicEval.submitted_at,
                icon: 'episode',
              });
            });
          }

          // Sort by timestamp (most recent first) and limit
          const sorted = activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);

          logger.info(`Found ${sorted.length} recent activities`);
          return sorted;
        },
        180 // 3 minute cache (activity changes frequently)
      );
    } catch (error) {
      this.handleError(error, `get recent activity (limit: ${limit})`);
    }
  }

  /**
   * Group activities by time period
   * Divides activities into today, yesterday, this week, and older
   *
   * @param activities - Array of activities to group
   * @returns Grouped activities object
   */
  groupActivitiesByTime(activities: RecentActivity[]): GroupedActivities {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    return {
      today: activities.filter((a) => new Date(a.timestamp) >= today),
      yesterday: activities.filter((a) => {
        const date = new Date(a.timestamp);
        return date >= yesterday && date < today;
      }),
      thisWeek: activities.filter((a) => {
        const date = new Date(a.timestamp);
        return date >= thisWeek && date < yesterday;
      }),
      older: activities.filter((a) => new Date(a.timestamp) < thisWeek),
    };
  }

  /**
   * Get activities by entity type
   *
   * @param entityType - Entity type filter
   * @param limit - Maximum number of activities
   * @returns Array of activities for the entity type
   */
  async getActivitiesByEntityType(
    entityType: string,
    limit: number = 15
  ): Promise<RecentActivity[]> {
    try {
      logger.info(`Getting activities for entity type: ${entityType}`);

      const allActivities = await this.getRecentActivity(limit * 2); // Fetch more to ensure enough after filtering
      return allActivities.filter((a) => a.entityType === entityType).slice(0, limit);
    } catch (error) {
      this.handleError(error, `get activities by entity type (${entityType})`);
    }
  }

  /**
   * Get activities by user
   *
   * @param userEmail - User email filter
   * @param limit - Maximum number of activities
   * @returns Array of activities performed by the user
   */
  async getActivitiesByUser(userEmail: string, limit: number = 15): Promise<RecentActivity[]> {
    try {
      logger.info(`Getting activities for user: ${userEmail}`);

      return await this.withCache(
        `analytics:activity:user:${userEmail}:${limit}`,
        async () => {
          // Get audit logs for this user
          const auditLogs = await this.auditLogRepo.findByUser(userEmail, {
            select: `
              *,
              user:users!audit_logs_performed_by_fkey(name, email)
            `,
            order: { column: 'timestamp', ascending: false },
            pagination: { limit, offset: 0 },
          });

          const activities: RecentActivity[] = auditLogs.map((log: any) => ({
            id: log.id,
            action: log.action,
            description: this.formatActionDescription(log.action, log.entity_type, log.details),
            entityType: log.entity_type,
            entityName: log.details?.entity_name || 'Unknown',
            entityId: log.entity_id,
            performedBy: log.user?.name || 'System',
            performedByEmail: log.user?.email || '',
            timestamp: log.timestamp,
            icon: this.getIconForEntityType(log.entity_type),
          }));

          logger.info(`Found ${activities.length} activities for user ${userEmail}`);
          return activities;
        },
        180 // 3 minute cache
      );
    } catch (error) {
      this.handleError(error, `get activities by user (${userEmail})`);
    }
  }

  /**
   * Format action description based on type
   *
   * @param action - Action performed
   * @param entityType - Type of entity
   * @param details - Additional details
   * @returns Formatted description string
   */
  private formatActionDescription(action: string, entityType: string, details: any): string {
    const name = details?.entity_name || entityType;

    switch (action) {
      case 'created':
        return `Created ${entityType}: "${name}"`;
      case 'updated':
        return `Updated ${entityType}: "${name}"`;
      case 'deleted':
        return `Deleted ${entityType}: "${name}"`;
      case 'status_change':
        return `Changed status of "${name}" to ${details?.new_status || 'unknown'}`;
      case 'assigned':
        return `Assigned ${entityType} "${name}" to ${details?.assigned_to || 'someone'}`;
      case 'evaluated':
        return `Evaluated "${name}"`;
      case 'approved':
        return `Approved "${name}"`;
      case 'rejected':
        return `Rejected "${name}"`;
      default:
        return `${action} ${entityType}: "${name}"`;
    }
  }

  /**
   * Get icon type for entity
   *
   * @param entityType - Type of entity
   * @returns Icon identifier
   */
  private getIconForEntityType(entityType: string): RecentActivity['icon'] {
    switch (entityType.toLowerCase()) {
      case 'story':
        return 'story';
      case 'evaluation':
      case 'evaluator_form':
        return 'evaluation';
      case 'one_liner':
      case 'approval':
        return 'approval';
      case 'contract':
        return 'contract';
      case 'payment':
        return 'payment';
      case 'user':
        return 'user';
      case 'episode':
      case 'episodic_evaluation':
        return 'episode';
      default:
        return 'story';
    }
  }

  /**
   * Invalidate cache when activity changes
   */
  async invalidateActivityCache(): Promise<void> {
    // Note: Would need to track all cache keys with different limits and users
    await this.invalidateCache('analytics:recent-activity:15');
    await this.invalidateCache('analytics:recent-activity:20');
    await this.invalidateCache('analytics:recent-activity:30');
    logger.info('Activity analytics cache invalidated');
  }
}

/**
 * Helper function to create an ActivityAnalyticsService instance
 */
export function createActivityAnalyticsService(
  context: RepositoryContextType = 'server'
): ActivityAnalyticsService {
  return new ActivityAnalyticsService(context);
}
