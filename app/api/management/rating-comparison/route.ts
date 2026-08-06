import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/rating-comparison
 * Compares one-liner evaluation scores vs episode evaluation scores per project.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get all active CRs
    const { data: callReports } = await admin
      .from("call_reports")
      .select("id, working_title, team_id")
      .is("archived_at", null)
      .eq("meeting_type", "call_report")
      .order("working_title");

    // Get one-liner eval scores (evaluator_forms)
    const { data: evalForms } = await admin
      .from("evaluator_forms")
      .select("call_report_id, average_score")
      .not("submitted_at", "is", null)
      .not("average_score", "is", null);

    // Get episodes
    const { data: episodes } = await admin
      .from("episodes")
      .select("id, call_report_id")
      .not("call_report_id", "is", null);

    // Get episodic eval scores
    const { data: epEvals } = await admin
      .from("episodic_evaluations")
      .select("episode_id, overall_average")
      .not("submitted_at", "is", null)
      .not("overall_average", "is", null);

    // Get team names
    const { data: teams } = await admin
      .from("teams")
      .select("id, name, team_head:users!teams_team_head_id_fkey(name)");

    const teamMap = new Map(
      (teams || []).map((t: any) => [t.id, t.team_head?.name ? `${t.team_head.name}'s Team` : t.name])
    );

    // Build one-liner avg per CR
    const crOneLinerScores = new Map<string, number[]>();
    for (const ef of evalForms || []) {
      if (!crOneLinerScores.has(ef.call_report_id)) crOneLinerScores.set(ef.call_report_id, []);
      crOneLinerScores.get(ef.call_report_id)!.push(ef.average_score);
    }

    // Build episode → CR map
    const epToCr = new Map<string, string>();
    const crEpisodeCount = new Map<string, number>();
    for (const ep of episodes || []) {
      epToCr.set(ep.id, ep.call_report_id);
      crEpisodeCount.set(ep.call_report_id, (crEpisodeCount.get(ep.call_report_id) || 0) + 1);
    }

    // Build episode avg per CR
    const crEpisodeScores = new Map<string, number[]>();
    for (const ee of epEvals || []) {
      const crId = epToCr.get(ee.episode_id);
      if (!crId) continue;
      if (!crEpisodeScores.has(crId)) crEpisodeScores.set(crId, []);
      crEpisodeScores.get(crId)!.push(ee.overall_average);
    }

    // Build comparison data
    const results = (callReports || [])
      .map((cr) => {
        const olScores = crOneLinerScores.get(cr.id);
        const epScores = crEpisodeScores.get(cr.id);
        const olAvg = olScores ? Math.round((olScores.reduce((a, b) => a + b, 0) / olScores.length) * 10) / 10 : null;
        const epAvg = epScores ? Math.round((epScores.reduce((a, b) => a + b, 0) / epScores.length) * 10) / 10 : null;

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
