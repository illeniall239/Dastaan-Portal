import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

function computeTrend(points: number[]): "improving" | "declining" | "stable" {
  if (points.length < 2) return "stable";
  // Compare avg of first half vs last half
  const mid = Math.ceil(points.length / 2);
  const firstHalf = points.slice(0, mid);
  const lastHalf = points.slice(mid);
  if (lastHalf.length === 0) return "stable";
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const lastAvg = lastHalf.reduce((a, b) => a + b, 0) / lastHalf.length;
  const diff = lastAvg - firstAvg;
  if (diff > 0.3) return "improving";
  if (diff < -0.3) return "declining";
  return "stable";
}

export async function GET() {
  const auth = await requireApiAuth(["management", "management_viewer"]);
  if (!auth.success) return auth.response;

  try {

    const admin = createAdminClient();

    const [{ data: callReports }, { data: evalForms }, { data: episodes }, { data: epEvals }, { data: teams }] = await Promise.all([
      admin.from("call_reports")
        .select("id, working_title, team_id")
        .is("archived_at", null)
        .eq("meeting_type", "call_report")
        .order("working_title"),
      admin.from("evaluator_forms")
        .select("call_report_id, average_score, evaluator:users!evaluator_forms_evaluator_id_fkey(name, team_id)")
        .not("submitted_at", "is", null)
        .not("average_score", "is", null),
      admin.from("episodes")
        .select("id, call_report_id, episode_number")
        .not("call_report_id", "is", null),
      admin.from("episodic_evaluations")
        .select("episode_id, overall_average, evaluator:users!episodic_evaluations_evaluator_id_fkey(name, team_id)")
        .not("submitted_at", "is", null)
        .not("overall_average", "is", null),
      admin.from("teams")
        .select("id, name, team_type, team_head:users!teams_team_head_id_fkey(name)"),
    ]);

    // Team display names (for project labels)
    const teamMap = new Map(
      (teams || []).map((t: any) => {
        const head = t.team_head ? (Array.isArray(t.team_head) ? t.team_head[0] : t.team_head) : null;
        return [t.id, head?.name ? `${head.name}'s Team` : t.name];
      })
    );

    // Evaluator team labels — merge programmer team + same head's management team into "Programming"
    const programmerHeadNames = new Set(
      (teams || []).filter((t: any) => t.team_type === "programmer")
        .map((t: any) => {
          const head = t.team_head ? (Array.isArray(t.team_head) ? t.team_head[0] : t.team_head) : null;
          return head?.name;
        }).filter(Boolean)
    );
    const evalTeamMap = new Map(
      (teams || []).map((t: any) => {
        const head = t.team_head ? (Array.isArray(t.team_head) ? t.team_head[0] : t.team_head) : null;
        let label: string;
        if (t.team_type === "programmer" || (head?.name && programmerHeadNames.has(head.name))) {
          label = "Programming";
        } else if (t.team_type === "evaluator") {
          label = "Content";
        } else if (head?.name) {
          label = `${head.name}'s Team`;
        } else {
          label = t.name;
        }
        return [t.id, label];
      })
    );

    // One-liner scores per CR with evaluator names + team
    type EvalDetail = { name: string; score: number; teamName: string };
    const crOneLiner = new Map<string, EvalDetail[]>();
    for (const ef of evalForms || []) {
      if (!crOneLiner.has(ef.call_report_id)) crOneLiner.set(ef.call_report_id, []);
      const evaluator: any = Array.isArray(ef.evaluator) ? ef.evaluator[0] : ef.evaluator;
      crOneLiner.get(ef.call_report_id)!.push({
        name: evaluator?.name || "Unknown",
        score: ef.average_score,
        teamName: evalTeamMap.get(evaluator?.team_id) || "Other",
      });
    }

    // Episode → CR map + episode_number
    const epInfo = new Map<string, { crId: string; epNum: number }>();
    for (const ep of episodes || []) {
      epInfo.set(ep.id, { crId: ep.call_report_id, epNum: ep.episode_number });
    }

    // Per CR, per episode_number: collect scores with evaluator names
    const crEpScores = new Map<string, Map<number, EvalDetail[]>>();
    for (const ee of epEvals || []) {
      const info = epInfo.get(ee.episode_id);
      if (!info) continue;
      if (!crEpScores.has(info.crId)) crEpScores.set(info.crId, new Map());
      const epMap = crEpScores.get(info.crId)!;
      if (!epMap.has(info.epNum)) epMap.set(info.epNum, []);
      const evaluator: any = Array.isArray(ee.evaluator) ? ee.evaluator[0] : ee.evaluator;
      epMap.get(info.epNum)!.push({
        name: evaluator?.name || "Unknown",
        score: ee.overall_average,
        teamName: evalTeamMap.get(evaluator?.team_id) || "Other",
      });
    }

    // Build results
    const projects = (callReports || [])
      .map((cr) => {
        const olScores = crOneLiner.get(cr.id);
        const epScoresMap = crEpScores.get(cr.id);

        const olAvg = olScores
          ? Math.round((olScores.reduce((a, b) => a + b.score, 0) / olScores.length) * 10) / 10
          : null;
        const olEvaluators = olScores?.map((e) => ({ name: e.name, score: Math.round(e.score * 10) / 10, teamName: e.teamName })) || [];

        const episodeTrend: { episode: number; avgScore: number; evalCount: number; evaluators: { name: string; score: number }[] }[] = [];
        if (epScoresMap) {
          const sortedEps = Array.from(epScoresMap.entries()).sort((a, b) => a[0] - b[0]);
          for (const [epNum, evals] of sortedEps) {
            episodeTrend.push({
              episode: epNum,
              avgScore: Math.round((evals.reduce((a, b) => a + b.score, 0) / evals.length) * 10) / 10,
              evalCount: evals.length,
              evaluators: evals.map((e) => ({ name: e.name, score: Math.round(e.score * 10) / 10, teamName: e.teamName })),
            });
          }
        }

        // Skip projects with no ratings at all
        if (olAvg === null && episodeTrend.length === 0) return null;

        // Compute trend from all data points (one-liner + episodes)
        const allPoints: number[] = [];
        if (olAvg !== null) allPoints.push(olAvg);
        for (const ep of episodeTrend) allPoints.push(ep.avgScore);

        const latestScore = allPoints.length > 0 ? allPoints[allPoints.length - 1] : null;
        const trendDirection = computeTrend(allPoints);

        return {
          id: cr.id,
          title: cr.working_title || "Untitled",
          teamName: teamMap.get(cr.team_id) || "Unknown",
          onelinerAvg: olAvg,
          onelinerEvaluators: olEvaluators,
          onelinerEvalCount: olScores?.length || 0,
          episodeTrend,
          trendDirection,
          latestScore,
          dataPoints: allPoints.length,
        };
      })
      .filter(Boolean);

    // Sort by most data points first (most interesting trends)
    projects.sort((a: any, b: any) => b.dataPoints - a.dataPoints);

    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
