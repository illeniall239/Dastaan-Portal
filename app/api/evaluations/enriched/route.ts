import { NextResponse } from "next/server";
import { getAllCallReports } from "@/lib/meetings/server";
import { getEvaluationsByEvaluator } from "@/lib/evaluations/server";
import { calculateEvaluationProgress } from "@/lib/evaluations/progress";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") === "completed" ? "completed" : "pending";

    // Fetch call reports and user's evaluations in parallel
    const [callReports, myEvaluations] = await Promise.all([
      getAllCallReports(),
      getEvaluationsByEvaluator(user.id),
    ]);

    const myEvaluatedReportIds = new Set(myEvaluations.map((e: any) => e.call_report_id));

    // Fetch drafts
    const { data: drafts } = await supabase
      .from("evaluator_form_drafts")
      .select("call_report_id, draft_data")
      .eq("evaluator_id", user.id);

    const draftProgressMap = new Map(
      (drafts || []).map((draft: any) => [
        draft.call_report_id,
        calculateEvaluationProgress(draft.draft_data),
      ])
    );

    // Filter by view
    const filteredReports = view === "pending"
      ? callReports.filter((r: any) => !myEvaluatedReportIds.has(r.id))
      : callReports.filter((r: any) => myEvaluatedReportIds.has(r.id));

    // Fetch approvals for completed view
    let approvalsByReportId = new Map<string, any[]>();
    if (view === "completed" && filteredReports.length > 0) {
      const completedIds = filteredReports.map((r: any) => r.id);
      const { data: rawApprovals } = await supabase
        .from("story_approvals")
        .select("call_report_id, user_id, decision, approver_type")
        .in("call_report_id", completedIds);

      const approverUserIds = [...new Set((rawApprovals || []).map((a: any) => a.user_id))];
      let userMap: Record<string, { name: string; email: string }> = {};
      if (approverUserIds.length > 0) {
        const adminClient = createAdminClient();
        const { data: approverUsers } = await adminClient
          .from("users")
          .select("id, name, email")
          .in("id", approverUserIds);
        for (const u of approverUsers || []) {
          userMap[u.id] = { name: u.name, email: u.email };
        }
      }

      for (const a of rawApprovals || []) {
        const enriched = { ...a, user: userMap[a.user_id] || null };
        const list = approvalsByReportId.get(a.call_report_id) || [];
        list.push(enriched);
        approvalsByReportId.set(a.call_report_id, list);
      }
    }

    function computeApprovalStatus(approvals: any[]) {
      const mgmtApproved = approvals.filter((a: any) => a.approver_type === "management" && a.decision === "approved").length;
      const mgmtRejected = approvals.filter((a: any) => a.approver_type === "management" && a.decision === "rejected").length;
      const thirdApproved = approvals.filter((a: any) => a.approver_type !== "management" && a.decision === "approved").length;
      return {
        approvals,
        isFullyApproved: mgmtApproved >= 2 && thirdApproved >= 1,
        isRejected: mgmtRejected > 0,
        managementApproved: mgmtApproved >= 2,
      };
    }

    const enrichedReports = filteredReports.map((report: any) => ({
      report,
      hasEvaluated: myEvaluatedReportIds.has(report.id),
      myEvaluation: myEvaluations.find((e: any) => e.call_report_id === report.id) || null,
      draftProgress: draftProgressMap.get(report.id) || null,
      approvalStatus: view === "completed"
        ? computeApprovalStatus(approvalsByReportId.get(report.id) || [])
        : null,
    }));

    return NextResponse.json({ reports: enrichedReports, view });
  } catch (error: any) {
    console.error("Error fetching enriched evaluations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}
