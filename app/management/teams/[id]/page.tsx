import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTeamPerformance,
  getTeamPerformanceTrends,
  compareTeamToTypeAverage,
} from "@/lib/management/team-performance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamTrendLineChart } from "@/components/management/charts/team-trend-line-chart";
import { TeamVsAverageRadar } from "@/components/management/charts/team-vs-average-radar";
import { TeamMemberList } from "@/components/management/team-performance/team-member-list";
import { ExportButton } from "@/components/management/export-button";
import { ArrowLeft, Users, FileText, CheckCircle, MessageSquare, Award, TrendingUp } from "lucide-react";

// Revalidate every 5 minutes
export const revalidate = 300;

const TEAM_TYPE_LABELS: Record<string, string> = {
  production: "Production Team",
  channel: "Channel Team",
  adaptation: "Adaptation Team",
  evaluator: "Evaluator Team",
  other: "Other Team",
};

const TEAM_TYPE_COLORS: Record<string, string> = {
  production: "bg-blue-100 text-blue-800 border-blue-300",
  channel: "bg-purple-100 text-purple-800 border-purple-300",
  adaptation: "bg-green-100 text-green-800 border-green-300",
  evaluator: "bg-yellow-100 text-yellow-800 border-yellow-300",
  other: "bg-gray-100 text-gray-800 border-gray-300",
};

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
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

  const teamId = params.id;

  // Fetch team data
  let teamPerformance, trends, comparison, members, teamHead;

  try {
    // Fetch performance data
    teamPerformance = await getTeamPerformance(teamId);

    if (!teamPerformance) {
      notFound();
    }

    // Fetch trends and comparison in parallel
    [trends, comparison] = await Promise.all([
      getTeamPerformanceTrends(teamId, 6),
      compareTeamToTypeAverage(teamId),
    ]);

    // Fetch team members
    const adminClient = createAdminClient();
    const { data: membersData } = await adminClient
      .from("users")
      .select("id, name, email, role, department, position, status")
      .eq("team_id", teamId)
      .eq("status", "active")
      .order("name");

    members = membersData || [];

    // Fetch team head info if exists
    if (teamPerformance.team_head_id) {
      const { data: headData } = await adminClient
        .from("users")
        .select("id, name, email, position")
        .eq("id", teamPerformance.team_head_id)
        .single();

      teamHead = headData;
    }
  } catch (error) {
    console.error("Error fetching team detail:", error);
    notFound();
  }

  // Prepare radar chart data
  const radarData = [
    {
      metric: "Reports",
      team: comparison.team.call_reports_created || 0,
      average: comparison.type_average.call_reports,
      fullLabel: "Call Reports",
    },
    {
      metric: "Evals",
      team: comparison.team.evaluations_completed || 0,
      average: comparison.type_average.evaluations,
      fullLabel: "Evaluations",
    },
    {
      metric: "One-Liners",
      team: comparison.team.one_liners_logged || 0,
      average: comparison.type_average.one_liners,
      fullLabel: "One-Liners",
    },
    {
      metric: "Approved",
      team: comparison.team.stories_approved || 0,
      average: comparison.type_average.stories_approved,
      fullLabel: "Stories Approved",
    },
    {
      metric: "Avg Score",
      team: comparison.team.avg_evaluation_score || 0,
      average: comparison.type_average.avg_score,
      fullLabel: "Average Score",
    },
  ];

  return (
    <div className="mobile-container mobile-section">
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/management/teams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Link>
        </Button>
      </div>

      {/* Team Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{teamPerformance.team_name}</h1>
              <Badge
                variant="outline"
                className={TEAM_TYPE_COLORS[teamPerformance.team_type]}
              >
                {TEAM_TYPE_LABELS[teamPerformance.team_type]}
              </Badge>
            </div>
            {teamHead && (
              <p className="text-muted-foreground">
                Team Head: {teamHead.name} {teamHead.position ? `(${teamHead.position})` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Call Reports</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {teamPerformance.call_reports_created || 0}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {teamPerformance.call_reports_last_30_days || 0} last 30 days
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Evaluations</p>
                  <p className="text-2xl font-bold text-green-900">
                    {teamPerformance.evaluations_completed || 0}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {teamPerformance.evaluations_last_30_days || 0} last 30 days
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900">One-Liners</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {teamPerformance.one_liners_logged || 0}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    {teamPerformance.one_liners_last_30_days || 0} last 30 days
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">Team Members</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {teamPerformance.team_member_count || 0}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    {teamPerformance.stories_approved || 0} stories approved
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Trends */}
      <div id="team-trends" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Performance Trends</h2>
          <div className="no-print">
            <ExportButton
              elementId="team-trends"
              filename={`${teamPerformance.team_name}-trends`}
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <TeamTrendLineChart
          data={trends}
          teamName={teamPerformance.team_name}
        />
      </div>

      {/* Team vs Average */}
      <div id="team-comparison" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Performance Comparison</h2>
          <div className="no-print">
            <ExportButton
              elementId="team-comparison"
              filename={`${teamPerformance.team_name}-comparison`}
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <TeamVsAverageRadar
          teamName={teamPerformance.team_name}
          teamType={teamPerformance.team_type}
          data={radarData}
        />
      </div>

      {/* Team Members */}
      <div id="team-members" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Team Members</h2>
          <div className="no-print">
            <ExportButton
              elementId="team-members"
              filename={`${teamPerformance.team_name}-members`}
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <TeamMemberList members={members} teamName={teamPerformance.team_name} />
      </div>

      {/* Data Source Note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Data refreshes every 5 minutes. Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
