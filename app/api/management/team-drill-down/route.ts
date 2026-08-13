import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

const VALID_METRICS = [
  "ideas_logged",
  "oneliner_evals",
  "episodic_evals",
  "episodes_received",
  "approved",
  "rejected",
  "pending_oneliners",
  "pending_episodes",
] as const;

type MetricType = (typeof VALID_METRICS)[number];

interface Column {
  key: string;
  label: string;
}

interface DrillDownResult {
  columns: Column[];
  rows: Record<string, any>[];
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(["management", "management_viewer"]);
  if (!auth.success) return auth.response;

  try {

    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("teamId");
    const metric = searchParams.get("metric") as MetricType;

    if (!teamId || !metric || !VALID_METRICS.includes(metric)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const admin = createAdminClient();
    const result = await fetchMetricData(admin, metric, teamId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("team-drill-down error:", error);
    return NextResponse.json({ error: "Failed to fetch drill-down data" }, { status: 500 });
  }
}

async function fetchMetricData(
  admin: ReturnType<typeof createAdminClient>,
  metric: MetricType,
  teamId: string
): Promise<DrillDownResult> {
  switch (metric) {
    case "ideas_logged": {
      const { data } = await admin
        .from("call_reports")
        .select("id, working_title, writer_name, created_at, current_average_score, evaluation_status")
        .eq("team_id", teamId)
        .eq("meeting_type", "call_report")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(200);

      return {
        columns: [
          { key: "working_title", label: "Title" },
          { key: "writer_name", label: "Writer" },
          { key: "created_at", label: "Submitted" },
          { key: "current_average_score", label: "Avg Score" },
          { key: "evaluation_status", label: "Status" },
        ],
        rows: (data || []).map((r: any) => ({
          ...r,
          created_at: fmtDate(r.created_at),
          current_average_score: r.current_average_score != null ? Number(r.current_average_score).toFixed(1) : "—",
          evaluation_status: fmtDecision(r.evaluation_status || "pending"),
        })),
      };
    }

    case "oneliner_evals": {
      // Use denormalized team_id on evaluator_forms — no member query needed
      const { data } = await admin
        .from("evaluator_forms")
        .select("id, average_score, decision, closing_remarks, submitted_at, call_reports(working_title), users!evaluator_id(name)")
        .eq("team_id", teamId)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(200);

      return {
        columns: onelinerEvalCols,
        rows: (data || []).map((r: any) => ({
          working_title: r.call_reports?.working_title || "—",
          evaluator: r.users?.name || "—",
          average_score: r.average_score != null ? Number(r.average_score).toFixed(1) : "—",
          decision: fmtDecision(r.decision),
          remarks: r.closing_remarks || "—",
          submitted_at: fmtDate(r.submitted_at),
        })),
      };
    }

    case "episodic_evals": {
      // Use denormalized team_id on episodic_evaluations — no member query needed
      const { data } = await admin
        .from("episodic_evaluations")
        .select("id, overall_average, decision, remarks, submitted_at, episodes(title, episode_number, call_report:call_reports(working_title)), evaluator:users!evaluator_id(name)")
        .eq("team_id", teamId)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(200);

      return {
        columns: episodicEvalCols,
        rows: (data || []).map((r: any) => ({
          project: r.episodes?.call_report?.working_title || "—",
          episode: r.episodes ? `Ep ${r.episodes.episode_number}` : "—",
          evaluator: r.evaluator?.name || "—",
          overall_average: r.overall_average != null ? Number(r.overall_average).toFixed(1) : "—",
          decision: fmtDecision(r.decision),
          remarks: r.remarks || "—",
          submitted_at: fmtDate(r.submitted_at),
        })),
      };
    }

    case "episodes_received": {
      const { data: teamCrs } = await admin
        .from("call_reports")
        .select("id")
        .eq("team_id", teamId)
        .eq("meeting_type", "call_report")
        .is("archived_at", null);
      const crIds = (teamCrs || []).map((c: any) => c.id);
      if (crIds.length === 0) return emptyResult(episodeReceivedCols);

      const { data } = await admin
        .from("episodes")
        .select("id, episode_number, title, created_at, approval_status, call_report:call_reports!call_report_id(working_title)")
        .in("call_report_id", crIds)
        .order("created_at", { ascending: false })
        .limit(200);

      return {
        columns: episodeReceivedCols,
        rows: (data || []).map((r: any) => ({
          project: (r.call_report as any)?.working_title || "—",
          episode_number: r.episode_number ? `Ep ${r.episode_number}` : "—",
          title: r.title || "—",
          approval_status: fmtDecision(r.approval_status || "pending"),
          created_at: fmtDate(r.created_at),
        })),
      };
    }

    case "approved":
    case "rejected": {
      // Single query — no need to fetch CR IDs first
      const { data } = await admin
        .from("call_reports")
        .select("id, working_title, writer_name, created_at, current_average_score")
        .eq("team_id", teamId)
        .eq("meeting_type", "call_report")
        .is("archived_at", null)
        .eq("evaluation_status", metric === "approved" ? "approved" : "rejected")
        .order("created_at", { ascending: false })
        .limit(200);

      return {
        columns: approvalCols,
        rows: (data || []).map((r: any) => ({
          working_title: r.working_title || "—",
          writer_name: r.writer_name || "—",
          current_average_score: r.current_average_score != null ? Number(r.current_average_score).toFixed(1) : "—",
          created_at: fmtDate(r.created_at),
        })),
      };
    }

    case "pending_oneliners": {
      // Single query: left-join evaluator_forms scoped to this team's CRs
      // instead of fetching ALL evaluator_forms globally
      const { data } = await admin
        .from("call_reports")
        .select("id, working_title, writer_name, created_at, original_submission_date, evaluator_forms(id)")
        .eq("team_id", teamId)
        .eq("meeting_type", "call_report")
        .is("archived_at", null)
        .not("evaluator_forms.submitted_at", "is", null);

      // CRs where evaluator_forms array is empty = no submitted evals = pending
      const pending = (data || [])
        .filter((cr: any) => !cr.evaluator_forms || cr.evaluator_forms.length === 0)
        .map((cr: any) => {
          const effectiveDate = cr.original_submission_date ?? cr.created_at;
          const age = Math.floor((Date.now() - new Date(effectiveDate).getTime()) / 86400000);
          return {
            working_title: cr.working_title || "—",
            writer_name: cr.writer_name || "—",
            created_at: fmtDate(effectiveDate),
            age: `${age}d`,
          };
        })
        .sort((a: any, b: any) => parseInt(b.age) - parseInt(a.age));

      return { columns: pendingOneLinerCols, rows: pending };
    }

    case "pending_episodes": {
      const { data: teamCrs } = await admin
        .from("call_reports")
        .select("id, working_title")
        .eq("team_id", teamId)
        .eq("meeting_type", "call_report")
        .is("archived_at", null);
      const crIds = (teamCrs || []).map((c: any) => c.id);
      if (crIds.length === 0) return emptyResult(pendingEpisodeCols);

      const crTitleMap = new Map((teamCrs || []).map((c: any) => [c.id, c.working_title]));

      // Left-join episodic_evaluations scoped to these episodes via FK
      // instead of fetching ALL episodic_evaluations globally
      const { data: episodes } = await admin
        .from("episodes")
        .select("id, episode_number, title, call_report_id, created_at, original_submission_date, episodic_evaluations(id)")
        .in("call_report_id", crIds)
        .not("episodic_evaluations.submitted_at", "is", null);

      // Episodes where episodic_evaluations array is empty = pending
      const pending = (episodes || [])
        .filter((ep: any) => !ep.episodic_evaluations || ep.episodic_evaluations.length === 0)
        .map((ep: any) => {
          const effectiveDate = ep.original_submission_date ?? ep.created_at;
          const age = Math.floor((Date.now() - new Date(effectiveDate).getTime()) / 86400000);
          return {
            project: crTitleMap.get(ep.call_report_id) || "—",
            episode_number: ep.episode_number ? `Ep ${ep.episode_number}` : "—",
            title: ep.title || "—",
            created_at: fmtDate(effectiveDate),
            age: `${age}d`,
          };
        })
        .sort((a: any, b: any) => parseInt(b.age) - parseInt(a.age));

      return { columns: pendingEpisodeCols, rows: pending };
    }

    default:
      return { columns: [], rows: [] };
  }
}

// ── Column definitions ────────────────────────────────────────────────────────

const onelinerEvalCols: Column[] = [
  { key: "working_title", label: "Project" },
  { key: "evaluator", label: "Evaluator" },
  { key: "average_score", label: "Score" },
  { key: "decision", label: "Decision" },
  { key: "remarks", label: "Remarks" },
  { key: "submitted_at", label: "Date" },
];

const episodicEvalCols: Column[] = [
  { key: "project", label: "Project" },
  { key: "episode", label: "Episode" },
  { key: "evaluator", label: "Evaluator" },
  { key: "overall_average", label: "Score" },
  { key: "decision", label: "Decision" },
  { key: "remarks", label: "Remarks" },
  { key: "submitted_at", label: "Date" },
];

const episodeReceivedCols: Column[] = [
  { key: "project", label: "Project" },
  { key: "episode_number", label: "Episode" },
  { key: "title", label: "Title" },
  { key: "approval_status", label: "Status" },
  { key: "created_at", label: "Received" },
];

const approvalCols: Column[] = [
  { key: "working_title", label: "Title" },
  { key: "writer_name", label: "Writer" },
  { key: "current_average_score", label: "Avg Score" },
  { key: "created_at", label: "Date" },
];

const pendingOneLinerCols: Column[] = [
  { key: "working_title", label: "Title" },
  { key: "writer_name", label: "Writer" },
  { key: "created_at", label: "Submitted" },
  { key: "age", label: "Age" },
];

const pendingEpisodeCols: Column[] = [
  { key: "project", label: "Project" },
  { key: "episode_number", label: "Episode" },
  { key: "title", label: "Title" },
  { key: "created_at", label: "Submitted" },
  { key: "age", label: "Age" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDecision(raw: string | null): string {
  if (!raw) return "—";
  const map: Record<string, string> = {
    approve: "Approve",
    approved: "Approved",
    reject: "Reject",
    rejected: "Rejected",
    needs_improvement: "Needs Improvement",
    needs_revision: "Needs Revision",
    strong_yes: "Strong Yes",
    strong_no: "Strong No",
    maybe: "Maybe",
    yes: "Yes",
    no: "No",
    pending: "Pending",
  };
  return map[raw] || raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function emptyResult(columns: Column[]): DrillDownResult {
  return { columns, rows: [] };
}
