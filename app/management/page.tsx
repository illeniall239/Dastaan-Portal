import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Activity,
  Briefcase
} from "lucide-react";
import { ArchiveGenreChart } from "@/components/management/charts/archive-genre-chart";
import { IdeasByGenreChart } from "@/components/management/charts/ideas-by-genre-chart";
import { EvaluatorLeaderboard } from "@/components/management/evaluator-leaderboard";
import { PipelineOverviewCards } from "@/components/management/cards/pipeline-overview-cards";
import { CriticalAlertsCard } from "@/components/management/cards/critical-alerts-card";
import { RecentActivityCard } from "@/components/management/cards/recent-activity-card";
import { ManagementHeader } from "@/components/management/management-header";
import { ScriptingPhase } from "@/components/management/scripting-phase";
import { EvaluatorPipelineEpisodes } from "@/components/management/evaluator-pipeline-episodes";
import { ContractTermsOverview } from "@/components/management/contract-terms-overview";
import { StageWisePipeline } from "@/components/management/stage-wise-pipeline";
import { WriterFinancialSummaryWidget } from "@/components/management/writer-financial-summary-widget";
import { ExportButton } from "@/components/management/export-button";
import { getExecutiveSummary, getDepartmentWorkload } from "@/lib/management/server";
import { getCriticalAlerts } from "@/lib/management/critical-alerts";
import { getPipelineOverview } from "@/lib/management/pipeline-analytics";
import { getAllEvaluatorStats } from "@/lib/management/evaluator-performance";
import { getScriptingPhaseData } from "@/lib/management/scripting-analytics";
import { getDramasWithEpisodes, getAllEpisodesAndEvaluatorsBatch } from "@/lib/management/episode-pipeline";
import { getArchiveByGenre } from "@/lib/management/archive-analytics";
import { createClient } from "@/lib/supabase/server";
import { getTopPerformingTeams } from "@/lib/management/team-performance";
import { TopTeamsWidget } from "@/components/management/team-performance/top-teams-widget";

// Add Next.js caching
export const revalidate = 300; // 5 minutes for better performance

export default async function ManagementDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Redirect if not management, executive, or admin
  if (!["admin", "management", "executive"].includes(user.role)) {
    redirect("/dashboard");
  }

  // Fetch ALL data in parallel for instant loading
  const supabase = await createClient();

  // Fetch negotiations
  const { data: contractTerms } = await supabase
    .from("negotiations")
    .select(`
      *,
      stories!inner(
        story_id,
        title,
        writer_originator_name,
        genre
      )
    `)
    .order("created_at", { ascending: false });

  const [
    summary,
    workload,
    alerts,
    scriptingPhaseData,
    dramasWithEpisodes,
    archiveByGenre,
    pipelineData,
    evaluatorStats,
    topTeams
  ] = await Promise.all([
    getExecutiveSummary(),
    getDepartmentWorkload(),
    getCriticalAlerts(),
    getScriptingPhaseData(),
    getDramasWithEpisodes(),
    getArchiveByGenre(),
    getPipelineOverview(),
    getAllEvaluatorStats(),
    getTopPerformingTeams(5)
  ]);

  // Fetch episode details for dramas (depends on dramasWithEpisodes)
  const dramaIds = dramasWithEpisodes.map(d => d.callReportId);
  const { episodesByDrama, evaluatorsByEpisode } = dramaIds.length > 0
    ? await getAllEpisodesAndEvaluatorsBatch(dramaIds)
    : { episodesByDrama: {}, evaluatorsByEpisode: {} };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <ManagementHeader userName={user.name} />

      {/* Executive Summary Stats */}
      <div id="executive-summary" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
          <div className="no-print">
            <ExportButton
              elementId="executive-summary"
              filename="executive-summary"
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/management/active-projects" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">
                  Active Projects
                </CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{summary.totalActiveProjects}</div>
                <p className="text-xs text-blue-700 mt-1">
                  Stories in development pipeline
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/management/pipeline-value" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-900">
                  Pipeline Value
                </CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">
                  {formatCurrency(summary.pipelineValue)}
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Total contracts + negotiations
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/management/contracts" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-orange-900">
                  Active Contracts
                </CardTitle>
                <Briefcase className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-900">{summary.activeContracts}</div>
                <p className="text-xs text-orange-700 mt-1">
                  Contracts currently in effect
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/management/payments/overdue" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-red-900">
                  Overdue Payments
                </CardTitle>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900">{summary.overduePayments}</div>
                <p className="text-xs text-red-700 mt-1">
                  Payments requiring attention
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/management/weekly-activities" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">
                  Weekly Activities
                </CardTitle>
                <Activity className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">{summary.weeklyActivities}</div>
                <p className="text-xs text-purple-700 mt-1">
                  Actions taken this week
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/management/approvals" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-900">
                  Pending Approvals
                </CardTitle>
                <Clock className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-900">{workload.executives.pendingApprovals}</div>
                <p className="text-xs text-indigo-700 mt-1">
                  Awaiting committee decision
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Critical Alerts */}
      <div id="critical-alerts-section" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Critical Alerts</h2>
            <div className="no-print">
              <ExportButton
                elementId="critical-alerts-section"
                filename="critical-alerts"
                formats={["png", "pdf"]}
                compact
              />
            </div>
          </div>
          <CriticalAlertsCard alerts={alerts} />
        </div>

      {/* Top Performing Teams */}
      <div id="top-teams-section" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Top Performing Teams</h2>
          <div className="no-print">
            <ExportButton
              elementId="top-teams-section"
              filename="top-teams"
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <TopTeamsWidget teams={topTeams} />
      </div>

      {/* Scripting Phase & Episode Evaluation Pipeline */}
      <div id="scripting-episode-section" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Scripting Phase & Episode Evaluation Pipeline</h2>
            <p className="text-muted-foreground mt-1">
              Track episodic evaluation progress by drama
            </p>
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
          <ScriptingPhase data={scriptingPhaseData} />
          <EvaluatorPipelineEpisodes
            dramas={dramasWithEpisodes}
            episodesByDrama={episodesByDrama}
            evaluatorsByEpisode={evaluatorsByEpisode}
          />
          <ArchiveGenreChart data={archiveByGenre} />
        </div>
      </div>

      {/* Content Pipeline Flow */}
      <div id="pipeline-section" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Content Pipeline Flow</h2>
            <p className="text-muted-foreground mt-1">
              Story workflow from submission to completion
            </p>
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

        {/* Overview Cards Row */}
        <div className="mb-6">
          <PipelineOverviewCards
            totalStories={pipelineData.totalStories}
            activePipeline={pipelineData.activePipeline}
            avgTimeToCompletion={pipelineData.avgTimeToCompletion}
          />
        </div>

        {/* Recent Activity */}
        <RecentActivityCard activities={[]} />
      </div>

      {/* Evaluator Activity Section */}
      <div id="evaluator-performance" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Evaluator Activity Tracking</h2>
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
          <EvaluatorLeaderboard
            key="evaluator-real-mode"
            evaluators={evaluatorStats}
          />
        </div>
      </div>

      {/* Contract Terms Overview Section */}
      <div id="contract-terms-section" className="mb-8">
        <ContractTermsOverview contractTerms={contractTerms || []} />
      </div>

      {/* Writer Financial Summary Section */}
      <div id="writer-financial-section" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Writer Payments & Financial Overview</h2>
            <p className="text-muted-foreground mt-1">
              Track negotiated amounts, contracts, and payments to writers and producers
            </p>
          </div>
        </div>
        <WriterFinancialSummaryWidget />
      </div>
    </div>
  );
}
