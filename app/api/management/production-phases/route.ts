import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getProductionPhase(totalEps: number | null, epsReceived: number): string | null {
  if (!totalEps || epsReceived === 0) return null;
  const thresholds: Record<number, { preCast: number; preProduction: number; productionStart: number }> = {
    30: { preCast: 3, preProduction: 10, productionStart: 15 },
    50: { preCast: 8, preProduction: 18, productionStart: 25 },
  };
  const t = thresholds[totalEps];
  if (!t) return null;
  if (epsReceived >= t.productionStart) return "Production Start";
  if (epsReceived >= t.preProduction) return "Pre Production";
  if (epsReceived >= t.preCast) return "Pre Cast";
  return null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch call reports with total_episodes + negotiations for estimated_episodes
    const [{ data: callReports }, { data: episodes }, { data: negotiations }, { data: evalForms }] = await Promise.all([
      admin.from("call_reports")
        .select("id, working_title, writer_name, total_episodes, team_id, target_slot, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))")
        .is("archived_at", null)
        .eq("meeting_type", "call_report"),
      admin.from("episodes")
        .select("id, call_report_id")
        .eq("is_current", true)
        .not("call_report_id", "is", null),
      admin.from("negotiations")
        .select("call_report_id, estimated_episodes")
        .not("call_report_id", "is", null),
      admin.from("evaluator_forms")
        .select("call_report_id, average_score")
        .not("submitted_at", "is", null)
        .not("average_score", "is", null),
    ]);

    // Build episode count per CR
    const epCountMap = new Map<string, number>();
    for (const ep of episodes || []) {
      epCountMap.set(ep.call_report_id, (epCountMap.get(ep.call_report_id) || 0) + 1);
    }

    // Build negotiation totalEps lookup (fallback if call_report.total_episodes is null)
    const negoEpsMap = new Map<string, number>();
    for (const n of negotiations || []) {
      if (n.estimated_episodes && n.call_report_id) {
        negoEpsMap.set(n.call_report_id, n.estimated_episodes);
      }
    }

    // Build CR → average eval score
    const crScores = new Map<string, number[]>();
    for (const ef of evalForms || []) {
      if (!crScores.has(ef.call_report_id)) crScores.set(ef.call_report_id, []);
      crScores.get(ef.call_report_id)!.push(ef.average_score);
    }
    const crAvgScore = new Map<string, number>();
    for (const [crId, scores] of crScores) {
      crAvgScore.set(crId, Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10);
    }

    type ProjectEntry = {
      id: string;
      title: string;
      writer: string;
      epsReceived: number;
      totalEps: number;
      slot: string | null;
      teamName: string | null;
      avgScore: number | null;
    };

    const buckets: Record<string, ProjectEntry[]> = {
      "Pre Cast": [],
      "Pre Production": [],
      "Production Start": [],
    };

    for (const cr of callReports || []) {
      const totalEps = cr.total_episodes || negoEpsMap.get(cr.id) || null;
      const epsReceived = epCountMap.get(cr.id) || 0;
      const phase = getProductionPhase(totalEps, epsReceived);
      if (phase && buckets[phase]) {
        const team: any = Array.isArray(cr.team) ? cr.team[0] : cr.team;
        const head: any = team?.team_head ? (Array.isArray(team.team_head) ? team.team_head[0] : team.team_head) : null;
        const teamDisplay = head?.name ? `${head.name}'s Team` : team?.name || null;
        buckets[phase].push({
          id: cr.id,
          title: cr.working_title || "Untitled",
          writer: cr.writer_name || "Unknown",
          epsReceived,
          totalEps: totalEps!,
          slot: cr.target_slot || null,
          teamName: teamDisplay,
          avgScore: crAvgScore.get(cr.id) || null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      buckets: {
        preCast: { count: buckets["Pre Cast"].length, projects: buckets["Pre Cast"] },
        preProduction: { count: buckets["Pre Production"].length, projects: buckets["Pre Production"] },
        productionStart: { count: buckets["Production Start"].length, projects: buckets["Production Start"] },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
