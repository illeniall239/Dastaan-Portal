import { createClient } from '@/lib/supabase/server';

export type ActivityType = 'story' | 'evaluation' | 'approval' | 'contract' | 'payment' | 'negotiation';

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
 * Get all activities from the last 7 days
 * Uses audit_logs first, falls back to querying source tables if empty
 */
export async function getWeeklyActivities(): Promise<WeeklyActivity[]> {
  const supabase = await createClient();
  const activities: WeeklyActivity[] = [];

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // TRY 1: Fetch from audit logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select(`
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
      `)
      .gte('timestamp', sevenDaysAgo.toISOString())
      .order('timestamp', { ascending: false });

    // Process audit logs if available
    if (auditLogs && auditLogs.length > 0) {
      auditLogs.forEach(log => {
        const timestamp = new Date(log.timestamp);
        const performerName = (log.performer as any)?.name || 'System';
        const performerId = (log.performer as any)?.id || '';
        const entityType = normalizeEntityType(log.entity_type);
        const entityName = getEntityName(log.entity_type, log.action, log.details);

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
          dateGroup: getDateGroup(timestamp, todayStart, yesterdayStart),
          timeAgo: formatTimeAgo(timestamp),
        });
      });
    }

    // TRY 2: If no audit logs, fetch from source tables
    if (activities.length === 0) {
      // Fetch recent stories
      const { data: stories } = await supabase
        .from('stories')
        .select('id, story_id, title, status, created_at, updated_at, creator:users!stories_created_by_fkey(id, name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      (stories || []).forEach(story => {
        const timestamp = new Date(story.created_at);
        activities.push({
          id: `story-${story.id}`,
          action: 'created',
          entityType: 'story',
          entityName: story.title,
          entityId: story.id,
          performedBy: (story.creator as any)?.name || 'Unknown',
          performedById: (story.creator as any)?.id || '',
          timestamp: story.created_at,
          details: { status: story.status, story_id: story.story_id },
          dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
          dateGroup: getDateGroup(timestamp, todayStart, yesterdayStart),
          timeAgo: formatTimeAgo(timestamp),
        });
      });

      // Fetch recent evaluations
      const { data: evaluations } = await supabase
        .from('evaluator_forms')
        .select(`
          id,
          call_report_id,
          submitted_at,
          average_score,
          evaluator:users!evaluator_forms_evaluator_id_fkey(id, name),
          call_report:call_reports!evaluator_forms_call_report_id_fkey(working_title)
        `)
        .not('submitted_at', 'is', null)
        .gte('submitted_at', sevenDaysAgo.toISOString())
        .order('submitted_at', { ascending: false });

      (evaluations || []).forEach(evaluation => {
        const timestamp = new Date(evaluation.submitted_at!);
        activities.push({
          id: `eval-${evaluation.id}`,
          action: 'submitted_evaluation',
          entityType: 'evaluation',
          entityName: (evaluation.call_report as any)?.working_title || 'Evaluation',
          entityId: evaluation.call_report_id,
          performedBy: (evaluation.evaluator as any)?.name || 'Unknown',
          performedById: (evaluation.evaluator as any)?.id || '',
          timestamp: evaluation.submitted_at!,
          details: { average_score: evaluation.average_score },
          dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
          dateGroup: getDateGroup(timestamp, todayStart, yesterdayStart),
          timeAgo: formatTimeAgo(timestamp),
        });
      });

      // Fetch recent contracts
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, contract_id, project_title, status, created_at, creator:users!contracts_created_by_fkey(id, name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      (contracts || []).forEach(contract => {
        const timestamp = new Date(contract.created_at);
        activities.push({
          id: `contract-${contract.id}`,
          action: 'created',
          entityType: 'contract',
          entityName: contract.project_title || contract.contract_id || 'Contract',
          entityId: contract.id,
          performedBy: (contract.creator as any)?.name || 'Unknown',
          performedById: (contract.creator as any)?.id || '',
          timestamp: contract.created_at,
          details: { status: contract.status, contract_id: contract.contract_id },
          dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
          dateGroup: getDateGroup(timestamp, todayStart, yesterdayStart),
          timeAgo: formatTimeAgo(timestamp),
        });
      });

      // Fetch recent payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id, payment_id, milestone_name, status, created_at, payment_amount, approved_by:users!payments_approved_by_fkey(id, name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      (payments || []).forEach(payment => {
        const timestamp = new Date(payment.created_at);
        activities.push({
          id: `payment-${payment.id}`,
          action: 'created',
          entityType: 'payment',
          entityName: payment.milestone_name || payment.payment_id || 'Payment',
          entityId: payment.id,
          performedBy: (payment.approved_by as any)?.name || 'System',
          performedById: (payment.approved_by as any)?.id || '',
          timestamp: payment.created_at,
          details: { status: payment.status, amount: payment.payment_amount },
          dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
          dateGroup: getDateGroup(timestamp, todayStart, yesterdayStart),
          timeAgo: formatTimeAgo(timestamp),
        });
      });

      // Fetch recent negotiations
      const { data: negotiations } = await supabase
        .from('negotiations')
        .select('id, negotiation_id, status, created_at, agreed_price, created_by:users!negotiations_created_by_fkey(id, name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      (negotiations || []).forEach(negotiation => {
        const timestamp = new Date(negotiation.created_at);
        activities.push({
          id: `negotiation-${negotiation.id}`,
          action: 'created',
          entityType: 'negotiation',
          entityName: negotiation.negotiation_id || 'Negotiation',
          entityId: negotiation.id,
          performedBy: (negotiation.created_by as any)?.name || 'Unknown',
          performedById: (negotiation.created_by as any)?.id || '',
          timestamp: negotiation.created_at,
          details: { status: negotiation.status, agreed_price: negotiation.agreed_price },
          dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
          dateGroup: getDateGroup(timestamp, todayStart, yesterdayStart),
          timeAgo: formatTimeAgo(timestamp),
        });
      });

      // Fetch recent one-liners (approvals)
      const { data: oneLiners } = await supabase
        .from('one_liners')
        .select('id, created_at, decision, executive:users!one_liners_executive_id_fkey(id, name), story:stories!one_liners_story_id_fkey(title)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      (oneLiners || []).forEach(oneLiner => {
        const timestamp = new Date(oneLiner.created_at);
        activities.push({
          id: `approval-${oneLiner.id}`,
          action: oneLiner.decision || 'reviewed',
          entityType: 'approval',
          entityName: (oneLiner.story as any)?.title || 'Story',
          entityId: oneLiner.id,
          performedBy: (oneLiner.executive as any)?.name || 'Executive',
          performedById: (oneLiner.executive as any)?.id || '',
          timestamp: oneLiner.created_at,
          details: { decision: oneLiner.decision },
          dayOfWeek: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
          dateGroup: getDateGroup(timestamp, todayStart, yesterdayStart),
          timeAgo: formatTimeAgo(timestamp),
        });
      });
    }

    // Sort all activities by timestamp (most recent first)
    return activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  } catch (error) {
    console.error('Error fetching weekly activities:', error);
    return [];
  }
}

/**
 * Get statistics for weekly activities
 */
export async function getWeeklyActivityStats(): Promise<ActivityStats> {
  const activities = await getWeeklyActivities();
  const supabase = await createClient();

  try {
    // Get previous week's count for comparison
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { count: previousWeekCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', fourteenDaysAgo.toISOString())
      .lt('timestamp', sevenDaysAgo.toISOString());

    // Count by type
    const byType: Record<ActivityType, number> = {
      story: 0,
      evaluation: 0,
      approval: 0,
      contract: 0,
      payment: 0,
      negotiation: 0,
    };

    activities.forEach(activity => {
      byType[activity.entityType]++;
    });

    // Count by day
    const byDay: Record<string, number> = {};
    activities.forEach(activity => {
      byDay[activity.dayOfWeek] = (byDay[activity.dayOfWeek] || 0) + 1;
    });

    // Count by performer
    const byPerformer: Record<string, number> = {};
    activities.forEach(activity => {
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
    const mostActiveDay = Object.entries(byDay).reduce(
      (max, [day, count]) => (count > max.count ? { day, count } : max),
      { day: 'N/A', count: 0 }
    ).day;

    // Find top activity type
    const topActivityType = Object.entries(byType).reduce(
      (max, [type, count]) => (count > max.count ? { type: type as ActivityType, count } : max),
      { type: 'story' as ActivityType, count: 0 }
    ).type;

    // Calculate comparison to previous week
    const currentWeekCount = activities.length;
    const comparisonToPreviousWeek = previousWeekCount && previousWeekCount > 0
      ? Math.round(((currentWeekCount - previousWeekCount) / previousWeekCount) * 100)
      : 0;

    return {
      total: currentWeekCount,
      byType,
      byDay,
      topPerformers,
      mostActiveDay,
      topActivityType,
      comparisonToPreviousWeek,
    };
  } catch (error) {
    console.error('Error calculating activity stats:', error);
    return {
      total: 0,
      byType: { story: 0, evaluation: 0, approval: 0, contract: 0, payment: 0, negotiation: 0 },
      byDay: {},
      topPerformers: [],
      mostActiveDay: 'N/A',
      topActivityType: 'story',
      comparisonToPreviousWeek: 0,
    };
  }
}

/**
 * Determine date group for an activity
 */
function getDateGroup(timestamp: Date, todayStart: Date, yesterdayStart: Date): 'Today' | 'Yesterday' | 'Earlier This Week' {
  if (timestamp >= todayStart) return 'Today';
  if (timestamp >= yesterdayStart) return 'Yesterday';
  return 'Earlier This Week';
}

/**
 * Normalize entity type to one of our defined types
 */
function normalizeEntityType(entityType: string): ActivityType {
  const normalized = entityType.toLowerCase();

  if (normalized.includes('story') || normalized === 'stories') return 'story';
  if (normalized.includes('evaluat')) return 'evaluation';
  if (normalized.includes('approval') || normalized.includes('one_liner')) return 'approval';
  if (normalized.includes('contract')) return 'contract';
  if (normalized.includes('payment')) return 'payment';
  if (normalized.includes('negotiat')) return 'negotiation';

  // Default to story if unknown
  return 'story';
}

/**
 * Get a human-readable entity name from the log details
 */
function getEntityName(entityType: string, action: string, details: any): string {
  // Try to extract name from details
  if (details) {
    if (details.title) return details.title;
    if (details.story_title) return details.story_title;
    if (details.project_title) return details.project_title;
    if (details.name) return details.name;
    if (details.milestone_name) return details.milestone_name;
  }

  // Fallback to a generic name based on entity type and action
  const type = normalizeEntityType(entityType);
  const actionText = action.replace(/_/g, ' ');

  return `${type} ${actionText}`.replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format timestamp as "X minutes/hours/days ago"
 */
function formatTimeAgo(date: Date): string {
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
