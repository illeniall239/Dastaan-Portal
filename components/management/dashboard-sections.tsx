/**
 * Async Dashboard Sections for Streaming SSR
 * Each section fetches its own data and can be rendered independently
 * Wrapped in Suspense boundaries for progressive loading
 */

import { getCriticalAlerts } from "@/lib/management/server";
import { getTopPerformingTeams } from "@/lib/management/team-performance";
import { getTeamProjects } from "@/lib/management/team-projects";
import { getScriptingPhaseData, ScriptingPhaseData } from "@/lib/management/scripting-analytics";
import { getDramasWithEpisodesAndDetails } from "@/lib/management/episode-pipeline";
import { getArchiveByGenre } from "@/lib/management/archive-analytics";
import { getPipelineOverview } from "@/lib/management/pipeline-analytics";
import { getAllEvaluatorStats } from "@/lib/management/evaluator-performance";
import { getRecentActivity } from "@/lib/management/activity-analytics";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExportButton } from "@/components/management/export-button";

// Dynamic imports for heavy client components (reduces initial bundle size)
import {
  DynamicCriticalAlertsCard,
  DynamicTopTeamsWidget,
  DynamicScriptingPhase,
  DynamicEvaluatorPipelineEpisodes,
  DynamicArchiveGenreChart,
  DynamicPipelineOverviewCards,
  DynamicRecentActivityCard,
  DynamicEvaluatorLeaderboard,
  DynamicContractTermsOverview,
  DynamicWriterFinancialSummaryWidget,
  DynamicTeamWiseProjects,
} from "@/components/management/dynamic-components";

/**
 * Critical Alerts Section - Async Component
 */
export async function CriticalAlertsSection() {
  const alerts = await getCriticalAlerts();

  return (
    <div id="critical-alerts-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Critical Alerts</h2>
        <div className="no-print">
          <ExportButton
            elementId="critical-alerts-section"
            filename="critical-alerts"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>
      <DynamicCriticalAlertsCard alerts={alerts} />
    </div>
  );
}

/**
 * Team Performance Section - Async Component
 */
export async function TeamPerformanceSection() {
  const allTopTeams = await getTopPerformingTeams(5);
  const topTeams = allTopTeams.filter((t: any) =>
    t.team_type !== "management" || t.team_head_email === "humera.safder@geo.tv"
  );

  return (
    <div id="teams-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Team Performance</h2>
        <div className="no-print">
          <ExportButton
            elementId="teams-section"
            filename="teams"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>
      <DynamicTopTeamsWidget teams={topTeams} />
    </div>
  );
}

/**
 * Scripting Phase & Episode Evaluation Section - Async Component
 */
export async function ScriptingEpisodeSection() {
  const { dramas: dramasWithEpisodes, episodesByDrama, evaluatorsByEpisode } =
    await getDramasWithEpisodesAndDetails();
  const archiveByGenre = await getArchiveByGenre();

  // Transform episode data into ScriptingPhaseData format
  const episodeBasedScriptingData: ScriptingPhaseData[] = dramasWithEpisodes.map((drama) => {
    const progressPercentage =
      drama.totalEpisodes > 0
        ? Math.round((drama.receivedEpisodes / drama.totalEpisodes) * 100)
        : 0;

    let status: "on_schedule" | "on_hold" | "behind_schedule";
    if (progressPercentage >= 70) {
      status = "on_schedule";
    } else if (progressPercentage >= 40) {
      status = "on_hold";
    } else {
      status = "behind_schedule";
    }

    const nextEpisode = drama.receivedEpisodes + 1;
    const currentPhase =
      nextEpisode <= drama.totalEpisodes
        ? `Episode ${nextEpisode} of ${drama.totalEpisodes}`
        : "All Episodes Received";

    return {
      id: drama.callReportId,
      workingTitle: drama.workingTitle,
      callReportId: drama.callReportId,
      scriptProgress: progressPercentage,
      status,
      currentPhase,
      lastUpdated: new Date().toISOString(),
      totalEpisodes: drama.totalEpisodes,
      evaluatedEpisodes: drama.receivedEpisodes,
    };
  });

  return (
    <div id="scripting-episode-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Scripting Phase & Episode Evaluation Pipeline
          </h2>
          <p className="text-muted-foreground mt-1">Track episodic evaluation progress by drama</p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="scripting-episode-section"
            filename="scripting-episode-pipeline"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>

      <div className="space-y-6">
        <DynamicScriptingPhase data={episodeBasedScriptingData} />
        <DynamicEvaluatorPipelineEpisodes
          dramas={dramasWithEpisodes}
          episodesByDrama={episodesByDrama}
          evaluatorsByEpisode={evaluatorsByEpisode}
        />
        <DynamicArchiveGenreChart data={archiveByGenre} />
      </div>
    </div>
  );
}

