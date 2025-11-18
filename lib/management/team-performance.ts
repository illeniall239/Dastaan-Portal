import { createClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TeamPerformance, TeamType } from "@/types";

/**
 * Team Performance Analytics Library
 * Provides functions to fetch and analyze team performance metrics
 */

export interface TeamPerformanceFilters {
  team_id?: string;
  team_type?: TeamType;
  from_date?: string;
  to_date?: string;
  include_sub_teams?: boolean;
}

export interface TeamComparison {
  team_id: string;
  team_name: string;
  team_type: TeamType;
  metrics: {
    call_reports: number;
    evaluations: number;
    one_liners: number;
    stories_approved: number;
    stories_rejected: number;
    avg_score: number | null;
  };
  rank: number;
  percentile: number;
}

export interface TeamTrend {
  period: string;
  call_reports: number;
  evaluations: number;
  one_liners: number;
  stories_approved: number;
  stories_rejected: number;
}

/**
 * Client-side function to fetch all team performance data
 */
export async function getAllTeamPerformance(): Promise<TeamPerformance[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_performance")
    .select("*")
    .order("team_name");

  if (error) {
    console.error("Error fetching team performance:", error);
    throw new Error("Failed to fetch team performance data");
  }

  return data || [];
}

/**
 * Server-side function to fetch all team performance data
 */
export async function getAllTeamPerformanceServer(): Promise<TeamPerformance[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("team_performance")
    .select("*")
    .order("team_name");

  if (error) {
    console.error("Error fetching team performance:", error);
    throw new Error("Failed to fetch team performance data");
  }

  return data || [];
}

/**
 * Fetch performance data for a specific team
 */
export async function getTeamPerformance(teamId: string): Promise<TeamPerformance | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_performance")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Team not found
    }
    console.error("Error fetching team performance:", error);
    throw new Error("Failed to fetch team performance data");
  }

  return data;
}

/**
 * Fetch performance data for teams by type
 */
export async function getTeamPerformanceByType(teamType: TeamType): Promise<TeamPerformance[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_performance")
    .select("*")
    .eq("team_type", teamType)
    .order("team_name");

  if (error) {
    console.error("Error fetching team performance by type:", error);
    throw new Error("Failed to fetch team performance data");
  }

  return data || [];
}

/**
 * Get team performance comparison (ranked by total output)
 */
export async function getTeamComparison(teamType?: TeamType): Promise<TeamComparison[]> {
  const supabase = createClient();

  let query = supabase
    .from("team_performance")
    .select("*");

  if (teamType) {
    query = query.eq("team_type", teamType);
  }

  const { data, error } = await query.order("call_reports_created", { ascending: false });

  if (error) {
    console.error("Error fetching team comparison:", error);
    throw new Error("Failed to fetch team comparison data");
  }

  // Calculate rankings and percentiles
  const totalTeams = data?.length || 0;
  const comparisons: TeamComparison[] = (data || []).map((team, index) => ({
    team_id: team.team_id,
    team_name: team.team_name,
    team_type: team.team_type,
    metrics: {
      call_reports: team.call_reports_created || 0,
      evaluations: team.evaluations_completed || 0,
      one_liners: team.one_liners_logged || 0,
      stories_approved: team.stories_approved || 0,
      stories_rejected: team.stories_rejected || 0,
      avg_score: team.avg_evaluation_score,
    },
    rank: index + 1,
    percentile: totalTeams > 0 ? Math.round(((totalTeams - index) / totalTeams) * 100) : 0,
  }));

  return comparisons;
}

/**
 * Get top performing teams across all metrics
 */
export async function getTopPerformingTeams(limit: number = 5): Promise<TeamPerformance[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_performance")
    .select("*")
    .order("call_reports_created", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching top performing teams:", error);
    throw new Error("Failed to fetch top performing teams");
  }

  return data || [];
}

/**
 * Get team performance summary statistics
 */
