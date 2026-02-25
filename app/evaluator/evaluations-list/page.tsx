import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { getAllCallReports } from "@/lib/meetings/server";
import { getEvaluationsByEvaluator } from "@/lib/evaluations/server";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";
import { PendingEvaluationsNotificationEvaluator } from "@/components/evaluations/pending-evaluations-notification-evaluator";
import { calculateEvaluationProgress } from "@/lib/evaluations/progress";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BackButton } from "@/components/ui/back-button";
import { EvaluationSearchableList, type EnrichedReport } from "@/components/evaluations/evaluation-searchable-list";

export const dynamic = "force-dynamic";

export default async function EvaluatorEvaluationsListPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "evaluator") {
    redirect("/unauthorized");
  }

  // Fetch all call reports
  let callReports: any[] = [];
  try {
    callReports = await getAllCallReports();
  } catch (error) {
    console.error("Error fetching call reports:", error);
  }

  // Fetch my evaluations
  let myEvaluations: any[] = [];
  try {
    myEvaluations = await getEvaluationsByEvaluator(user.id);
  } catch (error) {
    console.error("Error fetching my evaluations:", error);
  }
  const myEvaluatedReportIds = new Set(myEvaluations.map(e => e.call_report_id));

  // Fetch evaluation drafts
  const supabase = await createClient();

  const { data: currentUser } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  // Check if current user is a team head
  let isTeamHead = false;
  const currentTeamId = currentUser?.team_id;
  if (currentTeamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("team_head_id")
      .eq("id", currentTeamId)
      .single();
    isTeamHead = team?.team_head_id === user.id;
  }

  let myDrafts: any[] = [];
  try {
    const { data: drafts, error: draftsError } = await supabase
      .from("evaluator_form_drafts")
      .select("call_report_id, draft_data")
      .eq("evaluator_id", user.id);

    if (!draftsError && drafts) {
      myDrafts = drafts;
    }
  } catch (error) {
    console.error("Error fetching drafts:", error);
  }

  const draftProgressMap = new Map(
    myDrafts.map(draft => {
      const progress = calculateEvaluationProgress(draft.draft_data);
      return [draft.call_report_id, progress];
    })
  );

  // Determine view
  const currentView = resolvedSearchParams.view === 'completed' ? 'completed' : 'pending';

  // Filter reports based on view
  let filteredReports;
  if (currentView === "pending") {
    filteredReports = callReports.filter(report => !myEvaluatedReportIds.has(report.id));
  } else {
    filteredReports = callReports.filter(report => myEvaluatedReportIds.has(report.id));
  }

  // For completed tab: bulk-fetch story approvals to show mgmt approval status on cards
  const approvalsByReportId = new Map<string, any[]>();
  if (currentView === 'completed' && filteredReports.length > 0) {
    const completedIds = filteredReports.map(r => r.id);
    // No join — story_approvals.user_id FK references auth.users, not public.users
    const { data: rawApprovals } = await supabase
      .from('story_approvals')
      .select('call_report_id, user_id, decision, approver_type')
      .in('call_report_id', completedIds);

    // Fetch user info separately via admin client (bypasses cross-schema FK limitation)
    const approverUserIds = [...new Set((rawApprovals || []).map(a => a.user_id))];
    let userMap: Record<string, { name: string; email: string }> = {};
    if (approverUserIds.length > 0) {
      const adminClient = createAdminClient();
      const { data: approverUsers } = await adminClient
        .from('users')
        .select('id, name, email')
        .in('id', approverUserIds);
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
    const mgmtApproved = approvals.filter(a => a.approver_type === 'management' && a.decision === 'approved').length;
    const mgmtRejected = approvals.filter(a => a.approver_type === 'management' && a.decision === 'rejected').length;
    const thirdApproved = approvals.filter(a => a.approver_type !== 'management' && a.decision === 'approved').length;
    return {
      approvals,
      isFullyApproved: mgmtApproved >= 2 && thirdApproved >= 1,
      isRejected: mgmtRejected > 0,
      managementApproved: mgmtApproved >= 2,
    };
  }

  // Build enriched reports for client component
  const enrichedReports: EnrichedReport[] = filteredReports.map(report => ({
    report,
    hasEvaluated: myEvaluatedReportIds.has(report.id),
    myEvaluation: myEvaluations.find(e => e.call_report_id === report.id) || null,
    draftProgress: draftProgressMap.get(report.id) || null,
    approvalStatus: currentView === 'completed'
      ? computeApprovalStatus(approvalsByReportId.get(report.id) || [])
      : null,
  }));

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Evaluation List</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Select a One-Liner to evaluate and score
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Link
          href="/evaluator/evaluations-list?view=pending"
          className={`w-full sm:w-auto py-2 px-4 rounded-md text-sm font-medium text-center border ${currentView === "pending"
            ? "bg-[#224794] text-white border-[#224794]"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
            }`}
        >
          Pending Evaluations
        </Link>
        <Link
          href="/evaluator/evaluations-list?view=completed"
          className={`w-full sm:w-auto py-2 px-4 rounded-md text-sm font-medium text-center border ${currentView === "completed"
            ? "bg-[#224794] text-white border-[#224794]"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
            }`}
        >
          Completed Evaluations
        </Link>
      </div>

      {/* Pending Evaluations Notification */}
      {currentView === "pending" && (
        <Suspense fallback={<div className="h-24" />}>
          <PendingEvaluationsNotificationEvaluator userId={user.id} userName={user.name} />
        </Suspense>
      )}

      {/* Searchable Evaluations List */}
      <EvaluationSearchableList
        key={currentView}
        reports={enrichedReports}
        portalPrefix="evaluator"
        emptyTitle={currentView === "pending" ? "No pending evaluations" : "No completed evaluations"}
        emptyDescription={currentView === "pending"
          ? "You have no pending evaluations at the moment."
          : "You haven't completed any evaluations yet."}
        showDecisionFilter={currentView === "completed"}
        isTeamHead={isTeamHead}
        currentTeamId={currentTeamId}
        currentUserId={user.id}
        currentUserRole={user.role}
      />
    </div>
  );
}
