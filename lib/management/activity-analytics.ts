import { createAdminClient } from '@/lib/supabase/admin';

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
 * Get recent activity from audit logs and table updates
 */
export async function getRecentActivity(limit: number = 15): Promise<RecentActivity[]> {
  const supabase = createAdminClient();
  const activities: RecentActivity[] = [];

  try {
    // Get recent audit logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!audit_logs_performed_by_fkey(name, email)
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (auditLogs) {
      auditLogs.forEach((log: any) => {
        activities.push({
          id: log.id,
          action: log.action,
          description: formatActionDescription(log.action, log.entity_type, log.details),
          entityType: log.entity_type,
          entityName: log.details?.entity_name || 'Unknown',
          entityId: log.entity_id,
          performedBy: log.user?.name || 'System',
          performedByEmail: log.user?.email || '',
          timestamp: log.timestamp,
          icon: getIconForEntityType(log.entity_type),
        });
      });
    }

    // If not enough audit logs, supplement with recent updates from main tables
    if (activities.length < limit) {
      // Get recent story updates
      const { data: stories } = await supabase
        .from('stories')
        .select(`
          id,
          title,
          status,
          updated_at,
          creator:users!stories_created_by_fkey(name, email)
        `)
        .order('updated_at', { ascending: false })
        .limit(10);

      (stories || []).forEach((story: any) => {
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
      const { data: evaluations } = await supabase
        .from('evaluator_forms')
        .select(`
          id,
          call_report_id,
          created_at,
          evaluator:users!evaluator_forms_evaluator_id_fkey(name, email),
          call_report:call_reports!evaluator_forms_call_report_id_fkey(working_title)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      (evaluations || []).forEach((evaluation: any) => {
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
      const { data: episodicEvals } = await supabase
        .from('episodic_evaluations')
        .select(`
          id,
          episode_id,
          submitted_at,
          evaluator:users!episodic_evaluations_evaluator_id_fkey(name, email),
          episode:episodes!episodic_evaluations_episode_id_fkey(
            episode_number,
            call_report:call_reports(working_title)
          )
        `)
        .order('submitted_at', { ascending: false })
        .limit(10);

      (episodicEvals || []).forEach((episodicEval: any) => {
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

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

/**
 * Format action description based on type
 */
function formatActionDescription(action: string, entityType: string, details: any): string {
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
 */
function getIconForEntityType(entityType: string): RecentActivity['icon'] {
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
 * Group activities by time period
 */
export function groupActivitiesByTime(activities: RecentActivity[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  return {
    today: activities.filter(a => new Date(a.timestamp) >= today),
    yesterday: activities.filter(a => {
      const date = new Date(a.timestamp);
      return date >= yesterday && date < today;
    }),
    thisWeek: activities.filter(a => {
      const date = new Date(a.timestamp);
      return date >= thisWeek && date < yesterday;
    }),
    older: activities.filter(a => new Date(a.timestamp) < thisWeek),
  };
}
