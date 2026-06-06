import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllCallReports, type CallReportWithRelations } from "@/lib/meetings/server";
import { getEvaluationsByEvaluator, getAllProgrammerEvaluationsGrouped, getTeamEvaluationsGrouped } from "@/lib/evaluations/server";
import { calculateEvaluationProgress } from "@/lib/evaluations/progress";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Determine if this programmer is on a management team (restricted: own team's evaluations only)
  // Use admin client to bypass RLS on teams table
  const adminClient = createAdminClient();
  const { data: userProfile } = await adminClient
    .from("users")
    .select("team_id")
    .eq("id", user.id)
    .single();

  let isRestrictedProgrammer = false;
  if (user.role === "programmer" && userProfile?.team_id) {
    const { data: team } = await adminClient
      .from("teams")
      .select("team_type")
      .eq("id", userProfile.team_id)
      .single();
    isRestrictedProgrammer = team?.team_type === "management";
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

  // Fetch evaluations grouped by call_report_id
  // Restricted programmers (management-team) see only their own team's evaluations
  // Regular programmers see all programmer-role evaluations across all teams
  let teamEvaluationsMap = new Map<string, Array<{ evaluator_id: string; evaluator_name: string; average_score: number | null; decision: string | null }>>();
  try {
    teamEvaluationsMap = isRestrictedProgrammer && userProfile?.team_id
      ? await getTeamEvaluationsGrouped(userProfile.team_id)
      : await getAllProgrammerEvaluationsGrouped();
  } catch (error) {
    console.error("Error fetching team evaluations:", error);
  }
  const evaluatedByTeamReportIds = new Set(teamEvaluationsMap.keys());

  // Fetch evaluation drafts

  interface DraftData {
    call_report_id: string;
    draft_data: Record<string, unknown>;
  }

  let myDrafts: DraftData[] = [];
  try {
    const supabase = await createClient();
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
  const currentFilter = resolvedSearchParams.filter === 'evaluated' ? 'evaluated' : 'all';

  // Filter reports
  let filteredReports;
  if (currentFilter === "evaluated") {
    filteredReports = callReports.filter(report => evaluatedByTeamReportIds.has(report.id));
  } else {
    filteredReports = callReports;
  }

  // Build enriched reports
  const enrichedReports: EnrichedReport[] = filteredReports.map(report => ({
    report,
    hasEvaluated: myEvaluatedReportIds.has(report.id),
    myEvaluation: myEvaluations.find(e => e.call_report_id === report.id) || null,
    draftProgress: draftProgressMap.get(report.id) || null,
    teamEvaluations: teamEvaluationsMap.get(report.id) ?? null,
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
          href="/programmer/evaluations-list?filter=evaluated"
          className={`w-full sm:w-auto py-2 px-4 rounded-md text-sm font-medium text-center border ${currentFilter === "evaluated"
            ? "bg-[#224794] text-white border-[#224794]"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
            }`}
        >
          Evaluated ({evaluatedByTeamReportIds.size})
        </Link>
      </div>

      {/* Searchable Evaluations List */}
      <EvaluationSearchableList
        key={currentFilter}
        reports={enrichedReports}
        portalPrefix="programmer"
        emptyTitle="No projects found"
        emptyDescription="There are no one-liners available at the moment."
        showDecisionFilter={currentFilter === "evaluated"}
      />
    </div>
  );
}
