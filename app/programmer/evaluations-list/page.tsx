import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllCallReports, type CallReportWithRelations } from "@/lib/meetings/server";
import { getEvaluationsByEvaluator } from "@/lib/evaluations/server";
import { calculateEvaluationProgress } from "@/lib/evaluations/progress";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/back-button";
import { EvaluationSearchableList, type EnrichedReport } from "@/components/evaluations/evaluation-searchable-list";

// Add Next.js caching - revalidate every 5 minutes
export const revalidate = 300;

export default async function ProgrammerEvaluationsListPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!["programmer", "management", "admin"].includes(user.role)) {
    redirect("/unauthorized");
  }

  interface EvaluationData {
    id: string;
    call_report_id: string;
    average_score?: number;
    decision?: 'approve' | 'reject' | 'needs_improvement';
  }

  // Fetch all call reports (programmers see ALL teams)
  let callReports: CallReportWithRelations[] = [];
  try {
    callReports = await getAllCallReports();
  } catch (error) {
    console.error("Error fetching call reports:", error);
  }

  // Fetch my evaluations
  let myEvaluations: EvaluationData[] = [];
  try {
    myEvaluations = await getEvaluationsByEvaluator(user.id);
  } catch (error) {
    console.error("Error fetching my evaluations:", error);
  }
  const myEvaluatedReportIds = new Set(myEvaluations.map(e => e.call_report_id));

  // Fetch evaluation drafts
  const supabase = await createClient();

  interface DraftData {
    call_report_id: string;
    draft_data: Record<string, unknown>;
  }

  let myDrafts: DraftData[] = [];
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

  // Determine filter
  const currentFilter = resolvedSearchParams.filter === 'mine' ? 'mine' : 'all';

  // Filter reports
  let filteredReports;
  if (currentFilter === "mine") {
    filteredReports = callReports.filter(report => myEvaluatedReportIds.has(report.id));
  } else {
    filteredReports = callReports;
  }

  // Build enriched reports
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
        <BackButton fallbackHref="/programmer" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Evaluation List</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View and evaluate One-Liners across all teams
          </p>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Link
          href="/programmer/evaluations-list?filter=all"
          className={`w-full sm:w-auto py-2 px-4 rounded-md text-sm font-medium text-center border ${currentFilter === "all"
            ? "bg-[#224794] text-white border-[#224794]"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
            }`}
        >
          All Projects
        </Link>
        <Link
          href="/programmer/evaluations-list?filter=mine"
          className={`w-full sm:w-auto py-2 px-4 rounded-md text-sm font-medium text-center border ${currentFilter === "mine"
            ? "bg-[#224794] text-white border-[#224794]"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
            }`}
        >
          My Evaluations ({myEvaluations.length})
        </Link>
      </div>

      {/* Searchable Evaluations List */}
      <EvaluationSearchableList
        key={currentFilter}
        reports={enrichedReports}
        portalPrefix="programmer"
        emptyTitle="No projects found"
        emptyDescription="There are no one-liners available at the moment."
        showDecisionFilter={currentFilter === "mine"}
      />
    </div>
  );
}
