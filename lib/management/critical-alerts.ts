import { createClient } from '@/lib/supabase/server';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertType = 'bottleneck' | 'stuck_story' | 'evaluation_delay' | 'payment_overdue' | 'long_negotiation';

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
 * Get all critical alerts for the pipeline
 */
export async function getCriticalAlerts(): Promise<CriticalAlert[]> {
  const supabase = await createClient();
  const alerts: CriticalAlert[] = [];

  try {
    // Get all active stories
    const { data: stories } = await supabase
      .from('stories')
      .select('*')
      .not('status', 'in', '(completed,rejected,archived)');

    if (!stories) return [];

    const now = new Date();

    // Check for stuck stories (not updated in > 14 days)
    stories.forEach(story => {
      const lastUpdate = new Date(story.updated_at);
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

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

    // Check for evaluation delays (call reports in ready_for_evaluation > 7 days)
    const { data: callReports } = await supabase
      .from('call_reports')
      .select('id, working_title, created_at, status')
      .eq('status', 'ready_for_evaluation');

    (callReports || []).forEach(report => {
      const created = new Date(report.created_at);
      const daysPending = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

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

    // Check for negotiation delays (stories in negotiation > 21 days)
    const negotiationStories = stories.filter(s => s.status === 'in_negotiation');
    negotiationStories.forEach(story => {
      const lastUpdate = new Date(story.updated_at);
      const daysInNegotiation = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

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

    // Check for bottleneck stages (proper logic: detect stagnation)
    // Define stage-specific thresholds for "stagnant" stories
    const stagnationThresholds: Record<string, number> = {
      'in_evaluation': 10,      // 10 days without update = stagnant
      'in_negotiation': 21,     // 21 days without update = stagnant
      'approved': 14,           // 14 days without update = stagnant
      'contracted': 30,         // 30 days without update = stagnant
      'in_payment': 45,         // 45 days without update = stagnant
      'default': 14             // Default for other stages
    };

    // Group stories by status and identify stagnant ones
    const stagnantByStage: Record<string, { stagnant: any[], total: number }> = {};

    stories.forEach(story => {
      if (!stagnantByStage[story.status]) {
        stagnantByStage[story.status] = { stagnant: [], total: 0 };
      }
      stagnantByStage[story.status].total++;

      const lastUpdate = new Date(story.updated_at);
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      const threshold = stagnationThresholds[story.status] || stagnationThresholds.default;

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
        const threshold = stagnationThresholds[status] || stagnationThresholds.default;

        alerts.push({
          id: `bottleneck-${status}`,
          type: 'bottleneck',
          severity: stagnantCount >= 10 ? 'critical' : 'warning',
          title: `Pipeline bottleneck: ${status}`,
          description: `${stagnantCount} of ${totalInStage} stories in ${status} are stagnant (>${threshold} days without update)`,
          affectedEntity: status,
          entityId: status,
          daysDelayed: Math.max(...data.stagnant.map(s => {
            const lastUpdate = new Date(s.updated_at);
            return Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
          })),
          createdAt: now.toISOString(),
        });
      }
    });

    // Sort by severity and date
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  } catch (error) {
    console.error('Error fetching critical alerts:', error);
    return [];
  }
}

/**
 * Get count of alerts by severity
 */
export async function getAlertsSummary() {
  const alerts = await getCriticalAlerts();

  return {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };
}