/**
 * Pipeline Overview Section - Async Component
 */
export async function PipelineOverviewSection() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const { data: profile } = authUser ? await supabase.from("users").select("role").eq("id", authUser.id).single() : { data: null };
  const isViewer = profile?.role === "management_viewer";

  const [pipelineData, recentActivities] = await Promise.all([
    getPipelineOverview(),
    isViewer ? Promise.resolve([]) : getRecentActivity(10),
  ]);

  return (
    <div id="pipeline-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Content Pipeline Flow
          </h2>
          <p className="text-muted-foreground mt-1">Story workflow from submission to completion</p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="pipeline-section"
            filename="content-pipeline-flow"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>

      <div className="mb-6">
        <DynamicPipelineOverviewCards
          totalStories={pipelineData.totalStories}
          activePipeline={pipelineData.activePipeline}
          avgTimeToCompletion={pipelineData.avgTimeToCompletion}
        />
      </div>

      {!isViewer && <DynamicRecentActivityCard activities={recentActivities} />}
    </div>
  );
}

/**
 * Evaluator Performance Section - Async Component
 */
export async function EvaluatorPerformanceSection() {
  const evaluatorStats = await getAllEvaluatorStats();

  return (
    <div id="evaluator-performance" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Evaluator Activity Tracking
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitor evaluator workload and activity across all evaluation tasks
          </p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="evaluator-performance"
            filename="evaluator-performance"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>

      <div className="grid gap-6">
        <DynamicEvaluatorLeaderboard key="evaluator-real-mode" evaluators={evaluatorStats} />
      </div>
    </div>
  );
}

/**
 * Contract Terms Section - Async Component
 */
export async function ContractTermsSection() {
  const adminClient = createAdminClient();

  const { data: contractTerms } = await adminClient
    .from("negotiations")
    .select(
      `
      *,
      stories!left(
        story_id,
        title,
        writer_originator_name,
        genre
      ),
      call_reports!left(
        call_report_id,
        working_title
      )
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div id="contract-terms-section" className="mb-6 sm:mb-8">
      <DynamicContractTermsOverview contractTerms={contractTerms || []} />
    </div>
  );
}

/**
 * Writer Financial Section - Async Component
 */
export async function WriterFinancialSection() {
  return (
    <div id="writer-financial-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Writer Payments & Financial Overview
          </h2>
          <p className="text-muted-foreground mt-1">
            Track negotiated amounts, contracts, and payments to writers and producers
          </p>
        </div>
      </div>
      <DynamicWriterFinancialSummaryWidget />
    </div>
  );
}

/**
 * Team-wise Projects Section - Async Component
 */
export async function TeamProjectsSection() {
  const teams = await getTeamProjects();

  return (
    <div id="team-projects-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Team-wise Projects
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Browse all one-liners and episodes grouped by team
          </p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="team-projects-section"
            filename="team-projects"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>
      <DynamicTeamWiseProjects teams={teams} />
    </div>
  );
}
