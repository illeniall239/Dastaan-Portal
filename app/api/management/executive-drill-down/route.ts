import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

const VALID_METRICS = [
  "active_projects",
  "pipeline_value",
  "active_contracts",
  "overdue_payments",
  "weekly_activities",
  "pending_approvals",
] as const;

type MetricType = (typeof VALID_METRICS)[number];

interface Column { key: string; label: string }
interface DrillDownResult { columns: Column[]; rows: Record<string, any>[] }

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(["management", "management_viewer", "executive"]);
    if (!auth.success) return auth.response;

    const metric = request.nextUrl.searchParams.get("metric") as MetricType;
    if (!metric || !VALID_METRICS.includes(metric)) {
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }

    const admin = createAdminClient();
    const result = await fetchMetricData(admin, metric);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("executive-drill-down error:", error);
    return NextResponse.json({ error: "Failed to fetch drill-down data" }, { status: 500 });
  }
}

async function fetchMetricData(
  admin: ReturnType<typeof createAdminClient>,
  metric: MetricType
): Promise<DrillDownResult> {
  switch (metric) {
    case "active_projects": {
      // Single query on call_reports (the actual "ideas") instead of
      // 2 sequential queries (all CRs for story_ids → stories)
      const { data } = await admin
        .from("call_reports")
        .select("id, working_title, writer_name, created_at, evaluation_status, current_average_score")
        .eq("meeting_type", "call_report")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(200);

      return {
        columns: activeProjectCols,
        rows: (data || []).map((r: any) => ({
          title: r.working_title || "—",
          writer: r.writer_name || "—",
          score: r.current_average_score != null ? Number(r.current_average_score).toFixed(1) : "—",
          status: fmt(r.evaluation_status || "pending"),
          created_at: fmtDate(r.created_at),
        })),
      };
    }

    case "pipeline_value": {
      const [{ data: negotiations }, { data: contracts }] = await Promise.all([
        admin
          .from("negotiations")
          .select("id, status, proposed_price, agreed_price, stories(title), call_reports(working_title)")
          .in("status", ["in_progress", "agreed"])
          .order("created_at", { ascending: false }),
        admin
          .from("contracts")
          .select("id, total_value, status, stories(title)")
          .order("created_at", { ascending: false }),
      ]);

      const rows: Record<string, any>[] = [];
      for (const n of negotiations || []) {
        const val = n.status === "agreed"
          ? (parseFloat(n.agreed_price as any) || parseFloat(n.proposed_price as any) || 0)
          : (parseFloat(n.proposed_price as any) || 0);
        rows.push({
          title: (n as any).stories?.title || (n as any).call_reports?.working_title || "—",
          type: "Negotiation",
          status: fmt(n.status),
          value: fmtCurrency(val),
        });
      }
      for (const c of contracts || []) {
        rows.push({
          title: (c as any).stories?.title || "—",
          type: "Contract",
          status: fmt(c.status),
          value: fmtCurrency(parseFloat(c.total_value as any) || 0),
        });
      }

      return { columns: pipelineCols, rows };
    }

    case "active_contracts": {
      const { data } = await admin
        .from("negotiations")
        .select("id, status, proposed_price, agreed_price, created_at, stories(title), call_reports(working_title)")
        .in("status", ["agreed", "in_progress"])
        .order("created_at", { ascending: false });

      return {
        columns: contractCols,
        rows: (data || []).map((r: any) => {
          const val = r.status === "agreed"
            ? (parseFloat(r.agreed_price) || parseFloat(r.proposed_price) || 0)
            : (parseFloat(r.proposed_price) || 0);
          return {
            title: (r as any).stories?.title || (r as any).call_reports?.working_title || "—",
            status: fmt(r.status),
            value: fmtCurrency(val),
            created_at: fmtDate(r.created_at),
          };
        }),
      };
    }

    case "overdue_payments": {
      const { data } = await admin
        .from("payments")
        .select("id, amount, due_date, status, contracts(stories(title))")
        .eq("status", "overdue")
        .order("due_date", { ascending: true });

      return {
        columns: overdueCols,
        rows: (data || []).map((r: any) => ({
          title: r.contracts?.stories?.title || "—",
          amount: fmtCurrency(parseFloat(r.amount) || 0),
          due_date: fmtDate(r.due_date),
          days_overdue: `${Math.max(0, Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000))}d`,
        })),
      };
    }

    case "weekly_activities": {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await admin
        .from("audit_logs")
        .select("id, action, table_name, timestamp, users(name)")
        .gte("timestamp", weekAgo)
        .order("timestamp", { ascending: false })
        .limit(200);

      return {
        columns: activityCols,
        rows: (data || []).map((r: any) => ({
          user: (r as any).users?.name || "—",
          action: fmt(r.action),
          table_name: fmt(r.table_name),
          timestamp: fmtDateTime(r.timestamp),
        })),
      };
    }

    case "pending_approvals": {
      const { data } = await admin
        .from("one_liners")
        .select("id, decision, created_at, stories(title, writer_originator_name)")
        .eq("decision", "pending")
        .order("created_at", { ascending: true });

      return {
        columns: approvalCols,
        rows: (data || []).map((r: any) => {
          const age = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
          return {
            title: (r as any).stories?.title || "—",
            writer: (r as any).stories?.writer_originator_name || "—",
            created_at: fmtDate(r.created_at),
            age: `${age}d`,
          };
        }),
      };
    }

    default:
      return { columns: [], rows: [] };
  }
}

// ── Column definitions ────────────────────────────────────────────────────────

const activeProjectCols: Column[] = [
  { key: "title", label: "Title" },
  { key: "writer", label: "Writer" },
  { key: "score", label: "Avg Score" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
];

const pipelineCols: Column[] = [
  { key: "title", label: "Title" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "value", label: "Value" },
];

const contractCols: Column[] = [
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "value", label: "Value" },
  { key: "created_at", label: "Date" },
];

const overdueCols: Column[] = [
  { key: "title", label: "Project" },
  { key: "amount", label: "Amount" },
  { key: "due_date", label: "Due Date" },
  { key: "days_overdue", label: "Overdue" },
];

const activityCols: Column[] = [
  { key: "user", label: "User" },
  { key: "action", label: "Action" },
  { key: "table_name", label: "Section" },
  { key: "timestamp", label: "Time" },
];

const approvalCols: Column[] = [
  { key: "title", label: "Title" },
  { key: "writer", label: "Writer" },
  { key: "created_at", label: "Submitted" },
  { key: "age", label: "Waiting" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(raw: string | null): string {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function empty(columns: Column[]): DrillDownResult {
  return { columns, rows: [] };
}
