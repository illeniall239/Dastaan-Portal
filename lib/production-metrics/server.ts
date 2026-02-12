/**
 * Production Metrics Server Functions
 *
 * Server-side functions for fetching and aggregating production lifecycle metrics
 * across all dashboards (Programmer, Evaluator, Management).
 *
 * @module production-metrics/server
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { STATUS_CATEGORIES, isStatusInCategory } from './status-mappings';

/**
 * Production metrics data structure
 */
export interface ProductionMetrics {
  uniqueWritersCount: number;
  uniqueWriters: Array<{ // Detailed list of writer engagements (last 30 days)
    id: string;           // engagement id
    writer_name: string;
    date_engaged: string;
    time_slot?: string;
    notes?: string;
    created_by_name?: string;
  }>;
  storiesInDiscussion: number;
  storiesInDiscussionDetails?: Array<{ // Detailed list of stories in discussion
    id: string;
    working_title: string;
    writer_name: string;
    target_slot: string;
    created_at: string;
    team_name?: string;
    team?: import('@/types').Team;
  }>;
  scriptsInWriting: {
    total: number;
    bySlot: Record<string, number>; // e.g., {"7 pm": 3, "8 pm": 5, "Unassigned": 2}
    details?: Array<{ // Detailed list of scripts in writing
      id: string;
      working_title: string;
      writer_name: string;
      target_slot: string;
      status: string;
      team_name?: string;
      team?: import('@/types').Team;
    }>;
  };
  scriptsCompleted: {
    total: number;
    bySlot: Record<string, number>;
    details?: Array<{ // Detailed list of completed scripts
      id: string;
      working_title: string;
      writer_name: string;
      target_slot: string;
      status: string;
      team_name?: string;
      team?: import('@/types').Team;
    }>;
  };
  projectsOnShoot: number;
  projectsOnShootDetails?: Array<{ // Detailed list of projects currently on shoot
    id: string;
    working_title: string;
    writer_name: string;
    target_slot: string;
    status: string;
    team_name?: string;
    team?: import('@/types').Team;
  }>;
  projectsOnAir: number;
  projectsOnAirDetails?: Array<{ // Detailed list of projects currently on air
    id: string;
    working_title: string;
    on_air_title: string;
    target_slot: string;
    status: string;
    team_name?: string;
    team?: import('@/types').Team;
  }>;
  projectsAired: {
    total: number;
    projects: Array<{
      working_title: string;
      on_air_title: string;
      aired_date: string;
      slot: string;
      team_name?: string;
      team?: import('@/types').Team;
    }>;
  };
}

/**
 * Fetch and aggregate production lifecycle metrics
 *
 * This function:
 * 1. Fetches all active call reports with a single query (includes writers via join)
 * 2. Aggregates metrics in-memory (efficient for < 1000 projects)
 * 3. Applies team isolation for evaluators (programmers/management see all teams)
 *
 * @param teamId - Optional team ID for team isolation (evaluators only see their team)
 * @param userRole - User role for determining global access (admin, management, programmer)
 * @returns ProductionMetrics object with all 7 metrics
 *
 * @example
 * ```typescript
 * // Evaluator (team-filtered)
 * const metrics = await getProductionMetrics(evaluatorTeamId, 'evaluator');
 *
 * // Management/Programmer (global access)
 * const metrics = await getProductionMetrics();
 * ```
 */
