import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

const MONTHS = [
  { label: "Dec-25", start: "2025-12-01", end: "2026-01-01" },
  { label: "Jan-26", start: "2026-01-01", end: "2026-02-01" },
  { label: "Feb-26", start: "2026-02-01", end: "2026-03-01" },
  { label: "Mar-26", start: "2026-03-01", end: "2026-04-01" },
  { label: "Apr-26", start: "2026-04-01", end: "2026-05-01" },
  { label: "May-26", start: "2026-05-01", end: "2026-06-01" },
];

const ROLES_IDEAS    = ["content_creator", "content_manager", "evaluator", "programmer"];
const ROLES_EVALS    = ["evaluator", "programmer", "management"];
const ROLES_EPS_LOG  = ["content_creator", "content_manager", "evaluator", "programmer"];
const ROLES_EPS_EVAL = ["evaluator", "programmer", "management"];

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : Math.round(sorted[mid]);
}

function avgEpScore(ev: any): number {
  const fields = [
    "conflict_of_content_score", "characterization_score", "story_progression_score",
    "main_event_score", "small_event_score", "dragness_score",
    "freezes_score", "whats_next_element_score", "overall_assessment_score",
  ];
  const vals = fields.map(f => Number(ev[f] ?? 0)).filter(v => v > 0);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

function effectiveDate(record: { original_submission_date?: string | null; created_at: string }): string {
  return record.original_submission_date ?? record.created_at;
}

function getMonthLabel(dateStr: string): string | null {
  const d = new Date(dateStr);
  for (const m of MONTHS) {
    if (d >= new Date(m.start) && d < new Date(m.end)) return m.label;
  }
  return null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function daysTaken(loggedAt: string, evaluatedAt: string): string {
  const diff = Math.floor(
    (new Date(evaluatedAt).getTime() - new Date(loggedAt).getTime()) / 86400000
  );
  if (diff < 1) return "< 1 day";
  return `${diff} day${diff === 1 ? "" : "s"}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(["management", "management_viewer"]);
  if (!auth.success) return auth.response;

  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const fromDate = fromParam ? new Date(fromParam).toISOString() : null;

    // ── 1. Users + teams ──────────────────────────────────────────────────
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id, name, role, team_id")
      .eq("status", "active");
    if (usersErr) throw usersErr;

    const { data: teams, error: teamsErr } = await supabase
      .from("teams")
      .select("id, name");
    if (teamsErr) throw teamsErr;

    const teamMap = new Map<string, string>((teams ?? []).map((t: any) => [t.id, t.name]));
    const userNameMap = new Map<string, string>((users ?? []).map((u: any) => [u.id, u.name]));
    const userList = (users ?? []).map((u: any) => ({
      id: u.id, name: u.name, role: u.role,
      team: teamMap.get(u.team_id) ?? "—",
    }));
    const userIds = userList.map(u => u.id);

    // ── 2. Bulk-fetch Sheet 1 data (Dec 2025 – May 2026) ─────────────────
    const rangeStart = MONTHS[0].start;
    const rangeEnd   = MONTHS[MONTHS.length - 1].end;

    const [callReportsRes, evalFormsRes, episodesRes, epicEvalRes] = await Promise.all([
      supabase
        .from("call_reports")
        .select("id, created_by, created_at, original_submission_date")
        .is("archived_at", null),
      supabase
        .from("evaluator_forms")
        .select("evaluator_id, submitted_at, average_score, original_submission_date")
        .gte("submitted_at", rangeStart)
        .lt("submitted_at", rangeEnd)
        .not("submitted_at", "is", null),
      supabase
        .from("episodes")
        .select("id, logged_by, created_at, original_submission_date"),
      supabase
        .from("episodic_evaluations")
        .select(`evaluator_id, submitted_at, original_submission_date, episode_id,
          conflict_of_content_score, characterization_score, story_progression_score,
          main_event_score, small_event_score, dragness_score,
          freezes_score, whats_next_element_score, overall_assessment_score`)
        .gte("submitted_at", rangeStart)
        .lt("submitted_at", rangeEnd)
        .not("submitted_at", "is", null),
    ]);

    if (callReportsRes.error) throw callReportsRes.error;
    if (evalFormsRes.error)   throw evalFormsRes.error;
    if (episodesRes.error)    throw episodesRes.error;
    if (epicEvalRes.error)    throw epicEvalRes.error;

    // Episode number lookup for EP range
    const episodeIds = [...new Set((epicEvalRes.data ?? []).map((e: any) => e.episode_id).filter(Boolean))];
    const episodeNumberMap = new Map<string, number>();
    if (episodeIds.length) {
      const { data: epNums } = await supabase
        .from("episodes")
        .select("id, episode_number")
        .in("id", episodeIds);
      (epNums ?? []).forEach((e: any) => episodeNumberMap.set(e.id, e.episode_number));
    }

    // ── 3. Sessions for last login + median ───────────────────────────────
    const sessionQuery = supabase
      .from("user_sessions")
      .select("user_id, login_at, logout_at, active_minutes")
      .in("user_id", userIds)
      .order("login_at", { ascending: false });

    const { data: sessions } = fromDate
      ? await sessionQuery.gte("login_at", fromDate)
      : await sessionQuery;

    const sessionsByUser = new Map<string, any[]>();
    (sessions ?? []).forEach((s: any) => {
      if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, []);
      sessionsByUser.get(s.user_id)!.push(s);
    });

    // ── 4. Build per-user per-month indexes ───────────────────────────────
    const crIndex = new Map<string, Map<string, number>>();
    (callReportsRes.data ?? []).forEach((r: any) => {
      const ml = getMonthLabel(effectiveDate(r));
      if (!ml || !r.created_by) return;
      if (!crIndex.has(r.created_by)) crIndex.set(r.created_by, new Map());
      crIndex.get(r.created_by)!.set(ml, (crIndex.get(r.created_by)!.get(ml) ?? 0) + 1);
    });

    const efIndex = new Map<string, Map<string, { count: number; scores: number[] }>>();
    (evalFormsRes.data ?? []).forEach((r: any) => {
      const ml = getMonthLabel(r.original_submission_date ?? r.submitted_at);
      if (!ml || !r.evaluator_id) return;
      if (!efIndex.has(r.evaluator_id)) efIndex.set(r.evaluator_id, new Map());
      const m = efIndex.get(r.evaluator_id)!;
      if (!m.has(ml)) m.set(ml, { count: 0, scores: [] });
      const entry = m.get(ml)!;
      entry.count++;
      if (r.average_score != null) entry.scores.push(Number(r.average_score));
    });

    const epLogIndex = new Map<string, Map<string, number>>();
    (episodesRes.data ?? []).forEach((r: any) => {
      const ml = getMonthLabel(effectiveDate(r));
      if (!ml || !r.logged_by) return;
      if (!epLogIndex.has(r.logged_by)) epLogIndex.set(r.logged_by, new Map());
      epLogIndex.get(r.logged_by)!.set(ml, (epLogIndex.get(r.logged_by)!.get(ml) ?? 0) + 1);
    });

    const eeIndex = new Map<string, Map<string, { count: number; scores: number[]; epNums: number[] }>>();
    (epicEvalRes.data ?? []).forEach((r: any) => {
      const ml = getMonthLabel(r.original_submission_date ?? r.submitted_at);
      if (!ml || !r.evaluator_id) return;
      if (!eeIndex.has(r.evaluator_id)) eeIndex.set(r.evaluator_id, new Map());
      const m = eeIndex.get(r.evaluator_id)!;
      if (!m.has(ml)) m.set(ml, { count: 0, scores: [], epNums: [] });
      const entry = m.get(ml)!;
      entry.count++;
      const score = avgEpScore(r);
      if (score > 0) entry.scores.push(score);
      const epNum = episodeNumberMap.get(r.episode_id);
      if (epNum) entry.epNums.push(epNum);
    });

    // ── 5. Build Sheet 1 rows ─────────────────────────────────────────────
    const rows: Record<string, any>[] = [];

    for (const user of userList) {
      const showIdeas    = ROLES_IDEAS.includes(user.role);
      const showEvals    = ROLES_EVALS.includes(user.role);
      const showEpsLog   = ROLES_EPS_LOG.includes(user.role);
      const showEpsEval  = ROLES_EPS_EVAL.includes(user.role);

      const row: Record<string, any> = { Name: user.name, Team: user.team, Role: user.role };

      for (const m of MONTHS) {
        const ml = m.label;

        row[`${ml} Ideas`] = showIdeas ? (crIndex.get(user.id)?.get(ml) ?? 0) : "—";

        const ef = efIndex.get(user.id)?.get(ml);
        row[`${ml} Evals`] = showEvals ? (ef?.count ?? 0) : "—";
        row[`${ml} Eval Score`] = showEvals && ef?.scores?.length
          ? Math.round((ef.scores.reduce((s, v) => s + v, 0) / ef.scores.length) * 10) / 10
          : "—";

        row[`${ml} Eps Logged`] = showEpsLog ? (epLogIndex.get(user.id)?.get(ml) ?? 0) : "—";

        const ee = eeIndex.get(user.id)?.get(ml);
        row[`${ml} Eps Eval`] = showEpsEval ? (ee?.count ?? 0) : "—";

        if (showEpsEval && ee?.epNums?.length) {
          const sorted = [...new Set(ee.epNums)].sort((a, b) => a - b);
          row[`${ml} Eps Range`] = sorted.length === 1
            ? `EP${sorted[0]}`
            : `EP${sorted[0]}-EP${sorted[sorted.length - 1]}`;
        } else {
          row[`${ml} Eps Range`] = "—";
        }

        row[`${ml} Eps Score`] = showEpsEval && ee?.scores?.length
          ? Math.round((ee.scores.reduce((s, v) => s + v, 0) / ee.scores.length) * 10) / 10
          : "—";
      }

      const userSessions = sessionsByUser.get(user.id) ?? [];
      const lastSession = userSessions[0];
      row["Last Login"] = lastSession?.login_at
        ? new Date(lastSession.login_at).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })
        : "Never";

      const durations = userSessions
        .map((s: any) => {
          if (s.active_minutes) return Number(s.active_minutes);
          if (s.logout_at && s.login_at)
            return Math.round((new Date(s.logout_at).getTime() - new Date(s.login_at).getTime()) / 60000);
          return null;
        })
        .filter((v): v is number => v !== null && v > 0 && v <= 120);

      row["Median Session (mins)"] = median(durations) || "—";
      rows.push(row);
    }

    // ── 6. Sheet 2: Evaluator Turnaround (Salman & Humera) ───────────────
    const { data: targetUsers } = await supabase
      .from("users")
      .select("id, name")
      .or("name.ilike.%salman%,name.ilike.%humera%,email.eq.mir@geo.tv");

    const turnaround: Record<string, any>[] = [];

    if (targetUsers?.length) {
      const targetIds = targetUsers.map((u: any) => u.id);
      const targetNameMap = new Map<string, string>(targetUsers.map((u: any) => [u.id, u.name]));

      // One-liner evaluations
      const { data: efTurnaround } = await supabase
        .from("evaluator_forms")
        .select(`
          evaluator_id, submitted_at, average_score, original_submission_date,
          call_report:call_reports!call_report_id(id, working_title, created_by, created_at, original_submission_date)
        `)
        .in("evaluator_id", targetIds)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: true });

      for (const row of efTurnaround ?? []) {
        const cr = Array.isArray(row.call_report) ? row.call_report[0] : row.call_report;
        if (!cr) continue;
        const evalDate = (row as any).original_submission_date ?? row.submitted_at;
        turnaround.push({
          Evaluator:                  targetNameMap.get(row.evaluator_id) ?? row.evaluator_id,
          Type:                       "One-Liner",
          Title:                      cr.working_title ?? "—",
          "Idea Uploaded By":         userNameMap.get(cr.created_by) ?? "—",
          "Idea/Episode Upload Date": formatDate(effectiveDate(cr)),
          "Evaluated On":             formatDate(evalDate),
          "Days Taken to Evaluate":   daysTaken(effectiveDate(cr), evalDate),
          Score:                      row.average_score != null ? Number(row.average_score) : "—",
        });
      }

      // Episode evaluations
      const { data: eeTurnaround } = await supabase
        .from("episodic_evaluations")
        .select(`
          evaluator_id, submitted_at, original_submission_date,
          conflict_of_content_score, characterization_score, story_progression_score,
          main_event_score, small_event_score, dragness_score,
          freezes_score, whats_next_element_score, overall_assessment_score,
          episode:episodes!episode_id(id, episode_number, call_report_id, created_at, original_submission_date, logged_by)
        `)
        .in("evaluator_id", targetIds)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: true });

      // Collect call_report_ids from episodes to fetch working titles
      const epCallReportIds = [...new Set(
        (eeTurnaround ?? [])
          .map((r: any) => {
            const ep = Array.isArray(r.episode) ? r.episode[0] : r.episode;
            return ep?.call_report_id;
          })
          .filter(Boolean)
      )];

      const crTitleMap = new Map<string, string>();
      if (epCallReportIds.length) {
        const { data: crTitles } = await supabase
          .from("call_reports")
          .select("id, working_title")
          .in("id", epCallReportIds);
        (crTitles ?? []).forEach((c: any) => crTitleMap.set(c.id, c.working_title));
      }

      for (const row of eeTurnaround ?? []) {
        const ep = Array.isArray(row.episode) ? row.episode[0] : row.episode;
        if (!ep) continue;
        const dramaTitle = crTitleMap.get(ep.call_report_id) ?? "—";
        const epLabel = ep.episode_number ? `EP${ep.episode_number} — ${dramaTitle}` : dramaTitle;
        const score = avgEpScore(row);
        const eeEvalDate = (row as any).original_submission_date ?? row.submitted_at;
        turnaround.push({
          Evaluator:                  targetNameMap.get(row.evaluator_id) ?? row.evaluator_id,
          Type:                       "Episode",
          Title:                      epLabel,
          "Idea Uploaded By":         userNameMap.get(ep.logged_by) ?? "—",
          "Idea/Episode Upload Date": ep.created_at ? formatDate(effectiveDate(ep)) : "—",
          "Evaluated On":             formatDate(eeEvalDate),
          "Days Taken to Evaluate":   ep.created_at ? daysTaken(effectiveDate(ep), eeEvalDate) : "—",
          Score:                      score || "—",
        });
      }

      // Sort: Evaluator name asc, Date Evaluated asc
      turnaround.sort((a, b) =>
        a.Evaluator.localeCompare(b.Evaluator) ||
        new Date(a["Date Evaluated"]).getTime() - new Date(b["Date Evaluated"]).getTime()
      );
    }

    return NextResponse.json({ success: true, rows, turnaround });
  } catch (err: any) {
    console.error("team-activity export error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
