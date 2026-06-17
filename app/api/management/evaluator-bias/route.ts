import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

type Dimension = "content_type" | "genre" | "target_slot" | "category" | "writer";

const ALLOWED_DIMENSIONS: Dimension[] = ["content_type", "genre", "target_slot", "category", "writer"];

const DIMENSION_COLUMN: Record<Exclude<Dimension, "writer">, string> = {
  content_type: "content_type",
  genre: "genre",
  target_slot: "target_slot",
  category: "category",
};

interface RawRow {
  evaluator_id: string;
  evaluator_name: string;
  dimension_value: string;
  avg_score: number;
  eval_count: number;
}

interface BiasCell {
  avgScore: number | null;
  count: number;
  deviation: number | null;
}

interface BiasFlag {
  evaluatorId: string;
  evaluatorName: string;
  dimensionValue: string;
  avgScore: number;
  peerAvg: number;
  deviation: number;
  count: number;
}

interface BiasResponse {
  dimension: Dimension;
  dimensionValues: string[];
  evaluators: {
    id: string;
    name: string;
    cells: Record<string, BiasCell>;
  }[];
  peerAverages: Record<string, number | null>;
  flags: BiasFlag[];
}

/**
 * GET /api/management/evaluator-bias
 * Returns a bias analysis matrix: evaluators × dimension values with avg scores.
 *
 * Query params:
 *   dimension   - content_type | genre | target_slot | category | writer
 *   from        - ISO date string (optional)
 *   to          - ISO date string (optional)
 *   minCount    - minimum evaluations to show a cell (default 3)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
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

    if (!profile || !["admin", "management", "executive"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const dimension = (searchParams.get("dimension") || "content_type") as Dimension;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const minCount = parseInt(searchParams.get("minCount") || "3", 10);

    if (!ALLOWED_DIMENSIONS.includes(dimension)) {
      return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    let rows: RawRow[];

    if (dimension === "writer") {
      // Writer dimension: join through call_report_writers → writers
      let query = adminClient
        .from("evaluator_forms")
        .select(`
          evaluator_id,
          average_score,
          call_report_id,
          evaluator:users!evaluator_id(id, name),
          call_report:call_reports!call_report_id(
            call_report_writers(writer:writers(name))
          )
        `)
        .not("average_score", "is", null)
        .not("submitted_at", "is", null);

      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to + "T23:59:59");

      const { data: evalData, error } = await query;
      if (error) throw error;

      // Expand: one row per writer per evaluator evaluation
      const expanded: RawRow[] = [];
      for (const ev of evalData || []) {
        const evaluator = Array.isArray(ev.evaluator) ? ev.evaluator[0] : ev.evaluator;
        const callReport = Array.isArray(ev.call_report) ? ev.call_report[0] : ev.call_report;
        const writers: string[] = [];
        for (const crw of callReport?.call_report_writers || []) {
          const w = Array.isArray(crw.writer) ? crw.writer[0] : crw.writer;
          if (w?.name) writers.push(w.name);
        }
        for (const writerName of writers) {
          expanded.push({
            evaluator_id: evaluator?.id || ev.evaluator_id,
            evaluator_name: evaluator?.name || "Unknown",
            dimension_value: writerName,
            avg_score: ev.average_score,
            eval_count: 1,
          });
        }
      }

      // Aggregate in JS: group by evaluator_id + dimension_value
      const grouped = new Map<string, { evaluator_id: string; evaluator_name: string; dimension_value: string; total: number; count: number }>();
      for (const r of expanded) {
        const key = `${r.evaluator_id}__${r.dimension_value}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.total += r.avg_score;
          existing.count += 1;
        } else {
          grouped.set(key, { evaluator_id: r.evaluator_id, evaluator_name: r.evaluator_name, dimension_value: r.dimension_value, total: r.avg_score, count: 1 });
        }
      }
      rows = Array.from(grouped.values()).map(g => ({
        evaluator_id: g.evaluator_id,
        evaluator_name: g.evaluator_name,
        dimension_value: g.dimension_value,
        avg_score: Math.round((g.total / g.count) * 100) / 100,
        eval_count: g.count,
      }));
    } else {
      // Direct column dimensions
      const col = DIMENSION_COLUMN[dimension];

      let query = adminClient
        .from("evaluator_forms")
        .select(`
          evaluator_id,
          average_score,
          evaluator:users!evaluator_id(id, name),
          call_report:call_reports!call_report_id(${col})
        `)
        .not("average_score", "is", null)
        .not("submitted_at", "is", null);

      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to + "T23:59:59");

      const { data: evalData, error } = await query;
      if (error) throw error;

      // Aggregate in JS
      const grouped = new Map<string, { evaluator_id: string; evaluator_name: string; dimension_value: string; total: number; count: number }>();
      for (const ev of (evalData as any[]) || []) {
        const evaluator = Array.isArray(ev.evaluator) ? ev.evaluator[0] : ev.evaluator;
        const callReport = Array.isArray(ev.call_report) ? ev.call_report[0] : ev.call_report;
        const dimValue = (callReport as any)?.[col];
        if (!dimValue) continue;

        const key = `${evaluator?.id || ev.evaluator_id}__${dimValue}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.total += ev.average_score;
          existing.count += 1;
        } else {
          grouped.set(key, {
            evaluator_id: evaluator?.id || ev.evaluator_id,
            evaluator_name: evaluator?.name || "Unknown",
            dimension_value: dimValue,
            total: ev.average_score,
            count: 1,
          });
        }
      }
      rows = Array.from(grouped.values()).map(g => ({
        evaluator_id: g.evaluator_id,
        evaluator_name: g.evaluator_name,
        dimension_value: g.dimension_value,
        avg_score: Math.round((g.total / g.count) * 100) / 100,
        eval_count: g.count,
      }));
    }

    // Build unique sorted dimension values ("Unknown"/"Unassigned" last)
    const allDimValues = Array.from(new Set(rows.map(r => r.dimension_value))).sort((a, b) => {
      const aLow = a.toLowerCase();
      const bLow = b.toLowerCase();
      if (["unknown", "unassigned", "n/a", ""].includes(aLow)) return 1;
      if (["unknown", "unassigned", "n/a", ""].includes(bLow)) return -1;
      return a.localeCompare(b);
    });

    // Build unique evaluators
    const evalMap = new Map<string, { id: string; name: string }>();
    for (const r of rows) {
      if (!evalMap.has(r.evaluator_id)) {
        evalMap.set(r.evaluator_id, { id: r.evaluator_id, name: r.evaluator_name });
      }
    }
    const evaluatorList = Array.from(evalMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Compute peer averages per dimension value (avg of evaluator-level averages where count >= minCount)
    const peerAverages: Record<string, number | null> = {};
    for (const dimVal of allDimValues) {
      const validRows = rows.filter(r => r.dimension_value === dimVal && r.eval_count >= minCount);
      if (validRows.length === 0) {
        peerAverages[dimVal] = null;
      } else {
        peerAverages[dimVal] = Math.round((validRows.reduce((s, r) => s + r.avg_score, 0) / validRows.length) * 100) / 100;
      }
    }

    // Build per-evaluator cells with deviations
    const evaluators = evaluatorList.map(ev => {
      const evRows = rows.filter(r => r.evaluator_id === ev.id);
      const cells: Record<string, BiasCell> = {};
      for (const dimVal of allDimValues) {
        const row = evRows.find(r => r.dimension_value === dimVal);
        if (!row || row.eval_count < minCount) {
          cells[dimVal] = { avgScore: null, count: row?.eval_count || 0, deviation: null };
        } else {
          const peer = peerAverages[dimVal];
          cells[dimVal] = {
            avgScore: row.avg_score,
            count: row.eval_count,
            deviation: peer !== null ? Math.round((row.avg_score - peer) * 100) / 100 : null,
          };
        }
      }
      return { id: ev.id, name: ev.name, cells };
    });

    // Compute flags: |deviation| >= 1.5
    const flags: BiasFlag[] = [];
    for (const ev of evaluators) {
      for (const [dimVal, cell] of Object.entries(ev.cells)) {
        if (cell.avgScore !== null && cell.deviation !== null && Math.abs(cell.deviation) >= 1.5) {
          flags.push({
            evaluatorId: ev.id,
            evaluatorName: ev.name,
            dimensionValue: dimVal,
            avgScore: cell.avgScore,
            peerAvg: peerAverages[dimVal]!,
            deviation: cell.deviation,
            count: cell.count,
          });
        }
      }
    }
    // Sort flags by absolute deviation descending
    flags.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

    const response: BiasResponse = {
      dimension,
      dimensionValues: allDimValues,
      evaluators,
      peerAverages,
      flags,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(`Evaluator bias API error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
