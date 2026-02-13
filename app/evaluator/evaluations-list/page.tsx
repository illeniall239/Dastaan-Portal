import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ClipboardListIcon, FileTextIcon, CalendarIcon, UserIcon, Share2 } from "lucide-react";
import { getAllCallReports } from "@/lib/meetings/server";
import { getEvaluationsByEvaluator } from "@/lib/evaluations/server";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";
import { PendingEvaluationsNotificationEvaluator } from "@/components/evaluations/pending-evaluations-notification-evaluator";
import { calculateEvaluationProgress } from "@/lib/evaluations/progress";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/back-button";
import { EvaluationSearchableList, type EnrichedReport } from "@/components/evaluations/evaluation-searchable-list";

// Add Next.js caching - revalidate every 5 minutes
export const revalidate = 300;

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

  // Fetch cross-team shared call reports
  let crossTeamShares: any[] = [];
  if (currentUser?.team_id) {
    try {
      const { data: shares } = await supabase
        .from('cross_team_shares')
        .select(`
          id,
          call_report_id,
          from_team_id,
          status,
          shared_at,
          notes,
          required_evaluations,
          completed_evaluations,
          from_team:teams!cross_team_shares_from_team_id_fkey (id, name),
          call_report:call_reports (
            id,
            call_report_id,
            working_title,
            writer_name,
            logline,
            category,
            created_at
          )
        `)
        .eq('to_team_id', currentUser.team_id)
        .in('status', ['pending', 'in_progress']);

      if (shares) {
        const { data: myShareEvals } = await supabase
          .from('evaluator_forms')
          .select('cross_team_share_id')
          .eq('evaluator_id', user.id)
          .not('cross_team_share_id', 'is', null);

        const evaluatedShareIds = new Set((myShareEvals || []).map((e: any) => e.cross_team_share_id));
        crossTeamShares = shares.filter((s: any) => !evaluatedShareIds.has(s.id));
      }
    } catch (error) {
      console.error('Error fetching cross-team shares:', error);
    }
  }

  // Determine view
  const currentView = resolvedSearchParams.view === 'completed' ? 'completed' : 'pending';

  // Filter reports based on view
  let filteredReports;
  if (currentView === "pending") {
    filteredReports = callReports.filter(report => !myEvaluatedReportIds.has(report.id));
  } else {
    filteredReports = callReports.filter(report => myEvaluatedReportIds.has(report.id));
  }

  // Build enriched reports for client component
  const enrichedReports: EnrichedReport[] = filteredReports.map(report => ({
    report,
    hasEvaluated: myEvaluatedReportIds.has(report.id),
    myEvaluation: myEvaluations.find(e => e.call_report_id === report.id) || null,
    draftProgress: draftProgressMap.get(report.id) || null,
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

      {/* Evaluation Requests from Other Teams */}
      {currentView === "pending" && crossTeamShares.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-purple-900">Evaluation Requests</h2>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {crossTeamShares.length}
            </Badge>
          </div>
          <div className="grid gap-3">
            {crossTeamShares.map((share: any) => (
              <Card key={share.id} className="border-purple-200 bg-purple-50/30 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{share.call_report?.working_title || 'Untitled'}</CardTitle>
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                          Requested by {share.from_team?.name || 'Unknown Team'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>Writer: {share.call_report?.writer_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileTextIcon className="h-4 w-4" />
                          <span>Call Report: {share.call_report?.call_report_id || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>Shared: {new Date(share.shared_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {share.completed_evaluations}/{share.required_evaluations} evaluations
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {share.notes && (
                    <div className="mb-3 text-sm text-purple-700 bg-purple-50 p-2 rounded border border-purple-200">
                      {share.notes}
                    </div>
                  )}
                  {share.call_report?.logline && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-muted-foreground">Logline:</p>
                      <p className="text-sm line-clamp-2">{share.call_report.logline}</p>
                    </div>
                  )}
                  <div className="flex justify-end pt-3 border-t">
                    <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-700">
                      <Link href={`/evaluator/evaluate/${share.call_report?.id}?crossTeamShareId=${share.id}`}>
                        <ClipboardListIcon className="h-4 w-4 mr-2" />
                        Evaluate
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
      />
    </div>
  );
}
