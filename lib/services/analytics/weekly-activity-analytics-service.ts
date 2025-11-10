/**
 * Weekly Activity Analytics Service
 *
 * Handles analytics for weekly activities across all entities.
 * Provides comprehensive activity tracking and statistics.
 *
 * Usage:
 * ```typescript
 * const service = new WeeklyActivityAnalyticsService('server');
 * const activities = await service.getWeeklyActivities();
 * const stats = await service.getWeeklyActivityStats();
 * ```
 */

import {
  AuditLogRepository,
  StoryRepository,
  EvaluationRepository,
  ContractRepository,
  PaymentRepository,
  NegotiationRepository,
  OneLinerRepository,
  type RepositoryContextType,
} from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Activity type enum
 */
export type ActivityType =
  | 'story'
  | 'evaluation'
  | 'approval'
  | 'contract'
  | 'payment'
  | 'contractTerm';

/**
 * Weekly activity data structure
 */
export interface WeeklyActivity {
  id: string;
  action: string;
  entityType: ActivityType;
  entityName: string;
  entityId: string;
  performedBy: string;
  performedById: string;
  timestamp: string;
  details: any;
  // Derived fields
  dayOfWeek: string;
  dateGroup: 'Today' | 'Yesterday' | 'Earlier This Week';
  timeAgo: string;
}

/**
 * Weekly activity statistics
 */
export interface ActivityStats {
  total: number;
  byType: Record<ActivityType, number>;
  byDay: Record<string, number>;
  topPerformers: Array<{ name: string; count: number }>;
  mostActiveDay: string;
  topActivityType: ActivityType;
  comparisonToPreviousWeek: number;
}

/**
 * Weekly activity analytics service
 * Tracks all activities across entities in the last 7 days
 */
