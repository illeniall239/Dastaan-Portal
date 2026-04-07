import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllTeamPerformanceServer } from "@/lib/management/team-performance";
import { TeamStatsCards } from "@/components/management/team-performance/team-stats-cards";
import { TeamComparisonBarChart } from "@/components/management/charts/team-comparison-bar-chart";
import { ExportButton } from "@/components/management/export-button";
import { TeamTypeFilterClient } from "./team-type-filter-client";
import { BackButton } from "@/components/ui/back-button";
import { TeamActivitySection } from "@/components/management/team-activity/team-activity-section";

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
  let teams: any[] = [], summary: any, comparison: any[] = [];

  try {
    teams = await getAllTeamPerformanceServer();

    // Compute summary from the teams data (avoids using the browser/anon client)
    summary = {
      total_teams: teams.length,
      total_call_reports: teams.reduce((s: number, t: any) => s + (t.call_reports_created || 0), 0),
      total_evaluations: teams.reduce((s: number, t: any) => s + (t.evaluations_completed || 0), 0),
      total_one_liners: teams.reduce((s: number, t: any) => s + (t.one_liners_logged || 0), 0),
      total_stories_approved: teams.reduce((s: number, t: any) => s + (t.stories_approved || 0), 0),
      total_stories_rejected: teams.reduce((s: number, t: any) => s + (t.stories_rejected || 0), 0),
      avg_evaluation_score: teams.length > 0
        ? teams.reduce((s: number, t: any) => s + (t.avg_evaluation_score || 0), 0) / teams.length
        : 0,
      avg_call_reports_per_team: teams.length > 0
        ? teams.reduce((s: number, t: any) => s + (t.call_reports_created || 0), 0) / teams.length
        : 0,
      avg_evaluations_per_team: teams.length > 0
        ? teams.reduce((s: number, t: any) => s + (t.evaluations_completed || 0), 0) / teams.length
        : 0,
      teams_by_type: teams.reduce((acc: Record<string, number>, t: any) => {
        acc[t.team_type] = (acc[t.team_type] || 0) + 1;
        return acc;
      }, {}),
    };

    // Prepare comparison data
    comparison = teams.map((team: any, index: number) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      team_type: team.team_type,
      call_reports: team.call_reports_created || 0,
      evaluations: team.evaluations_completed || 0,
      one_liners: team.one_liners_logged || 0,
      stories_approved: team.stories_approved || 0,
      rank: index + 1,
    })).sort((a: any, b: any) => b.call_reports - a.call_reports);

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
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <BackButton fallbackHref="/management" variant="outline" size="sm" />
        <div>
          <h1 className="text-base font-bold text-gray-900">Team Performance Analytics</h1>
          <p className="text-xs text-muted-foreground">Overview of all team metrics</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div id="team-stats-overview">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Overview</h2>
          <div className="no-print">
            <ExportButton elementId="team-stats-overview" filename="team-stats-overview" formats={["png", "pdf"]} compact />
          </div>
        </div>
        <div className="w-full min-w-0">
          <TeamStatsCards stats={summary} />
        </div>
      </div>

      {/* Charts */}
      <div id="team-charts">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Visual Analytics</h2>
          <div className="no-print">
            <ExportButton elementId="team-charts" filename="team-charts" formats={["png", "pdf"]} compact />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0 w-full">
          <TeamComparisonBarChart
            data={comparison}
            metric="call_reports"
            title="Teams by Writer Engagement Reports"
            description="Sorted by total writer engagement reports"
          />
          <TeamComparisonBarChart
            data={comparison}
            metric="evaluations"
            title="Teams by Evaluations"
            description="Sorted by evaluations completed"
          />
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div id="team-comparison">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Detailed Comparison</h2>
          <div className="no-print">
            <ExportButton elementId="team-comparison" filename="team-comparison" formats={["png", "pdf"]} compact />
          </div>
        </div>
        <div className="w-full min-w-0 overflow-x-auto">
          <TeamTypeFilterClient teams={teams} />
        </div>
      </div>

      {/* Team Accountability Dashboard */}
      <div id="team-accountability" className="pt-2">
        <TeamActivitySection />
      </div>
    </div>
  );
}
