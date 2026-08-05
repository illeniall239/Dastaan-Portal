import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function effectiveDate(record: { original_submission_date?: string | null; created_at: string }): string {
  return record.original_submission_date ?? record.created_at;
}

function daysTaken(loggedAt: string, evaluatedAt: string): string {
  const diff = Math.floor(
    (new Date(evaluatedAt).getTime() - new Date(loggedAt).getTime()) / 86400000
  );
  if (diff < 1) return "< 1 day";
  return `${diff} day${diff === 1 ? "" : "s"}`;
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

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const fromDate  = fromParam ? new Date(fromParam).toISOString() : null;

    // ── Find Salman, Humera, Mir ──────────────────────────────────────────
    const { data: targetUsers } = await supabase
      .from("users")
      .select("id, name")
      .or("name.ilike.%salman%,name.ilike.%humera%,email.eq.mir@geo.tv");

    if (!targetUsers?.length) {
      return NextResponse.json({ success: true, salman: [], humera: [], mir: [] });
    }

    const targetIds = targetUsers.map((u: any) => u.id);

    // User name map for resolving logged_by / created_by
    const { data: allUsers } = await supabase.from("users").select("id, name");
    const userNameMap = new Map<string, string>((allUsers ?? []).map((u: any) => [u.id, u.name]));

    // ── One-liner evaluations ─────────────────────────────────────────────
    let efQuery = supabase
      .from("evaluator_forms")
      .select(`
        evaluator_id, submitted_at, average_score, original_submission_date,
        call_report:call_reports!call_report_id(id, working_title, created_by, created_at, original_submission_date)
      `)
      .in("evaluator_id", targetIds)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: true });
    if (fromDate) efQuery = efQuery.gte("submitted_at", fromDate);
    const { data: efRows } = await efQuery;

    // ── Episode evaluations ───────────────────────────────────────────────
    let eeQuery = supabase
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
    if (fromDate) eeQuery = eeQuery.gte("submitted_at", fromDate);
    const { data: eeRows } = await eeQuery;

    // Drama title lookup for episode evals
    const epCallReportIds = [...new Set(
      (eeRows ?? [])
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

    // ── Build rows per person ─────────────────────────────────────────────
    const rowsByPerson = new Map<string, any[]>();
    for (const u of targetUsers) rowsByPerson.set(u.id, []);

    for (const row of efRows ?? []) {
      const cr = Array.isArray(row.call_report) ? row.call_report[0] : row.call_report;
      if (!cr || !rowsByPerson.has(row.evaluator_id)) continue;
      const evalDate = (row as any).original_submission_date ?? row.submitted_at;
      rowsByPerson.get(row.evaluator_id)!.push({
        Type:                       "One-Liner",
        Title:                      cr.working_title ?? "—",
        "Idea Uploaded By":         userNameMap.get(cr.created_by) ?? "—",
        "Idea/Episode Upload Date": formatDate(effectiveDate(cr)),
        "Evaluated On":             formatDate(evalDate),
        "Days Taken to Evaluate":   daysTaken(effectiveDate(cr), evalDate),
        Score:                      row.average_score != null ? Number(row.average_score) : "—",
      });
    }

    for (const row of eeRows ?? []) {
      const ep = Array.isArray(row.episode) ? row.episode[0] : row.episode;
      if (!ep || !rowsByPerson.has(row.evaluator_id)) continue;
      const dramaTitle = crTitleMap.get(ep.call_report_id) ?? "—";
      const epLabel = ep.episode_number ? `EP${ep.episode_number} — ${dramaTitle}` : dramaTitle;
      const score = avgEpScore(row);
      const eeEvalDate = (row as any).original_submission_date ?? row.submitted_at;
      rowsByPerson.get(row.evaluator_id)!.push({
        Type:                       "Episode",
        Title:                      epLabel,
        "Idea Uploaded By":         userNameMap.get(ep.logged_by) ?? "—",
        "Idea/Episode Upload Date": ep.created_at ? formatDate(effectiveDate(ep)) : "—",
        "Evaluated On":             formatDate(eeEvalDate),
        "Days Taken to Evaluate":   ep.created_at ? daysTaken(effectiveDate(ep), eeEvalDate) : "—",
        Score:                      score || "—",
      });
    }

    // Sort each person's rows by evaluated date
    for (const [, rows] of rowsByPerson) {
      rows.sort((a, b) =>
        new Date(a["Evaluated On"]).getTime() - new Date(b["Evaluated On"]).getTime()
      );
    }

    // Map to named keys
    const findRows = (keyword: string) => {
      const u = targetUsers.find((u: any) => u.name?.toLowerCase().includes(keyword));
      return u ? (rowsByPerson.get(u.id) ?? []) : [];
    };
    const mirUser = targetUsers.find((u: any) =>
      u.name?.toLowerCase().includes("mir") || u.name?.toLowerCase().includes("mir")
    );
    // Mir might match 'humera' partial — use email-based match via targetUsers list
    // Since we queried email=mir@geo.tv, Mir's record is the one not matching salman/humera
    const salmanUser = targetUsers.find((u: any) => u.name?.toLowerCase().includes("salman"));
    const humeraUser = targetUsers.find((u: any) => u.name?.toLowerCase().includes("humera"));
    const mirUserFinal = targetUsers.find((u: any) =>
      u.id !== salmanUser?.id && u.id !== humeraUser?.id
    );

    return NextResponse.json({
      success: true,
      salman: salmanUser ? (rowsByPerson.get(salmanUser.id) ?? []) : [],
      humera: humeraUser ? (rowsByPerson.get(humeraUser.id) ?? []) : [],
      mir:    mirUserFinal ? (rowsByPerson.get(mirUserFinal.id) ?? []) : [],
    });
  } catch (err: any) {
    console.error("idea-turnaround error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
