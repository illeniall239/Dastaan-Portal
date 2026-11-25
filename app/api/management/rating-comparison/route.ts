import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";
import { getProjectRatings } from "@/lib/management/project-ratings-server";
import { fetchAll } from "@/lib/supabase/fetch-all";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/rating-comparison
 * Compares the one-liner rating vs the episodes rating per project (both the overall rating, as on the
 * Team Overview cards).
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(["management", "management_viewer"]);
  if (!auth.success) return auth.response;

  try {

    const admin = createAdminClient();

    // Get all active CRs
    const { data: callReports } = await admin
      .from("call_reports")
      .select("id, working_title, team_id")
      .is("archived_at", null)
      .eq("meeting_type", "call_report")
      .order("working_title");

    const [{ overall }, episodes] = await Promise.all([
      getProjectRatings(),
      fetchAll<any>((f, t) => admin.from("episodes").select("id, call_report_id")
        .not("call_report_id", "is", null).order("id").range(f, t)),
    ]);

    // Get team names
    const { data: teams } = await admin
      .from("teams")
      .select("id, name, team_head:users!teams_team_head_id_fkey(name)");

    const teamMap = new Map(
      (teams || []).map((t: any) => [t.id, t.team_head?.name ? `${t.team_head.name}'s Team` : t.name])
    );

    const crEpisodeCount = new Map<string, number>();
    for (const ep of episodes) crEpisodeCount.set(ep.call_report_id, (crEpisodeCount.get(ep.call_report_id) || 0) + 1);

    // Build comparison data
    const results = (callReports || [])
      .map((cr) => {
        const o = overall.get(cr.id);
        const olAvg = o?.oneLiner?.score ?? null;
        const epAvg = o?.episodes?.score ?? null;

        if (olAvg === null && epAvg === null) return null;

        const diff = olAvg !== null && epAvg !== null ? Math.round((epAvg - olAvg) * 10) / 10 : null;

        return {
          id: cr.id,
          title: cr.working_title,
          team: teamMap.get(cr.team_id) || "Unknown",
          onelinerAvg: olAvg,
          episodeAvg: epAvg,
          diff,
          episodeCount: crEpisodeCount.get(cr.id) || 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
