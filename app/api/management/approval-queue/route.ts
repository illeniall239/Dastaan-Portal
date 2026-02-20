import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/approval-queue
 * Returns call reports that have been evaluated (have evaluator_form entries)
 * but the current management user has not yet submitted a story_approval for.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!currentUser || !["management", "admin", "executive"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Step 1: Get evaluated call_report_ids + scores from the view (same pattern as
    // other management endpoints — avoids fragile nested selects)
    const { data: viewRows, error: viewErr } = await adminClient
      .from("call_report_evaluations_with_type")
      .select("call_report_id, average_score, submitted_at")
      .not("call_report_id", "is", null);

    if (viewErr) throw new Error(`Failed to fetch evaluations view: ${viewErr.message}`);

    const evaluatedIds = [
      ...new Set((viewRows || []).map((r) => r.call_report_id as string)),
    ];

    if (evaluatedIds.length === 0) {
      return NextResponse.json({ success: true, callReports: [] });
    }

    // Build per-call-report stats from the view rows
    const statsByCallReport: Record<string, { scores: number[]; latestAt: string }> = {};
    for (const row of viewRows || []) {
      const id = row.call_report_id as string;
      if (!statsByCallReport[id]) statsByCallReport[id] = { scores: [], latestAt: row.submitted_at || "" };
      if (row.average_score) statsByCallReport[id].scores.push(Number(row.average_score));
      if (row.submitted_at && row.submitted_at > statsByCallReport[id].latestAt) {
        statsByCallReport[id].latestAt = row.submitted_at;
      }
    }

    // Step 2: IDs the current user has already acted on in story_approvals
    const { data: myApprovals } = await adminClient
      .from("story_approvals")
      .select("call_report_id")
      .eq("user_id", user.id)
      .in("call_report_id", evaluatedIds);

    const myApprovedIds = new Set((myApprovals || []).map((a) => a.call_report_id));
    const pendingIds = evaluatedIds.filter((id) => !myApprovedIds.has(id));

    if (pendingIds.length === 0) {
      return NextResponse.json({ success: true, callReports: [] });
    }

    // Step 3: Fetch call report details (no nested selects)
    const { data: callReports, error: crErr } = await adminClient
      .from("call_reports")
      .select("id, working_title, call_report_id, created_at")
      .in("id", pendingIds)
      .order("created_at", { ascending: false });

    if (crErr) throw new Error(`Failed to fetch call_reports: ${crErr.message}`);

    // Shape the response
    const result = (callReports || []).map((cr: any) => {
      const stats = statsByCallReport[cr.id];
      const scores = stats?.scores || [];
      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;
      return {
        id: cr.id,
        workingTitle: cr.working_title || cr.call_report_id,
        callReportId: cr.call_report_id,
        createdAt: cr.created_at,
        averageScore: avgScore,
        lastEvaluatedAt: stats?.latestAt || cr.created_at,
        evaluationCount: scores.length,
      };
    });

    return NextResponse.json({ success: true, callReports: result });
  } catch (error) {
    console.error("Error in approval-queue GET:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval queue" },
      { status: 500 }
    );
  }
}
