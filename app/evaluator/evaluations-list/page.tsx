import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ClipboardListIcon, FileTextIcon, CalendarIcon, UserIcon, CheckCircle2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getAllCallReports } from "@/lib/meetings/server";
import { getEvaluationsByEvaluator } from "@/lib/evaluations/server";
import { format, parseISO } from "date-fns";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";
import { PendingEvaluationsNotificationEvaluator } from "@/components/evaluations/pending-evaluations-notification-evaluator";
import { IndividualEvaluationProgress } from "@/components/evaluations/individual-evaluation-progress";
import { calculateEvaluationProgress, hasDraftData } from "@/lib/evaluations/progress";
import { createClient } from "@/lib/supabase/server";

// Add Next.js caching - revalidate every 30 seconds
export const revalidate = 300; // 5 minutes for better performance

export default async function EvaluatorEvaluationsListPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Ensure user has evaluator role
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

  // Fetch my evaluations to check which call reports I've already evaluated
  let myEvaluations: any[] = [];
  try {
    myEvaluations = await getEvaluationsByEvaluator(user.id);
  } catch (error) {
    console.error("Error fetching my evaluations:", error);
  }
  const myEvaluatedReportIds = new Set(myEvaluations.map(e => e.call_report_id));
  const evaluationIdMap = new Map(myEvaluations.map(e => [e.call_report_id, e.id]));

  // Fetch evaluation drafts to show progress
  const supabase = await createClient();

  // Get current user's team_id for defensive team isolation
  const { data: currentUser } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  const hasGlobalAccess = currentUser?.role && ['admin', 'management'].includes(currentUser.role);

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

  // Create a map of call_report_id -> draft progress
  const draftProgressMap = new Map(
    myDrafts.map(draft => {
      const progress = calculateEvaluationProgress(draft.draft_data);
      return [draft.call_report_id, progress];
    })
  );

  // Determine view based on query parameter
  const currentView = resolvedSearchParams.view === 'completed' ? 'completed' : 'pending';
  
  // Filter reports based on view
  let filteredReports;
  if (currentView === "pending") {
    filteredReports = callReports.filter(report => 
      !myEvaluatedReportIds.has(report.id)
    );
  } else {
    filteredReports = callReports.filter(report => 
      myEvaluatedReportIds.has(report.id)
    );
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Evaluation List</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Select a One-Liner to evaluate and score
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 justify-end">
        <Link
          href="/evaluator/evaluations-list?view=pending"
          className={`py-2 px-4 rounded-md text-sm font-medium border ${
            currentView === "pending"
              ? "bg-[#224794] text-white border-[#224794]"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
          }`}
        >
          Pending Evaluations
        </Link>
        <Link
          href="/evaluator/evaluations-list?view=completed"
          className={`py-2 px-4 rounded-md text-sm font-medium border ${
            currentView === "completed"
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

      {/* Call Reports List */}
      <div className="grid gap-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {currentView === "pending" ? "No pending evaluations" : "No completed evaluations"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                {currentView === "pending" 
                  ? "You have no pending evaluations at the moment." 
                  : "You haven't completed any evaluations yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report: any) => {
            const loggedTimestamp =
              report.logged_at ||
              report.created_at ||
              report.meeting_date ||
              report.updated_at ||
              report.inserted_at;
            const loggedDate = loggedTimestamp ? new Date(loggedTimestamp) : new Date();
            const formattedDate = loggedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const formattedTime = loggedDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            const hasEvaluated = myEvaluatedReportIds.has(report.id);
            const myEvaluation = myEvaluations.find(e => e.call_report_id === report.id);
            const myScore = myEvaluation?.average_score;

            // Get draft progress for this report (only for pending evaluations)
            const draftProgress = draftProgressMap.get(report.id);
            const hasDraft = draftProgress && draftProgress.percentage > 0;

            // Get evaluation progress data
            const internalCompleted = report.completed_evaluations || 0;
            const internalRequired = report.required_evaluations || 5;
            const currentAvg = report.current_average_score;
            const evalStatus = report.evaluation_status;
            const finalDecisionMadeAt = report.final_decision_made_at;

            // Score color helper for progress
            const getScoreColor = (score: number | null) => {
              if (score === null) return "text-gray-600";
              if (score >= 7.0) return "text-green-600";
              if (score >= 5.0) return "text-yellow-600";
              return "text-red-600";
            };

            const getScoreIcon = (score: number | null) => {
              if (score === null) return <Minus className="h-4 w-4" />;
              if (score >= 7.0) return <TrendingUp className="h-4 w-4 text-green-600" />;
              if (score >= 5.0) return <Minus className="h-4 w-4 text-yellow-600" />;
              return <TrendingDown className="h-4 w-4 text-red-600" />;
            };

            // Score badge color for my evaluation
            const getMyScoreBadgeColor = (score: number) => {
              if (score >= 8) return "bg-green-100 text-green-800 border-green-300";
              if (score >= 6) return "bg-yellow-100 text-yellow-800 border-yellow-300";
              return "bg-red-100 text-red-800 border-red-300";
            };

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{report.title || report.working_title || "Untitled"}</CardTitle>
                        {hasEvaluated && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Evaluated
                          </span>
                        )}
                        {!hasEvaluated && hasDraft && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-300">
                            Draft ({draftProgress.percentage}%)
                          </span>
                        )}
                      </div>
                      {/* Individual evaluation progress bar for drafts */}
                      {!hasEvaluated && hasDraft && (
                        <div className="mt-3 mb-2">
                          <IndividualEvaluationProgress progressPercentage={draftProgress.percentage} />
                        </div>
                      )}
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>
                            {report.writer_names && report.writer_names.length > 1
                              ? `Writers: ${report.writer_names.join(", ")}`
                              : `Writer: ${report.writer_name || "N/A"}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileTextIcon className="h-4 w-4" />
                          <span>Call Report: {report.call_report_id || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formattedDate} at {formattedTime}</span>
                        </div>
                      </div>
                    </div>
                    {hasEvaluated && myScore !== undefined && (
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold border-2 ${getMyScoreBadgeColor(myScore)}`}>
                          {myScore.toFixed(1)}/10
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Your Score</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Evaluation Progress */}
                  {evalStatus && ["pending", "in_progress", "completed", "completed_after_deadline"].includes(evalStatus) && (
                    <div className="bg-slate-50 rounded-lg p-3 border mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold">Evaluation Progress</p>
                          <Badge variant="outline" className="text-xs font-bold">
                            {internalCompleted}/{internalRequired}
                          </Badge>
                          {/* Decision badge */}
                          {finalDecisionMadeAt && (
                            <Badge className="text-xs bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Decided
                            </Badge>
                          )}
                        </div>
                        {currentAvg !== null && currentAvg !== undefined && (
                          <div className={`flex items-center gap-1.5 text-sm font-semibold ${getScoreColor(currentAvg)}`}>
                            {getScoreIcon(currentAvg)}
                            <span>{currentAvg.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <EvaluationProgressBar
                        completed={internalCompleted}
                        total={internalRequired}
                        internalCompleted={internalCompleted}
                        externalCompleted={0}
                        internalRequired={internalRequired}
                        externalRequired={0}
                        showLabels={false}
                      />
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {report.logline && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Logline:</p>
                        <p className="text-sm line-clamp-2">{report.logline}</p>
                      </div>
                    )}
                    {report.category && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Category:</p>
                        <p className="text-sm capitalize">{report.category.replace("_", " ")}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    {hasEvaluated ? (
                      <Button size="sm" asChild variant="outline">
                        <Link href={`/evaluator/my-evaluations/${myEvaluation?.id}`}>
                          <FileTextIcon className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" asChild className="bg-[#224794] hover:bg-[#1a3670]">
                        <Link href={`/evaluator/evaluate/${report.id}`}>
                          <ClipboardListIcon className="h-4 w-4 mr-2" />
                          {hasDraft ? 'Continue Evaluation' : 'Evaluate This Project'}
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}