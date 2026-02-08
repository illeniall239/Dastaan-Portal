import { createAdminClient } from '@/lib/supabase/admin';
import { cachedQuery, CacheTags } from '@/lib/cache/request-cache';
import { handleError } from '@/lib/errors';

export interface ScriptingPhaseData {
  id: string;
  workingTitle: string;
  callReportId: string;
  scriptProgress: number;
  status: 'on_schedule' | 'on_hold' | 'behind_schedule';
  currentPhase: string;
  lastUpdated: string;
  totalEpisodes?: number;
  evaluatedEpisodes?: number;
}

/**
 * Get all dramas currently in scripting phase with their progress
 * CACHED: Uses Next.js request memoization with 5-minute revalidation
 */
export async function getScriptingPhaseData(): Promise<ScriptingPhaseData[]> {
  return cachedQuery(
    async () => {
      const supabase = createAdminClient();

      // Get call reports with their related contracts and script phases
      // Relationship: stories -> call_reports (via call_reports.story_id)
      //              stories -> contracts (via contracts.story_id)
      //              contracts -> script_phases (via script_phases.contract_id)
      const { data: callReports, error } = await supabase
        .from('call_reports')
        .select(`
          id,
          working_title,
          created_at,
          story_id,
          story:stories (
            id,
            title,
            contracts (
              id,
              created_at,
              script_phases (
                id,
                step_number,
                status,
                submitted_at,
                deadline,
                is_late
              )
            )
          )
        `)
        .eq('meeting_type', 'call_report')
        .not('working_title', 'is', null)
        .not('story_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        return handleError(error, {
          context: 'getScriptingPhaseData:fetch',
          fallbackValue: [],
          userMessage: 'Failed to fetch scripting phase data',
        });
      }

      // Calculate progress for each call report that has contracts
      const scriptingData: ScriptingPhaseData[] = (callReports || [])
        .filter((report: any) => report.story?.contracts && report.story.contracts.length > 0)
        .map((report: any) => {
          const contracts = report.story.contracts || [];
          const allScriptPhases = contracts.flatMap((c: any) => c.script_phases || []);

          const workingTitle = report.working_title;
          const callReportId = report.id;

          // Calculate progress based on completed script phases
          // Assuming 6 steps total (as per step_number CHECK constraint)
          const totalSteps = 6;
          const completedSteps = allScriptPhases.filter((p: any) => p.status === 'completed' || p.status === 'approved').length;
          const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

          // Check for delays
          const hasDelays = allScriptPhases.some((p: any) => p.is_late === true);

          // Determine status
          let status: 'on_schedule' | 'on_hold' | 'behind_schedule';
          if (hasDelays || progress < 40) {
            status = 'behind_schedule';
          } else if (progress >= 70) {
            status = 'on_schedule';
          } else {
            status = 'on_hold';
          }

          // Get current phase
          const currentStep = allScriptPhases.find((p: any) => p.status === 'in_progress' || p.status === 'submitted');
          const currentPhase = currentStep ? `Step ${currentStep.step_number}` : 'Not Started';

          // Get last updated time
          const lastUpdated = allScriptPhases.length > 0 && allScriptPhases.some((p: any) => p.submitted_at)
            ? new Date(Math.max(...allScriptPhases.filter((p: any) => p.submitted_at).map((p: any) => new Date(p.submitted_at).getTime()))).toISOString()
            : report.created_at;

          return {
            id: callReportId,
            workingTitle,
            callReportId,
            scriptProgress: Math.round(progress),
            status,
            currentPhase,
            lastUpdated,
          };
        });

      // Filter to only show dramas actively in scripting (not completed)
      return scriptingData.filter(d => d.scriptProgress < 100);
    },
    ['scripting-phase-data'],
    {
      revalidate: 300,
      tags: [CacheTags.SCRIPTING_PHASE]
    }
  )();
}

/**
 * Get scripting overview stats
 */
export async function getScriptingOverview() {
  const scriptingData = await getScriptingPhaseData();

  return {
    total: scriptingData.length,
    onSchedule: scriptingData.filter(d => d.status === 'on_schedule').length,
    onHold: scriptingData.filter(d => d.status === 'on_hold').length,
    behindSchedule: scriptingData.filter(d => d.status === 'behind_schedule').length,
    averageProgress: scriptingData.length > 0
      ? Math.round(scriptingData.reduce((sum, d) => sum + d.scriptProgress, 0) / scriptingData.length)
      : 0,
  };
}
