import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function GET() {
  const auth = await requireApiAuth(["management", "management_viewer"]);
  if (!auth.success) return auth.response;

  try {

    const admin = createAdminClient();

    const [{ data: callReports }, { data: evalForms }, { data: episodes }, { data: epEvals }, { data: teams }] =
      await Promise.all([
        admin.from("call_reports")
          .select("id, working_title, writer_name, team_id, target_slot, content_type, total_episodes, received_episodes")
          .is("archived_at", null)
          .eq("meeting_type", "call_report")
          .order("working_title"),
        admin.from("evaluator_forms")
          .select("call_report_id, average_score, evaluator:users!evaluator_forms_evaluator_id_fkey(name, team_id)")
          .not("submitted_at", "is", null)
          .not("average_score", "is", null),
        admin.from("episodes")
          .select("id, call_report_id")
          .eq("is_current", true)
          .not("call_report_id", "is", null),
        admin.from("episodic_evaluations")
          .select("episode_id, overall_average, evaluator:users!episodic_evaluations_evaluator_id_fkey(name, team_id)")
          .not("submitted_at", "is", null)
          .not("overall_average", "is", null),
        admin.from("teams")
          .select("id, name, team_head:users!teams_team_head_id_fkey(name)"),
      ]);

    // Team display names
    const teamMap = new Map(
      (teams || []).map((t: any) => {
        const head = t.team_head ? (Array.isArray(t.team_head) ? t.team_head[0] : t.team_head) : null;
        return [t.id, head?.name ? `${head.name}'s Team` : t.name];
      })
    );

    // One-liner scores + evaluator details per CR
    type EvalDetail = { name: string; score: number; team?: string };
    const crOneLinerScores = new Map<string, number[]>();
    const crOneLinerEvaluators = new Map<string, EvalDetail[]>();
    for (const ef of evalForms || []) {
      if (!crOneLinerScores.has(ef.call_report_id)) {
        crOneLinerScores.set(ef.call_report_id, []);
        crOneLinerEvaluators.set(ef.call_report_id, []);
      }
      crOneLinerScores.get(ef.call_report_id)!.push(ef.average_score);
      const evaluator: any = Array.isArray(ef.evaluator) ? ef.evaluator[0] : ef.evaluator;
      crOneLinerEvaluators.get(ef.call_report_id)!.push({
        name: evaluator?.name || "Unknown",
        score: Math.round(ef.average_score * 10) / 10,
        team: evaluator?.team_id ? teamMap.get(evaluator.team_id) || undefined : undefined,
      });
    }

    // Episode count per CR + episode → CR map
    const epToCr = new Map<string, string>();
    const crEpCount = new Map<string, number>();
    for (const ep of episodes || []) {
      epToCr.set(ep.id, ep.call_report_id);
      crEpCount.set(ep.call_report_id, (crEpCount.get(ep.call_report_id) || 0) + 1);
    }

    // Episode eval scores + evaluator details per CR
    const crEpScores = new Map<string, number[]>();
    const crEpEvaluators = new Map<string, EvalDetail[]>();
    for (const ee of epEvals || []) {
      const crId = epToCr.get(ee.episode_id);
      if (!crId) continue;
      if (!crEpScores.has(crId)) {
        crEpScores.set(crId, []);
        crEpEvaluators.set(crId, []);
      }
      crEpScores.get(crId)!.push(ee.overall_average);
      const evaluator: any = Array.isArray(ee.evaluator) ? ee.evaluator[0] : ee.evaluator;
      crEpEvaluators.get(crId)!.push({
        name: evaluator?.name || "Unknown",
        score: Math.round(ee.overall_average * 10) / 10,
        team: evaluator?.team_id ? teamMap.get(evaluator.team_id) || undefined : undefined,
      });
    }

    // Collect distinct slots
    const slotSet = new Set<string>();

    // Build per-project data
    const projects: any[] = [];
    for (const cr of callReports || []) {
      const olScores = crOneLinerScores.get(cr.id);
      const epScores = crEpScores.get(cr.id);

      const olAvg = olScores
        ? Math.round((olScores.reduce((a, b) => a + b, 0) / olScores.length) * 10) / 10
        : null;
      const epAvg = epScores
        ? Math.round((epScores.reduce((a, b) => a + b, 0) / epScores.length) * 10) / 10
        : null;

      // Skip projects with no evaluations at all
      if (olAvg === null && epAvg === null) continue;

      // Combined quality: weighted average if both exist, else whichever exists
      let quality: number;
      if (olAvg !== null && epAvg !== null) {
        // Weight episode avg more since it's based on actual scripts
        quality = Math.round((olAvg * 0.3 + epAvg * 0.7) * 10) / 10;
      } else {
        quality = (olAvg ?? epAvg)!;
      }

      // Quantity: episode count from episodes table, fallback to received_episodes
      const quantity = crEpCount.get(cr.id) || cr.received_episodes || 0;

      if (cr.target_slot) slotSet.add(cr.target_slot);

      // Deduplicate evaluators by name (aggregate scores per person)
      const dedup = (evals: EvalDetail[]) => {
        const byName = new Map<string, { scores: number[]; team?: string }>();
        for (const e of evals) {
          if (!byName.has(e.name)) byName.set(e.name, { scores: [], team: e.team });
          byName.get(e.name)!.scores.push(e.score);
        }
        return Array.from(byName.entries()).map(([name, { scores, team }]) => ({
          name,
          score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
          count: scores.length,
          team: team || null,
        })).sort((a, b) => b.score - a.score);
      };

      projects.push({
        id: cr.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || null,
        contentType: cr.content_type || null,
        teamId: cr.team_id,
        teamName: teamMap.get(cr.team_id) || "Unknown",
        slot: cr.target_slot || null,
        quality,
        onelinerAvg: olAvg,
        onelinerEvalCount: olScores?.length || 0,
        onelinerEvaluators: dedup(crOneLinerEvaluators.get(cr.id) || []),
        episodeAvg: epAvg,
        episodicEvalCount: epScores?.length || 0,
        episodicEvaluators: dedup(crEpEvaluators.get(cr.id) || []),
        quantity,
        totalEpisodes: cr.total_episodes || null,
      });
    }

    // Compute thresholds (use 7.0 for quality as the established "good" line)
    const qualityThreshold = 7.0;
    const quantities = projects.map((p) => p.quantity).filter((q) => q > 0);
    const quantityThreshold = quantities.length > 0 ? Math.round(median(quantities)) : 5;

    // Assign quadrants
    for (const p of projects) {
      const highQ = p.quality >= qualityThreshold;
      const highQty = p.quantity >= quantityThreshold;
      if (highQ && highQty) p.quadrant = 1;      // Stars
      else if (!highQ && highQty) p.quadrant = 2; // Volume Focus
      else if (!highQ && !highQty) p.quadrant = 3; // Needs Attention
      else p.quadrant = 4;                         // Quality Gems
    }

    // Distinct teams for filter dropdown
    const teamList = [...new Set(projects.map((p) => p.teamId))].map((tid) => ({
      id: tid,
      name: teamMap.get(tid) || "Unknown",
    })).sort((a, b) => a.name.localeCompare(b.name));

    const slots = [...slotSet].sort();

    return NextResponse.json({
      success: true,
      projects,
      thresholds: { quality: qualityThreshold, quantity: quantityThreshold },
      slots,
      teams: teamList,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