export class WeeklyActivityAnalyticsService extends BaseAnalyticsService {
  private auditLogRepo: AuditLogRepository;
  private storyRepo: StoryRepository;
  private evaluationRepo: EvaluationRepository;
  private contractRepo: ContractRepository;
  private paymentRepo: PaymentRepository;
  private negotiationRepo: NegotiationRepository;
  private oneLinerRepo: OneLinerRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.auditLogRepo = new AuditLogRepository(context);
    this.storyRepo = new StoryRepository(context);
    this.evaluationRepo = new EvaluationRepository(context);
    this.contractRepo = new ContractRepository(context);
    this.paymentRepo = new PaymentRepository(context);
    this.negotiationRepo = new NegotiationRepository(context);
    this.oneLinerRepo = new OneLinerRepository(context);
  }

  /**
   * Get all activities from the last 7 days
   * Uses audit_logs first, falls back to querying source tables if empty
   *
   * @returns Array of weekly activities
   */
  async getWeeklyActivities(): Promise<WeeklyActivity[]> {
    try {
      logger.info('Getting weekly activities');

      return await this.withCache(
        'analytics:weekly-activities',
        async () => {
          const activities: WeeklyActivity[] = [];
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

          // TRY 1: Fetch from audit logs (primary source)
          const auditLogs = await this.auditLogRepo.findAll({
            select: `
              id,
              entity_type,
              entity_id,
              action,
              timestamp,
              details,
              performed_by,
              performer:users!audit_logs_performed_by_fkey (
                id,
                name
              )
            `,
            filters: {
              timestamp: { gte: sevenDaysAgo.toISOString() },
            },
            order: { column: 'timestamp', ascending: false },
          });

          // Process audit logs if available
          if (auditLogs && auditLogs.length > 0) {
            logger.info(`Found ${auditLogs.length} audit logs`);

            auditLogs.forEach((log: any) => {
              const timestamp = new Date(log.timestamp);
              const performerName = log.performer?.name || 'System';
              const performerId = log.performer?.id || '';
              const entityType = this.normalizeEntityType(log.entity_type);
              const entityName = this.getEntityName(log.entity_type, log.action, log.details);

              activities.push({
                id: log.id,
                action: log.action,
                entityType,
                entityName,
                entityId: log.entity_id,
                performedBy: performerName,
                performedById: performerId,
                timestamp: log.timestamp,
                details: log.details,
                dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
                dateGroup: this.getDateGroup(timestamp, todayStart, yesterdayStart),
                timeAgo: this.formatTimeAgo(timestamp),
              });
            });
          }

          // TRY 2: If no audit logs, fetch from source tables
          if (activities.length === 0) {
            logger.info('No audit logs found, fetching from source tables');

            await this.fetchSourceTableActivities(activities, sevenDaysAgo, todayStart, yesterdayStart);
          }

          // Sort all activities by timestamp (most recent first)
          const sorted = activities.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          logger.info(`Found ${sorted.length} weekly activities`);
          return sorted;
        },
        180 // 3 minute cache (activities change frequently)
      );
    } catch (error) {
      this.handleError(error, 'get weekly activities');
    }
  }

  /**
   * Fetch activities from source tables (fallback method)
   *
   * @param activities - Activities array to populate
   * @param fromDate - Start date filter
   * @param todayStart - Today's start date
   * @param yesterdayStart - Yesterday's start date
   */
  private async fetchSourceTableActivities(
    activities: WeeklyActivity[],
    fromDate: Date,
    todayStart: Date,
    yesterdayStart: Date
  ): Promise<void> {
    // Fetch recent stories
    const stories = await this.storyRepo.findAll({
      select: 'id, story_id, title, status, created_at, updated_at, creator:users!stories_created_by_fkey(id, name)',
      filters: { created_at: { gte: fromDate.toISOString() } },
      order: { column: 'created_at', ascending: false },
    });

    stories.forEach((story: any) => {
      const timestamp = new Date(story.created_at);
      activities.push({
        id: `story-${story.id}`,
        action: 'created',
        entityType: 'story',
        entityName: story.title,
        entityId: story.id,
        performedBy: story.creator?.name || 'Unknown',
        performedById: story.creator?.id || '',
        timestamp: story.created_at,
        details: { status: story.status, story_id: story.story_id },
        dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
        dateGroup: this.getDateGroup(timestamp, todayStart, yesterdayStart),
        timeAgo: this.formatTimeAgo(timestamp),
      });
    });

    // Fetch recent evaluations
    const evaluations = await this.evaluationRepo.findAll({
      select: `
        id,
        call_report_id,
        submitted_at,
        average_score,
        evaluator:users!evaluator_forms_evaluator_id_fkey(id, name),
        call_report:call_reports!evaluator_forms_call_report_id_fkey(working_title)
      `,
      filters: {
        submitted_at: { gte: fromDate.toISOString(), not: null },
      },
      order: { column: 'submitted_at', ascending: false },
    });

    evaluations.forEach((evaluation: any) => {
      if (evaluation.submitted_at) {
        const timestamp = new Date(evaluation.submitted_at);
        activities.push({
          id: `eval-${evaluation.id}`,
          action: 'submitted_evaluation',
          entityType: 'evaluation',
          entityName: evaluation.call_report?.working_title || 'Evaluation',
          entityId: evaluation.call_report_id,
          performedBy: evaluation.evaluator?.name || 'Unknown',
          performedById: evaluation.evaluator?.id || '',
          timestamp: evaluation.submitted_at,
          details: { average_score: evaluation.average_score },
          dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
          dateGroup: this.getDateGroup(timestamp, todayStart, yesterdayStart),
          timeAgo: this.formatTimeAgo(timestamp),
        });
      }
    });

    // Fetch recent contracts
    const contracts = await this.contractRepo.findAll({
      select: 'id, contract_id, project_title, status, created_at, creator:users!contracts_created_by_fkey(id, name)',
      filters: { created_at: { gte: fromDate.toISOString() } },
      order: { column: 'created_at', ascending: false },
    });

    contracts.forEach((contract: any) => {
      const timestamp = new Date(contract.created_at);
      activities.push({
        id: `contract-${contract.id}`,
        action: 'created',
        entityType: 'contract',
        entityName: contract.project_title || contract.contract_id || 'Contract',
        entityId: contract.id,
        performedBy: contract.creator?.name || 'Unknown',
        performedById: contract.creator?.id || '',
        timestamp: contract.created_at,
        details: { status: contract.status, contract_id: contract.contract_id },
        dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
        dateGroup: this.getDateGroup(timestamp, todayStart, yesterdayStart),
        timeAgo: this.formatTimeAgo(timestamp),
      });
    });

    // Fetch recent payments
    const payments = await this.paymentRepo.findAll({
      select: 'id, payment_id, milestone_name, status, created_at, payment_amount, approved_by:users!payments_approved_by_fkey(id, name)',
      filters: { created_at: { gte: fromDate.toISOString() } },
      order: { column: 'created_at', ascending: false },
    });

    payments.forEach((payment: any) => {
      const timestamp = new Date(payment.created_at);
      activities.push({
        id: `payment-${payment.id}`,
        action: 'created',
        entityType: 'payment',
        entityName: payment.milestone_name || payment.payment_id || 'Payment',
        entityId: payment.id,
        performedBy: payment.approved_by?.name || 'System',
        performedById: payment.approved_by?.id || '',
        timestamp: payment.created_at,
        details: { status: payment.status, amount: payment.payment_amount },
        dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
        dateGroup: this.getDateGroup(timestamp, todayStart, yesterdayStart),
        timeAgo: this.formatTimeAgo(timestamp),
      });
    });

    // Fetch recent contract terms (negotiations)
    const contractTerms = await this.negotiationRepo.findAll({
      select: 'id, negotiation_id, status, created_at, agreed_price, created_by:users!negotiations_created_by_fkey(id, name)',
      filters: { created_at: { gte: fromDate.toISOString() } },
      order: { column: 'created_at', ascending: false },
    });

    contractTerms.forEach((contractTerm: any) => {
      const timestamp = new Date(contractTerm.created_at);
      activities.push({
        id: `contractTerm-${contractTerm.id}`,
        action: 'created',
        entityType: 'contractTerm',
        entityName: contractTerm.negotiation_id || 'Contract Term',
        entityId: contractTerm.id,
        performedBy: contractTerm.created_by?.name || 'Unknown',
        performedById: contractTerm.created_by?.id || '',
        timestamp: contractTerm.created_at,
        details: { status: contractTerm.status, agreed_price: contractTerm.agreed_price },
        dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
        dateGroup: this.getDateGroup(timestamp, todayStart, yesterdayStart),
        timeAgo: this.formatTimeAgo(timestamp),
      });
    });

    // Fetch recent one-liners (approvals)
    const oneLiners = await this.oneLinerRepo.findAll({
      select: 'id, created_at, decision, executive:users!one_liners_executive_id_fkey(id, name), story:stories!one_liners_story_id_fkey(title)',
      filters: { created_at: { gte: fromDate.toISOString() } },
      order: { column: 'created_at', ascending: false },
    });

    oneLiners.forEach((oneLiner: any) => {
      const timestamp = new Date(oneLiner.created_at);
      activities.push({
        id: `approval-${oneLiner.id}`,
        action: oneLiner.decision || 'reviewed',
        entityType: 'approval',
        entityName: oneLiner.story?.title || 'Story',
        entityId: oneLiner.id,
        performedBy: oneLiner.executive?.name || 'Executive',
        performedById: oneLiner.executive?.id || '',
        timestamp: oneLiner.created_at,
        details: { decision: oneLiner.decision },
        dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
        dateGroup: this.getDateGroup(timestamp, todayStart, yesterdayStart),
        timeAgo: this.formatTimeAgo(timestamp),
      });
    });
  }

  /**
   * Get statistics for weekly activities
   * Includes counts, distributions, top performers, and comparisons
   *
   * @returns Activity statistics
   */
  async getWeeklyActivityStats(): Promise<ActivityStats> {
    try {
      logger.info('Getting weekly activity statistics');

      return await this.withCache(
        'analytics:weekly-activity-stats',
        async () => {
          const activities = await this.getWeeklyActivities();

          // Get previous week's count for comparison
          const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

          const previousWeekLogs = await this.auditLogRepo.findAll({
            select: 'id',
            filters: {
              timestamp: {
                gte: fourteenDaysAgo.toISOString(),
                lt: sevenDaysAgo.toISOString(),
              },
            },
          });

          const previousWeekCount = previousWeekLogs.length;

          // Count by type
          const byType: Record<ActivityType, number> = {
            story: 0,
            evaluation: 0,
            approval: 0,
            contract: 0,
            payment: 0,
            contractTerm: 0,
          };

          activities.forEach((activity) => {
            byType[activity.entityType]++;
          });

          // Count by day
          const byDay: Record<string, number> = {};
          activities.forEach((activity) => {
            byDay[activity.dayOfWeek] = (byDay[activity.dayOfWeek] || 0) + 1;
          });

          // Count by performer
          const byPerformer: Record<string, number> = {};
          activities.forEach((activity) => {
            if (activity.performedBy && activity.performedBy !== 'System') {
              byPerformer[activity.performedBy] = (byPerformer[activity.performedBy] || 0) + 1;
            }
          });

          // Get top 5 performers
          const topPerformers = Object.entries(byPerformer)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

          // Find most active day
          const mostActiveDay =
            Object.keys(byDay).length > 0
              ? Object.entries(byDay).reduce(
                  (max, [day, count]) => (count > max.count ? { day, count } : max),
                  { day: 'N/A', count: 0 }
                ).day
              : 'N/A';

          // Find top activity type
          const topActivityType =
            Object.keys(byType).length > 0
              ? (Object.entries(byType).reduce(
                  (max, [type, count]) =>
                    count > max.count ? { type: type as ActivityType, count } : max,
                  { type: 'story' as ActivityType, count: 0 }
                ).type as ActivityType)
              : ('story' as ActivityType);

          // Calculate comparison to previous week
          const currentWeekCount = activities.length;
          const comparisonToPreviousWeek =
            previousWeekCount && previousWeekCount > 0
              ? Math.round(((currentWeekCount - previousWeekCount) / previousWeekCount) * 100)
              : 0;

          const stats: ActivityStats = {
            total: currentWeekCount,
            byType,
            byDay,
            topPerformers,
            mostActiveDay,
            topActivityType,
            comparisonToPreviousWeek,
          };

          logger.info(
            `Weekly activity stats: ${stats.total} total, ${stats.comparisonToPreviousWeek}% vs previous week`
          );

          return stats;
        },
        180 // 3 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get weekly activity stats');
    }
  }

  /**
   * Get activities by type
   *
   * @param type - Activity type filter
   * @returns Array of activities
   */
  async getActivitiesByType(type: ActivityType): Promise<WeeklyActivity[]> {
    try {
      logger.info(`Getting activities by type: ${type}`);

      const allActivities = await this.getWeeklyActivities();
      return allActivities.filter((a) => a.entityType === type);
    } catch (error) {
      this.handleError(error, `get activities by type (${type})`);
    }
  }

  /**
   * Get activities by performer
   *
   * @param performerId - User ID filter
   * @returns Array of activities
   */
  async getActivitiesByPerformer(performerId: string): Promise<WeeklyActivity[]> {
    try {
      logger.info(`Getting activities by performer: ${performerId}`);

      const allActivities = await this.getWeeklyActivities();
      return allActivities.filter((a) => a.performedById === performerId);
    } catch (error) {
      this.handleError(error, `get activities by performer (${performerId})`);
    }
  }

  /**
   * Determine date group for an activity
   *
   * @param timestamp - Activity timestamp
   * @param todayStart - Today's start date
   * @param yesterdayStart - Yesterday's start date
   * @returns Date group label
   */
  private getDateGroup(
    timestamp: Date,
    todayStart: Date,
    yesterdayStart: Date
  ): 'Today' | 'Yesterday' | 'Earlier This Week' {
    if (timestamp >= todayStart) return 'Today';
    if (timestamp >= yesterdayStart) return 'Yesterday';
    return 'Earlier This Week';
  }

  /**
   * Normalize entity type to one of our defined types
   *
   * @param entityType - Raw entity type string
   * @returns Normalized activity type
   */
  private normalizeEntityType(entityType: string): ActivityType {
    const normalized = entityType.toLowerCase();

    if (normalized.includes('story') || normalized === 'stories') return 'story';
    if (normalized.includes('evaluat')) return 'evaluation';
    if (normalized.includes('approval') || normalized.includes('one_liner')) return 'approval';
    if (normalized.includes('contract')) return 'contract';
    if (normalized.includes('payment')) return 'payment';
    if (normalized.includes('negotiat')) return 'contractTerm';

    // Default to story if unknown
    return 'story';
  }

  /**
   * Get a human-readable entity name from the log details
   *
   * @param entityType - Entity type
   * @param action - Action performed
   * @param details - Additional details
   * @returns Human-readable entity name
   */
  private getEntityName(entityType: string, action: string, details: any): string {
    // Try to extract name from details
    if (details) {
      if (details.title) return details.title;
      if (details.story_title) return details.story_title;
      if (details.project_title) return details.project_title;
      if (details.name) return details.name;
      if (details.milestone_name) return details.milestone_name;
    }

    // Fallback to a generic name based on entity type and action
    const type = this.normalizeEntityType(entityType);
    const actionText = action.replace(/_/g, ' ');

    return `${type} ${actionText}`.replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Format timestamp as "X minutes/hours/days ago"
   *
   * @param date - Timestamp date
   * @returns Formatted time ago string
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  }

  /**
   * Invalidate cache when activity changes
   */
  async invalidateWeeklyActivityCache(): Promise<void> {
    await this.invalidateCache('analytics:weekly-activities');
    await this.invalidateCache('analytics:weekly-activity-stats');
    logger.info('Weekly activity analytics cache invalidated');
  }
}

/**
 * Helper function to create a WeeklyActivityAnalyticsService instance
 */
export function createWeeklyActivityAnalyticsService(
  context: RepositoryContextType = 'server'
): WeeklyActivityAnalyticsService {
  return new WeeklyActivityAnalyticsService(context);
}
