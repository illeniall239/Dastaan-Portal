import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getWeekLabel(isoWeek: string): string {
  const [year, weekPart] = isoWeek.split("-W");
  const week = parseInt(weekPart);
  const jan4 = new Date(Date.UTC(parseInt(year), 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() + (1 - dayOfWeek) * 86400000 + (week - 1) * 7 * 86400000);
  return monday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function buildEvaluatorGrade(data: { epNums: number[]; scores: number[] }) {
  const sorted = [...data.epNums].sort((a, b) => a - b);
  const epRange = sorted.length === 0 ? "" : sorted.length === 1 ? `EP ${sorted[0]}` : `EP ${sorted[0]}–${sorted[sorted.length - 1]}`;
  const avgScore = data.scores.length
    ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
    : null;
  return { epRange, avgScore };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "management", "executive", "programmer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Fetch content development team member IDs (teams with team_type='management')
    // Exclude users who head non-management teams (e.g. Salman heads Programming Team but sits on mgmt team)
    const { data: allTeams } = await admin.from("teams").select("id, team_type, team_head_id");
    const mgmtTeamIds = (allTeams || []).filter((t: any) => t.team_type === "management").map((t: any) => t.id);
    const otherTeamHeadIds = new Set(
      (allTeams || []).filter((t: any) => t.team_type !== "management" && t.team_head_id).map((t: any) => t.team_head_id)
    );
    let contentDevIds = new Set<string>();
    if (mgmtTeamIds.length > 0) {
      const { data: cdUsers } = await admin.from("users").select("id").in("team_id", mgmtTeamIds);
      contentDevIds = new Set((cdUsers || []).filter((u: any) => !otherTeamHeadIds.has(u.id)).map((u: any) => u.id));
    }

    // 1. Fetch all active call reports
    const { data: callReports, error: crErr } = await admin
      .from("call_reports")
      .select(`
        id, working_title, writer_name, target_slot, total_episodes,
        aired_date, meeting_date, created_at, team_id, average_initial_assessment,
        team:teams!call_reports_team_id_fkey(
          id, name,
          head:users!teams_team_head_id_fkey(id, name, email)
        )
      `)
      .eq("meeting_type", "call_report")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (crErr) throw new Error(`call_reports query failed: ${crErr.message} (${crErr.code})`);

    if (!callReports || callReports.length === 0) {
      return NextResponse.json({ projects: [], weeks: [] });
    }

    const reportIds = callReports.map((r) => r.id);

    // 1b. Fetch writer commitments for these call reports
    const { data: commitments } = await admin
      .from("writer_commitments")
      .select("call_report_id, commitment_schedule, commitment_schedule_custom, commitment_type, project_initiation_date")
      .in("call_report_id", reportIds);

    const commitmentMap = Object.fromEntries(
      (commitments || []).map((c: any) => [c.call_report_id, c])
    );

    // 2. Fetch episodes for these call reports
    const { data: episodes, error: epErr } = await admin
      .from("episodes")
      .select("id, call_report_id, episode_number, created_at, original_submission_date")
      .in("call_report_id", reportIds)
      .eq("is_current", true)
      .order("episode_number", { ascending: true });

    if (epErr) throw new Error(`episodes query failed: ${epErr.message} (${epErr.code})`);

    // 3. Fetch episodic evaluations + episode revisions
    const episodeIds = (episodes || []).map((e) => e.id);

    const { data: epRevisions } = episodeIds.length
      ? await admin
          .from("episode_revisions")
          .select("episode_id, revision_number, created_at")
          .in("episode_id", episodeIds)
      : { data: [] };

    // Build episode → call_report lookup for revision grouping
    const episodeToReport = new Map<string, string>();
    for (const ep of episodes || []) {
      episodeToReport.set(ep.id, ep.call_report_id);
    }

    const { data: epEvals } = episodeIds.length
      ? await admin
          .from("episodic_evaluations")
          .select(`
            episode_id, evaluator_id, overall_average,
            evaluator:users!evaluator_id(id, name, email, role)
          `)
          .in("episode_id", episodeIds)
      : { data: [] };

    // 4. Fetch negotiations
    const { data: negotiations } = await admin
      .from("negotiations")
      .select("call_report_id, agreed_price, proposed_price, payment_structure, project_start_date, estimated_episodes, expected_completion_date")
      .in("call_report_id", reportIds)
      .not("call_report_id", "is", null);

    // 4b. Fetch per-evaluator one-liner grades from evaluator_forms (submitted only)
    const { data: oneLinerAssessments } = await admin
      .from("evaluator_forms")
      .select(`
        call_report_id, evaluator_id, average_score,
        assessor:users!evaluator_id(id, name, email, role)
      `)
      .in("call_report_id", reportIds)
      .not("submitted_at", "is", null);

    // --- Build lookup maps ---
    const epsByReport = new Map<string, any[]>();
    for (const ep of episodes || []) {
      if (!epsByReport.has(ep.call_report_id)) epsByReport.set(ep.call_report_id, []);
      epsByReport.get(ep.call_report_id)!.push(ep);
    }

    const evalsByEpisode = new Map<string, any[]>();
    for (const ev of (epEvals as any[]) || []) {
      if (!evalsByEpisode.has(ev.episode_id)) evalsByEpisode.set(ev.episode_id, []);
      evalsByEpisode.get(ev.episode_id)!.push(ev);
    }

    const negByReport = new Map<string, any>();
    for (const n of negotiations || []) {
      if (n.call_report_id && !negByReport.has(n.call_report_id)) {
        negByReport.set(n.call_report_id, n);
      }
    }

    // Build one-liner lookup maps
    const oneLinerByReport = new Map<string, Map<string, number>>();
    const globalOneLinerAssessorMap = new Map<string, { name: string; email: string; role: string; group: string }>();

    for (const row of (oneLinerAssessments as any[]) || []) {
      const assessor = Array.isArray(row.assessor) ? row.assessor[0] : row.assessor;
      if (!assessor || row.average_score === null || row.average_score === undefined) continue;
      if (!oneLinerByReport.has(row.call_report_id)) oneLinerByReport.set(row.call_report_id, new Map());
      oneLinerByReport.get(row.call_report_id)!.set(row.evaluator_id, parseFloat(row.average_score));
      if (!globalOneLinerAssessorMap.has(row.evaluator_id)) {
        const group = contentDevIds.has(row.evaluator_id) ? "Content Development"
          : assessor.role === "programmer" ? "Programming"
          : ["admin", "management", "executive"].includes(assessor.role) ? "Management"
          : "Content";
        globalOneLinerAssessorMap.set(row.evaluator_id, { name: assessor.name, email: assessor.email, role: assessor.role, group });
      }
    }

    const allWeeks = new Set<string>();
    // Collect all unique evaluators across all projects for the global list
    const globalEvaluatorMap = new Map<string, { name: string; email: string; role: string; group: string }>();

    // --- Build per-project data ---
    const projects = (callReports || []).map((cr) => {
      const crEpisodes = epsByReport.get(cr.id) || [];
      const neg = negByReport.get(cr.id);

      const epsReceived = crEpisodes.length;
      const totalEps = cr.total_episodes || neg?.estimated_episodes || null;
      const epsReq = neg?.estimated_episodes || cr.total_episodes || null;
      const epsBehind = totalEps !== null ? Math.max(0, totalEps - epsReceived) : null;

      let status: "RECEIVED" | "BEHIND" | "ON_TRACK" | null = null;
      if (totalEps !== null) {
        if (epsReceived >= totalEps) status = "RECEIVED";
        else if (epsBehind && epsBehind > 0) status = "BEHIND";
        else status = "ON_TRACK";
      }

      // Deadline & remaining eps
      const deadline = neg?.expected_completion_date || null;
      const epsRemaining = epsReq !== null ? Math.max(0, epsReq - epsReceived) : null;

      let perMonthEpsRequired: number | null = null;
      if (deadline && epsRemaining !== null && epsRemaining > 0) {
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const monthsLeft = (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth());
        if (monthsLeft > 0) {
          perMonthEpsRequired = Math.ceil(epsRemaining / monthsLeft);
        }
      }

      const epEffectiveDates = crEpisodes.map((e) => new Date(e.original_submission_date ?? e.created_at));
      const firstEpDate = epEffectiveDates.length ? new Date(Math.min(...epEffectiveDates.map((d) => d.getTime()))) : null;
      const lastEpDate  = epEffectiveDates.length ? new Date(Math.max(...epEffectiveDates.map((d) => d.getTime()))) : null;

      // Week-wise delivery
      const weekDelivery: Record<string, number> = {};
      for (const ep of crEpisodes) {
        const week = getISOWeek(new Date(ep.original_submission_date ?? ep.created_at));
        weekDelivery[week] = (weekDelivery[week] || 0) + 1;
        allWeeks.add(week);
      }

      // Week-wise revisions
      const weekRevisions: Record<string, number> = {};
      for (const rev of (epRevisions as any[]) || []) {
        if (episodeToReport.get(rev.episode_id) !== cr.id) continue;
        const week = getISOWeek(new Date(rev.created_at));
        weekRevisions[week] = (weekRevisions[week] || 0) + 1;
      }

      // Build evaluator map
      const evaluatorMap = new Map<string, { name: string; email: string; role: string; epNums: number[]; scores: number[] }>();
      for (const ep of crEpisodes) {
        const evals = evalsByEpisode.get(ep.id) || [];
        for (const ev of evals) {
          const evaluator = Array.isArray(ev.evaluator) ? ev.evaluator[0] : ev.evaluator;
          if (!evaluator) continue;
          if (!evaluatorMap.has(evaluator.id)) {
            evaluatorMap.set(evaluator.id, { name: evaluator.name, email: evaluator.email, role: evaluator.role, epNums: [], scores: [] });
          }
          const entry = evaluatorMap.get(evaluator.id)!;
          entry.epNums.push(ep.episode_number);
          if (ev.overall_average !== null && ev.overall_average !== undefined) {
            entry.scores.push(parseFloat(ev.overall_average));
          }
        }
      }

      // Build allEvaluatorGrades (all evaluators, keyed by ID) and populate global map
      const allEvaluatorGrades: Record<string, { epRange: string; avgScore: number | null }> = {};
      for (const [id, data] of evaluatorMap.entries()) {
        allEvaluatorGrades[id] = buildEvaluatorGrade(data);
        if (!globalEvaluatorMap.has(id)) {
          const group = contentDevIds.has(id) ? "Content Development"
            : data.role === "programmer" ? "Programming"
            : ["admin", "management", "executive"].includes(data.role) ? "Management"
            : "Content";
          globalEvaluatorMap.set(id, { name: data.name, email: data.email, role: data.role, group });
        }
      }

      // Generic evaluator grades — exclude content development team (shown in their own group)
      const evaluatorGrades = Array.from(evaluatorMap.entries())
        .filter(([id]) => !contentDevIds.has(id))
        .map(([id, data]) => {
          const { epRange, avgScore } = buildEvaluatorGrade(data);
          return { id, name: data.name, email: data.email, epRange, avgScore };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const team = Array.isArray((cr as any).team) ? (cr as any).team[0] : (cr as any).team;
      const teamHead = team ? (Array.isArray(team.head) ? team.head[0] : team.head) : null;

      return {
        id: cr.id,
        workingTitle: cr.working_title || "Untitled",
        writerName: cr.writer_name || null,
        slot: (cr as any).target_slot || null,
        totalEps,
        epsReq,
        epsReceived,
        epsBehind,
        epsRemaining,
        perMonthEpsRequired,
        status,
        deadline,
        onAirDate: (cr as any).aired_date || null,
        oneLinerGrades: Object.fromEntries(oneLinerByReport.get(cr.id) || []),
        agreementDate: neg?.project_start_date || cr.meeting_date || null,
        perEpAmount: neg?.agreed_price || neg?.proposed_price || null,
        paymentStructure: neg?.payment_structure || null,
        firstEpDate: firstEpDate?.toISOString() || null,
        lastEpDate: lastEpDate?.toISOString() || null,
        weekDelivery,
        weekRevisions,
        evaluatorGrades,
        allEvaluatorGrades,
        teamName: team?.name || null,
        teamHeadName: teamHead?.name || null,
        teamHeadEmail: teamHead?.email || null,
        commitment: commitmentMap[cr.id] ?? null,
      };
    });

    const weeks = Array.from(allWeeks).sort().map((isoWeek) => ({
      isoWeek,
      label: getWeekLabel(isoWeek),
    }));

    const evaluators = Array.from(globalEvaluatorMap.entries())
      .map(([id, data]) => ({ id, name: data.name, email: data.email, role: data.role, group: data.group }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const oneLinerAssessors = Array.from(globalOneLinerAssessorMap.entries())
      .map(([id, data]) => ({ id, name: data.name, email: data.email, role: data.role, group: data.group }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ projects, weeks, evaluators, oneLinerAssessors });
  } catch (error) {
    logger.error(`Content aging API error: ${error instanceof Error ? error.stack || error.message : JSON.stringify(error)}`);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