export async function getTeamPerformanceSummary() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_performance")
    .select("*");

  if (error) {
    console.error("Error fetching team performance summary:", error);
    throw new Error("Failed to fetch team performance summary");
  }

  const teams = data || [];

  // Calculate aggregated statistics
  const summary = {
    total_teams: teams.length,
    total_call_reports: teams.reduce((sum, t) => sum + (t.call_reports_created || 0), 0),
    total_evaluations: teams.reduce((sum, t) => sum + (t.evaluations_completed || 0), 0),
    total_one_liners: teams.reduce((sum, t) => sum + (t.one_liners_logged || 0), 0),
    total_stories_approved: teams.reduce((sum, t) => sum + (t.stories_approved || 0), 0),
    total_stories_rejected: teams.reduce((sum, t) => sum + (t.stories_rejected || 0), 0),
    avg_evaluation_score: teams.length > 0
      ? teams.reduce((sum, t) => sum + (t.avg_evaluation_score || 0), 0) / teams.length
      : 0,
    avg_call_reports_per_team: teams.length > 0
      ? teams.reduce((sum, t) => sum + (t.call_reports_created || 0), 0) / teams.length
      : 0,
    avg_evaluations_per_team: teams.length > 0
      ? teams.reduce((sum, t) => sum + (t.evaluations_completed || 0), 0) / teams.length
      : 0,
    teams_by_type: teams.reduce((acc, t) => {
      acc[t.team_type] = (acc[t.team_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return summary;
}

/**
 * Get team performance trends over time
 * Note: This requires custom queries as the materialized view shows current state
 * For trend analysis, we need to query the underlying tables
 */
export async function getTeamPerformanceTrends(
  teamId: string,
  months: number = 6
): Promise<TeamTrend[]> {
  const supabase = createClient();

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Fetch team members
  const { data: members, error: membersError } = await supabase
    .from("users")
    .select("id")
    .eq("team_id", teamId);

  if (membersError) {
    console.error("Error fetching team members:", membersError);
    throw new Error("Failed to fetch team members");
  }

  const memberIds = members?.map(m => m.id) || [];

  if (memberIds.length === 0) {
    return [];
  }

  // Generate monthly buckets
  const trends: TeamTrend[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    // Fetch call reports for this month
    const { count: callReportsCount } = await supabase
      .from("call_reports")
      .select("*", { count: "exact", head: true })
      .in("created_by", memberIds)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    // Fetch evaluations for this month
    const { count: evaluationsCount } = await supabase
      .from("evaluator_forms")
      .select("*", { count: "exact", head: true })
      .in("evaluator_id", memberIds)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    // Fetch one-liners for this month
    const { count: oneLinersCount } = await supabase
      .from("one_liners")
      .select("*", { count: "exact", head: true })
      .in("created_by", memberIds)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    // Fetch stories approved/rejected for this month
    const { data: stories } = await supabase
      .from("stories")
      .select("status")
      .in("submitted_by", memberIds)
      .gte("updated_at", monthStart.toISOString())
      .lte("updated_at", monthEnd.toISOString());

    const storiesApproved = stories?.filter(s => s.status === "approved").length || 0;
    const storiesRejected = stories?.filter(s => s.status === "rejected").length || 0;

    trends.push({
      period: monthStart.toLocaleDateString("en-US", { year: "numeric", month: "short" }),
      call_reports: callReportsCount || 0,
      evaluations: evaluationsCount || 0,
      one_liners: oneLinersCount || 0,
      stories_approved: storiesApproved,
      stories_rejected: storiesRejected,
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return trends;
}

/**
 * Refresh team performance materialized views
 * (Admin only - requires service role key)
 */
export async function refreshTeamPerformanceViews(): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.rpc("refresh_all_team_views");

  if (error) {
    console.error("Error refreshing team performance views:", error);
    throw new Error("Failed to refresh team performance views");
  }
}

/**
 * Get team hierarchy with performance data
 */
export async function getTeamHierarchyWithPerformance(rootTeamId?: string) {
  const supabase = createClient();

  // Fetch team hierarchy
  const { data: hierarchy, error: hierarchyError } = await supabase
    .from("team_hierarchy")
    .select("*");

  if (hierarchyError) {
    console.error("Error fetching team hierarchy:", hierarchyError);
    throw new Error("Failed to fetch team hierarchy");
  }

  // Fetch performance data
  const { data: performance, error: performanceError } = await supabase
    .from("team_performance")
    .select("*");

  if (performanceError) {
    console.error("Error fetching team performance:", performanceError);
    throw new Error("Failed to fetch team performance");
  }

  // Merge hierarchy with performance data
  const performanceMap = new Map(performance?.map(p => [p.team_id, p]) || []);

  const enrichedHierarchy = hierarchy?.map(h => ({
    ...h,
    performance: performanceMap.get(h.team_id) || null,
  }));

  // If rootTeamId provided, filter to that subtree
  if (rootTeamId) {
    return enrichedHierarchy?.filter(h => h.team_id === rootTeamId || h.path.includes(rootTeamId));
  }

  return enrichedHierarchy || [];
}

/**
 * Compare team performance against type average
 */
export async function compareTeamToTypeAverage(teamId: string) {
  const supabase = createClient();

  // Get team performance
  const { data: teamPerf, error: teamError } = await supabase
    .from("team_performance")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (teamError) {
    console.error("Error fetching team performance:", teamError);
    throw new Error("Failed to fetch team performance");
  }

  // Get all teams of same type
  const { data: typeTeams, error: typeError } = await supabase
    .from("team_performance")
    .select("*")
    .eq("team_type", teamPerf.team_type);

  if (typeError) {
    console.error("Error fetching type teams:", typeError);
    throw new Error("Failed to fetch type teams");
  }

  const typeCount = typeTeams?.length || 0;

  // Calculate type averages
  const typeAvg = {
    call_reports: typeCount > 0
      ? typeTeams.reduce((sum, t) => sum + (t.call_reports_created || 0), 0) / typeCount
      : 0,
    evaluations: typeCount > 0
      ? typeTeams.reduce((sum, t) => sum + (t.evaluations_completed || 0), 0) / typeCount
      : 0,
    one_liners: typeCount > 0
      ? typeTeams.reduce((sum, t) => sum + (t.one_liners_logged || 0), 0) / typeCount
      : 0,
    stories_approved: typeCount > 0
      ? typeTeams.reduce((sum, t) => sum + (t.stories_approved || 0), 0) / typeCount
      : 0,
    avg_score: typeCount > 0
      ? typeTeams.reduce((sum, t) => sum + (t.avg_evaluation_score || 0), 0) / typeCount
      : 0,
  };

  // Calculate differences (percentage)
  const comparison = {
    team: teamPerf,
    type_average: typeAvg,
    difference: {
      call_reports: typeAvg.call_reports > 0
        ? ((teamPerf.call_reports_created - typeAvg.call_reports) / typeAvg.call_reports) * 100
        : 0,
      evaluations: typeAvg.evaluations > 0
        ? ((teamPerf.evaluations_completed - typeAvg.evaluations) / typeAvg.evaluations) * 100
        : 0,
      one_liners: typeAvg.one_liners > 0
        ? ((teamPerf.one_liners_logged - typeAvg.one_liners) / typeAvg.one_liners) * 100
        : 0,
      stories_approved: typeAvg.stories_approved > 0
        ? ((teamPerf.stories_approved - typeAvg.stories_approved) / typeAvg.stories_approved) * 100
        : 0,
      avg_score: typeAvg.avg_score > 0
        ? (((teamPerf.avg_evaluation_score || 0) - typeAvg.avg_score) / typeAvg.avg_score) * 100
        : 0,
    },
  };

  return comparison;
}
