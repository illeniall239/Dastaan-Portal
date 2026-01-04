import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllTeamPerformanceServer, getTeamPerformanceSummary, getTeamComparison } from "@/lib/management/team-performance";
import { TeamStatsCards } from "@/components/management/team-performance/team-stats-cards";
import { TeamComparisonTable } from "@/components/management/team-performance/team-comparison-table";
import { TeamComparisonBarChart } from "@/components/management/charts/team-comparison-bar-chart";
import { TeamTypePieChart } from "@/components/management/charts/team-type-pie-chart";
import { ExportButton } from "@/components/management/export-button";
import { TeamTypeFilterClient } from "./team-type-filter-client";
import { BackButton } from "@/components/ui/back-button";

// Revalidate every 5 minutes
export const revalidate = 300;

export default async function TeamAnalyticsPage() {
  // Authentication check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has management role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "management"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch team performance data
  let teams: any[] = [], summary: any, comparison: any[] = [], typeDistribution: any[] = [];

  try {
    [teams, summary] = await Promise.all([
      getAllTeamPerformanceServer(),
      getTeamPerformanceSummary(),
    ]);

    // Prepare comparison data
    comparison = teams.map((team, index) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      team_type: team.team_type,
      call_reports: team.call_reports_created || 0,
      evaluations: team.evaluations_completed || 0,
      one_liners: team.one_liners_logged || 0,
      stories_approved: team.stories_approved || 0,
      rank: index + 1,
    })).sort((a, b) => b.call_reports - a.call_reports);

    // Prepare team type distribution data
    const totalTeams = summary.total_teams;
    typeDistribution = Object.entries(summary.teams_by_type).map(([type, count]) => ({
      type,
      count: count as number,
      percentage: totalTeams > 0 ? ((count as number) / totalTeams) * 100 : 0,
    }));
  } catch (error) {
    console.error("Error fetching team data:", error);
    teams = [];
    summary = {
      total_teams: 0,
      total_call_reports: 0,
      total_evaluations: 0,
      total_one_liners: 0,
      total_stories_approved: 0,
      total_stories_rejected: 0,
      avg_evaluation_score: 0,
      avg_call_reports_per_team: 0,
      avg_evaluations_per_team: 0,
      teams_by_type: {},
    };
    comparison = [];
    typeDistribution = [];
  }

  return (
    <div className="mobile-container mobile-section">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/management" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Team Performance Analytics</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Comprehensive overview of all team metrics and performance indicators
          </p>
        </div>
      </div>

      {/* Overall Statistics Section */}
      <div id="team-stats-overview" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Overview</h2>
          <div className="no-print">
            <ExportButton
              elementId="team-stats-overview"
              filename="team-stats-overview"
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <TeamStatsCards stats={summary} />
      </div>

      {/* Charts Section */}
      <div id="team-charts" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Visual Analytics</h2>
          <div className="no-print">
            <ExportButton
              elementId="team-charts"
              filename="team-charts"
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TeamComparisonBarChart
            data={comparison}
            metric="call_reports"
            title="Teams by Writer Engagement Reports"
            description="Teams sorted by total writer engagement reports created"
          />
          <TeamTypePieChart
            data={typeDistribution}
            title="Team Distribution"
            description="Teams by type category"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TeamComparisonBarChart
            data={comparison}
            metric="evaluations"
            title="Teams by Evaluations"
            description="Teams sorted by evaluations completed"
          />
          <TeamComparisonBarChart
            data={comparison}
            metric="one_liners"
            title="Teams by One-Liners"
            description="Teams sorted by one-liners logged"
          />
        </div>
      </div>

      {/* Team Comparison Table Section */}
      <div id="team-comparison" className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Detailed Comparison</h2>
          <div className="flex items-center gap-4">
            <div className="no-print">
              <ExportButton
                elementId="team-comparison"
                filename="team-comparison"
                formats={["png", "pdf"]}
                compact
              />
            </div>
          </div>
        </div>
        <TeamTypeFilterClient teams={teams} />
      </div>

      {/* Data Source Note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Data refreshes every 5 minutes. Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