export async function getProductionMetrics(
  teamId?: string | null,
  userRole?: string | null
): Promise<ProductionMetrics> {
  const supabase = createAdminClient();

  try {
    // Determine if user has global access (sees all teams)
    const hasGlobalAccess = userRole && ['admin', 'management', 'programmer'].includes(userRole);

    // Build query with joins to fetch all needed data in one go
    let query = supabase
      .from('call_reports')
      .select(`
        id,
        status,
        target_slot,
        working_title,
        on_air_title,
        aired_date,
        aired_completed,
        team_id,
        team:teams(
          id,
          name,
          team_type
        ),
        call_report_writers:call_report_writers (
          writer_id,
          writer:writers(id, name)
        )
      `)
      .eq('meeting_type', 'call_report')
      .is('archived_at', null); // Only active (non-archived) projects

    // Apply team isolation for evaluators
    if (!hasGlobalAccess && teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: callReports, error } = await query;

    if (error) {
      console.error('Error fetching production metrics:', error);
      return getEmptyMetrics();
    }

    // --- Metric 1: Writers Engaged (from writer_engagements table, last 30 days) ---
    // This is independent of call_reports, so it runs even if there are no call reports.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: engagements } = await supabase
      .from('writer_engagements')
      .select('id, writer_id, date_engaged, time_slot, notes, created_by')
      .gte('date_engaged', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date_engaged', { ascending: false });

    // Batch-fetch writer names for all engagements
    const writerIds = [...new Set((engagements || []).map((e: any) => e.writer_id).filter(Boolean))];
    const creatorIds = [...new Set((engagements || []).map((e: any) => e.created_by).filter(Boolean))];

    let writerNameMap: Record<string, string> = {};
    let creatorNameMap: Record<string, string> = {};

    if (writerIds.length > 0) {
      const { data: writers } = await supabase
        .from('writers')
        .select('id, name')
        .in('id', writerIds);
      if (writers) {
        writerNameMap = Object.fromEntries(writers.map((w: any) => [w.id, w.name]));
      }
    }

    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, name')
        .in('id', creatorIds);
      if (creators) {
        creatorNameMap = Object.fromEntries(creators.map((u: any) => [u.id, u.name || 'Unknown']));
      }
    }

    const uniqueWriterIdsInEngagements = new Set(writerIds);
    const uniqueWritersDetailed: ProductionMetrics['uniqueWriters'] = (engagements || []).map((e: any) => ({
      id: e.id,
      writer_name: writerNameMap[e.writer_id] || 'Unknown',
      date_engaged: e.date_engaged,
      time_slot: e.time_slot || undefined,
      notes: e.notes || undefined,
      created_by_name: e.created_by ? (creatorNameMap[e.created_by] || 'Unknown') : undefined,
    }));

    if (!callReports || callReports.length === 0) {
      return {
        ...getEmptyMetrics(),
        uniqueWritersCount: uniqueWriterIdsInEngagements.size,
        uniqueWriters: uniqueWritersDetailed,
      };
    }

    // Initialize aggregation variables
    let storiesInDiscussion = 0;
    const storiesInDiscussionDetails: ProductionMetrics['storiesInDiscussionDetails'] = [];
    const scriptsInWritingBySlot: Record<string, number> = {};
    const scriptsInWritingDetails: ProductionMetrics['scriptsInWriting']['details'] = [];
    const scriptsCompletedBySlot: Record<string, number> = {};
    const scriptsCompletedDetails: ProductionMetrics['scriptsCompleted']['details'] = [];
    let projectsOnShoot = 0;
    const projectsOnShootDetails: ProductionMetrics['projectsOnShootDetails'] = [];
    let projectsOnAir = 0;
    const projectsOnAirDetails: ProductionMetrics['projectsOnAirDetails'] = [];
    const airedProjects: ProductionMetrics['projectsAired']['projects'] = [];

    // Single pass aggregation
    callReports.forEach((report: any) => {
      const status = report.status || '';
      const slot = report.target_slot || 'Unassigned';
      const writerName = report.writer_name ||
        (report.call_report_writers && Array.isArray(report.call_report_writers) && report.call_report_writers[0]?.writer?.name) ||
        'Unknown';

      // Metric 2: Stories in discussion with details
      if (isStatusInCategory(status, 'STORIES_IN_DISCUSSION')) {
        storiesInDiscussion++;
        storiesInDiscussionDetails.push({
          id: report.id,
          working_title: report.working_title || 'Untitled',
          writer_name: writerName,
          target_slot: slot,
          created_at: report.created_at || report.inserted_at || '',
          team: report.team || undefined,
        });
      }

      // Metric 3: Scripts in writing (with slot breakdown and details)
      if (isStatusInCategory(status, 'SCRIPTS_IN_WRITING')) {
        scriptsInWritingBySlot[slot] = (scriptsInWritingBySlot[slot] || 0) + 1;
        scriptsInWritingDetails.push({
          id: report.id,
          working_title: report.working_title || 'Untitled',
          writer_name: writerName,
          target_slot: slot,
          status: status,
          team: report.team || undefined,
        });
      }

      // Metric 4: Scripts completed (with slot breakdown and details)
      if (isStatusInCategory(status, 'SCRIPTS_COMPLETED')) {
        scriptsCompletedBySlot[slot] = (scriptsCompletedBySlot[slot] || 0) + 1;
        scriptsCompletedDetails.push({
          id: report.id,
          working_title: report.working_title || 'Untitled',
          writer_name: writerName,
          target_slot: slot,
          status: status,
          team: report.team || undefined,
        });
      }

      // Metric 5: Projects on shoot with details
      if (isStatusInCategory(status, 'PROJECTS_ON_SHOOT')) {
        projectsOnShoot++;
        projectsOnShootDetails.push({
          id: report.id,
          working_title: report.working_title || 'Untitled',
          writer_name: writerName,
          target_slot: slot,
          status: status,
          team: report.team || undefined,
        });
      }

      // Metric 6: Projects on air with details
      if (isStatusInCategory(status, 'PROJECTS_ON_AIR')) {
        projectsOnAir++;
        projectsOnAirDetails.push({
          id: report.id,
          working_title: report.working_title || 'Untitled',
          on_air_title: report.on_air_title || report.working_title || 'Untitled',
          target_slot: slot,
          status: status,
          team: report.team || undefined,
        });
      }

      // Metric 7: Projects aired (completed their run)
      if (report.aired_completed === true) {
        airedProjects.push({
          working_title: report.working_title,
          on_air_title: report.on_air_title || report.working_title,
          aired_date: report.aired_date || '',
          slot: slot,
          team: report.team || undefined,
        });
      }
    });

    // Sort aired projects by date (most recent first)
    airedProjects.sort((a, b) => {
      if (!a.aired_date) return 1;
      if (!b.aired_date) return -1;
      return new Date(b.aired_date).getTime() - new Date(a.aired_date).getTime();
    });

    return {
      uniqueWritersCount: uniqueWriterIdsInEngagements.size,
      uniqueWriters: uniqueWritersDetailed,
      storiesInDiscussion,
      storiesInDiscussionDetails,
      scriptsInWriting: {
        total: Object.values(scriptsInWritingBySlot).reduce((sum, count) => sum + count, 0),
        bySlot: scriptsInWritingBySlot,
        details: scriptsInWritingDetails,
      },
      scriptsCompleted: {
        total: Object.values(scriptsCompletedBySlot).reduce((sum, count) => sum + count, 0),
        bySlot: scriptsCompletedBySlot,
        details: scriptsCompletedDetails,
      },
      projectsOnShoot,
      projectsOnShootDetails,
      projectsOnAir,
      projectsOnAirDetails,
      projectsAired: {
        total: airedProjects.length,
        projects: airedProjects,
      },
    };
  } catch (error) {
    console.error('Unexpected error fetching production metrics:', error);
    return getEmptyMetrics();
  }
}

