import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTeamDisplayName } from "@/lib/management/team-display";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/dept-output
 * Returns episodes submitted per team per month for the last 6 months.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;

    const admin = createAdminClient();

    // Get episodes with their CR's team_id, from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: episodes } = await admin
      .from("episodes")
      .select("id, created_at, original_submission_date, call_report:call_reports!call_report_id(team_id)")
      .not("call_report_id", "is", null)
      .gte("created_at", sixMonthsAgo.toISOString());

    // Get one-liners per team in same period
    const { data: callReports } = await admin
      .from("call_reports")
      .select("id, team_id, created_at")
      .is("archived_at", null)
      .eq("meeting_type", "call_report")
      .gte("created_at", sixMonthsAgo.toISOString());

    // Get team info
    const { data: teams } = await admin
      .from("teams")
      .select("id, name, team_type, team_head:users!teams_team_head_id_fkey(name)")
      .neq("team_type", "management");

    const teamNameMap = new Map(
      (teams || []).map((t: any) => [t.id, formatTeamDisplayName(t.name, t.team_head?.name)])
    );

    // Build monthly buckets (use day=1 to avoid month overflow on 31st)
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    // Count episodes per team per month
    const teamMonthlyEps = new Map<string, Map<string, number>>();
    const teamMonthlyOLs = new Map<string, Map<string, number>>();
    const teamTotalEps = new Map<string, number>();
    const teamTotalOLs = new Map<string, number>();

    for (const ep of (episodes || []) as any[]) {
      const teamId = ep.call_report?.team_id;
      if (!teamId || !teamNameMap.has(teamId)) continue;

      const date = new Date(ep.original_submission_date || ep.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!teamMonthlyEps.has(teamId)) teamMonthlyEps.set(teamId, new Map());
      const monthMap = teamMonthlyEps.get(teamId)!;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      teamTotalEps.set(teamId, (teamTotalEps.get(teamId) || 0) + 1);
    }

    for (const cr of (callReports || []) as any[]) {
      if (!cr.team_id || !teamNameMap.has(cr.team_id)) continue;
      const date = new Date(cr.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!teamMonthlyOLs.has(cr.team_id)) teamMonthlyOLs.set(cr.team_id, new Map());
      const monthMap = teamMonthlyOLs.get(cr.team_id)!;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      teamTotalOLs.set(cr.team_id, (teamTotalOLs.get(cr.team_id) || 0) + 1);
    }

    // Build output
    const allTeamIds = new Set([...teamMonthlyEps.keys(), ...teamMonthlyOLs.keys()]);
    const results = Array.from(allTeamIds).map((teamId) => {
      const monthlyEps = teamMonthlyEps.get(teamId) || new Map();
      const monthlyOLs = teamMonthlyOLs.get(teamId) || new Map();
      const activeMonths = months.filter((m) => (monthlyEps.get(m) || 0) > 0).length || 1;

      return {
        teamId,
        teamName: teamNameMap.get(teamId) || "Unknown",
        totalEpisodes: teamTotalEps.get(teamId) || 0,
        totalOneLiners: teamTotalOLs.get(teamId) || 0,
        avgEpisodesPerMonth: Math.round(((teamTotalEps.get(teamId) || 0) / activeMonths) * 10) / 10,
        monthly: months.map((m) => ({
          month: m,
          episodes: monthlyEps.get(m) || 0,
          oneLiners: monthlyOLs.get(m) || 0,
        })),
      };
    });

    // Sort by total episodes desc
    results.sort((a, b) => b.totalEpisodes - a.totalEpisodes);

    return NextResponse.json({ success: true, data: results, months });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
