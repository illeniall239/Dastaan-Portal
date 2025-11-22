import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
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
import { PlusIcon, FileTextIcon, TrendingUp, TrendingDown, Minus, EyeIcon, FilePenLine } from "lucide-react";
import { getAllCallReports } from "@/lib/meetings/server";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";
import { Suspense } from "react";
import { CallReportCardsGridSkeleton } from "@/components/skeletons/call-report-card-skeleton";
import { BackButton } from "@/components/ui/back-button";

// Add Next.js caching - revalidate every 5 minutes (300 seconds)
// This significantly improves navigation speed by caching call reports list
export const revalidate = 300;

export default async function EvaluatorCallReportsPage() {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Ensure user has evaluator role
  if (user.role !== "evaluator") {
    redirect("/unauthorized");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <BackButton fallbackHref="/evaluator" variant="outline" size="sm" />

      {/* Page Header - Static, shows immediately */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Writer Engagement Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            View all logged writer engagement reports
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button asChild className="bg-[#224794] hover:bg-[#1a3670] touch-target flex-1 sm:flex-none">
            <Link href="/evaluator/log-call-report">
              <PlusIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Log New Writer Engagement Report</span>
              <span className="sm:hidden">Log New Report</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="touch-target flex-1 sm:flex-none">
            <Link href="/evaluator/log-detailed-one-liner">
              <FilePenLine className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Log Detailed One-Liner</span>
              <span className="sm:hidden">Log One-Liner</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Call Reports List - Show skeleton while fetching */}
      <Suspense fallback={<CallReportCardsGridSkeleton count={3} />}>
        <CallReportsList />
      </Suspense>
    </div>
  );
}

// Call Reports List Component - Fetches data
async function CallReportsList() {
  // Fetch all call reports
  let callReports: any[] = [];
  try {
    callReports = await getAllCallReports();
  } catch (error) {
    console.error("Error fetching call reports:", error);
  }

  return (
    <div className="grid gap-4">
      {callReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No writer engagement reports yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Start by logging your first writer engagement report.
            </p>
            <Button asChild>
              <Link href="/evaluator/log-call-report">
                <PlusIcon className="h-4 w-4 mr-2" />
                Log Your First Writer Engagement Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        callReports.map((report: any) => {
            const loggedDate = new Date(report.meeting_date);
            const formattedDate = loggedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const writerDisplayName =
              report.writer_names && report.writer_names.length > 0
                ? report.writer_names.join(", ")
                : report.writer_name || "Unknown writer";

            // Get evaluation progress data
            const completed = report.completed_evaluations || 0;
            const total = report.required_evaluators || 5;
            const internalCompleted = report.completed_internal_evaluations || 0;
            const externalCompleted = report.completed_external_evaluations || 0;
            const internalRequired = report.required_internal_evaluators || 5;
            const externalRequired = report.required_external_evaluators || 0;
            const currentAvg = report.current_average_score;
            const evalStatus = report.evaluation_status;

            // Score color helper
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

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{report.title}</CardTitle>
                        {evalStatus && (
                          <Badge
                            variant={
                              evalStatus === "accepted"
                                ? "default"
                                : evalStatus === "rejected"
                                ? "destructive"
                                : evalStatus === "needs_improvement"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {evalStatus.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        Writers: {writerDisplayName}
                      </CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Logged: {formattedDate}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Evaluation Progress - Show if in evaluation */}
                    {evalStatus && ["pending", "in_progress", "completed", "completed_after_deadline"].includes(evalStatus) && (
                      <div className="bg-slate-50 rounded-lg p-4 border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">Evaluation Progress</p>
                            <Badge variant="outline" className="text-xs">
                              {internalCompleted}/{internalRequired} Required
                            </Badge>
                            {externalRequired > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                +{externalCompleted}/{externalRequired} Optional
                              </Badge>
                            )}
                          </div>
                          {currentAvg !== null && currentAvg !== undefined && (
                            <div className={`flex items-center gap-1.5 text-sm font-semibold ${getScoreColor(currentAvg)}`}>
                              {getScoreIcon(currentAvg)}
                              <span>{currentAvg.toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground font-normal">avg</span>
                            </div>
                          )}
                        </div>
                        <EvaluationProgressBar
                          completed={completed}
                          total={total}
                          internalCompleted={internalCompleted}
                          externalCompleted={externalCompleted}
                          internalRequired={internalRequired}
                          externalRequired={externalRequired}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      {report.logline && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Logline:</p>
                          <p className="text-sm line-clamp-2">{report.logline}</p>
                        </div>
                      )}
                      {report.attendees && report.attendees.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Attendees:</p>
                          <p className="text-sm">{report.attendees.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/evaluator/call-reports/${report.id}`}>
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                    <Button variant="default" size="sm" asChild>
                      <Link href={`/evaluator/call-reports/${report.id}/detailed-one-liner`}>
                        <FilePenLine className="h-4 w-4 mr-2" />
                        Detailed One-Liner
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
        })
      )}
    </div>
  );
}