/**
 * Return empty metrics structure
 * Used for error cases or when no data exists
 *
 * @returns ProductionMetrics with all values set to 0 or empty
 */
function getEmptyMetrics(): ProductionMetrics {
  return {
    uniqueWritersCount: 0,
    uniqueWriters: [],
    storiesInDiscussion: 0,
    storiesInDiscussionDetails: [],
    scriptsInWriting: {
      total: 0,
      bySlot: {},
      details: [],
    },
    scriptsCompleted: {
      total: 0,
      bySlot: {},
      details: [],
    },
    projectsOnShoot: 0,
    projectsOnShootDetails: [],
    projectsOnAir: 0,
    projectsOnAirDetails: [],
    projectsAired: {
      total: 0,
      projects: [],
    },
  };
}

/**
 * Get metric summary as string for logging/debugging
 *
 * @param metrics - ProductionMetrics object
 * @returns Human-readable summary string
 */
export function getMetricsSummary(metrics: ProductionMetrics): string {
  return [
    `Writers: ${metrics.uniqueWritersCount}`,
    `In Discussion: ${metrics.storiesInDiscussion}`,
    `In Writing: ${metrics.scriptsInWriting.total}`,
    `Completed: ${metrics.scriptsCompleted.total}`,
    `On Shoot: ${metrics.projectsOnShoot}`,
    `On Air: ${metrics.projectsOnAir}`,
    `Aired: ${metrics.projectsAired.total}`,
  ].join(' | ');
}
