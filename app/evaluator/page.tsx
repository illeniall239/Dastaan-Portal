import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  ClipboardListIcon,
  FileTextIcon,
  CheckCircle2,
  Clock,
  CalendarIcon
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { PendingEvaluationsNotification } from "@/components/evaluations/pending-evaluations-notification";
import { Suspense } from "react";
import { NotificationSkeleton } from "@/components/skeletons/notification-skeleton";
import { Button } from "@/components/ui/button";

// Add Next.js caching - revalidate every 5 minutes (300 seconds)
// This significantly improves navigation speed by caching dashboard data
export const revalidate = 300;

export default async function EvaluatorDashboard() {
  // Auth is handled by layout - no need to duplicate here
  const user = await getCurrentUser();

  // Layout already validates role, but we need user data for the page
  if (!user) {
    redirect("/login"); // Fallback safety check
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header - Static, shows immediately */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, <span className="text-[#224794]">{user.name}</span>.</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track your evaluations and pending reviews.
          </p>
        </div>
      </div>

      {/* Pending Evaluations Notification - Show skeleton while fetching */}
      <Suspense fallback={<NotificationSkeleton />}>
        <PendingEvaluationsNotification userId={user.id} userName={user.name} />
      </Suspense>

      {/* Dashboard Content - Stats + Cards fetched in parallel */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent userId={user.id} />
      </Suspense>
    </div>
  );
}

// Combined Dashboard Content - Fetches all data in parallel
async function DashboardContent({ userId }: { userId: string }) {
  const supabase = await createClient();

  // Fetch ALL data in parallel for maximum performance
  const [statsData, pendingData, completedData] = await Promise.all([
    // Stats data
    Promise.all([
      supabase
        .from("call_reports")
        .select("id", { count: "exact", head: true })
        .eq("meeting_type", "call_report"),
      supabase
        .from("evaluator_forms")
        .select("id", { count: "exact", head: true })
        .eq("evaluator_id", userId),
      supabase.rpc("get_pending_evaluations_count", { evaluator_user_id: userId })
    ]),

    // Pending evaluations data
    (async () => {
      const { data: allCallReports } = await supabase
        .from("call_reports")
        .select(`
          id,
          call_report_id,
          working_title,
          writer_name,
          meeting_date,
          logline,
          call_report_writers:call_report_writers (
            writer_id,
            writer_email,
            writer_phone,
            display_order,
            writer:writers(name)
          )
        `)
        .eq("meeting_type", "call_report")
        .order("meeting_date", { ascending: false });

      const { data: myEvaluations } = await supabase
        .from("evaluator_forms")
        .select("call_report_id")
        .eq("evaluator_id", userId);

      const evaluatedReportIds = new Set(myEvaluations?.map(e => e.call_report_id) || []);

      // Process writers and add writer_names array
      const processedReports = (allCallReports || []).map((report: any) => {
        const writers = report.call_report_writers?.map((w: any) => w.writer?.name || "").filter(Boolean) || [];
        return {
          ...report,
          writer_names: writers.length > 0 ? writers : undefined,
        };
      });

      return processedReports.filter(
        report => !evaluatedReportIds.has(report.id)
      ).slice(0, 5);
    })(),

    // Completed evaluations data
    supabase
      .from("evaluator_forms")
      .select(`
        *,
        call_report:call_report_id (
          id,
          call_report_id,
          working_title,
          writer_name,
          meeting_date
        )
      `)
      .eq("evaluator_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  // Extract counts from stats data
  const [callReportsRes, completedEvaluationsRes, pendingCountRes] = statsData;
  const callReportsCount = callReportsRes.count || 0;
  const completedEvaluationsCount = completedEvaluationsRes.count || 0;
  const pendingEvaluationsCount = pendingCountRes.data || 0;

  // Extract completed evaluations
  const completedEvaluations = completedData.data || [];

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/evaluator/evaluations-list?view=pending">
          <div className="cursor-pointer">
            <StatCard
              title="Pending One-liner Evaluations"
              value={pendingEvaluationsCount}
              icon="Clock"
              variant="primary"
            />
          </div>
        </Link>
        <Link href="/evaluator/evaluations-list?view=completed">
          <div className="cursor-pointer">
            <StatCard
              title="Completed Evaluations"
              value={completedEvaluationsCount}
              icon="CheckCircle2"
            />
          </div>
        </Link>
        <Link href="/evaluator/call-reports">
          <div className="cursor-pointer">
            <StatCard
              title="Total Writer Engagement Reports"
              value={callReportsCount}
              icon="FileText"
            />
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column - Quick Actions - Static */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6 flex flex-col">
          <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-slate-600 text-sm">
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 sm:p-6 pt-0">
              <Link href="/evaluator/log-call-report">
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '0ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#8b5cf6] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#8b5cf6] transition-colors">Log Writer Engagement Report</p>
                    <p className="text-xs text-slate-500">Document writer meetings</p>
                  </div>
                </div>
              </Link>
              <Link href="/evaluator/calendar">
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '50ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#f59e0b] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#f59e0b] transition-colors">Schedule a Meeting</p>
                    <p className="text-xs text-slate-500">Book meetings on calendar</p>
                  </div>
                </div>
              </Link>
              <Link href="/evaluator/evaluations-list">
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '100ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#224794] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <ClipboardListIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#224794] transition-colors">Evaluate Projects</p>
                    <p className="text-xs text-slate-500">Start new evaluations</p>
                  </div>
                </div>
              </Link>
              <Link href="/evaluator/evaluations-list?view=pending">
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '150ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#10b981] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#10b981] transition-colors">View Evaluations</p>
                    <p className="text-xs text-slate-500">All projects</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Pending & Completed Evaluations */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 flex flex-col">
          {/* Pending Evaluations Card */}
          <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Pending Evaluations</CardTitle>
                  <CardDescription className="text-slate-600">
                    Select a call report to evaluate and score
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingData.length > 0 ? (
                <div className="space-y-4">
                  {pendingData.map((report, index) => (
                    <div key={report.id} className="p-3 rounded-lg hover:bg-slate-50 transition-colors border animate-stagger" style={{ animationDelay: `${index * 75}ms` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {report.working_title || "Untitled Project"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {report.writer_names && report.writer_names.length > 1
                              ? `Writers: ${report.writer_names.join(", ")}`
                              : `Writer: ${report.writer_name || "Unknown"}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Logged: {new Date(report.meeting_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/evaluator/evaluations-list?view=pending`}>
                            View All
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending evaluations. All caught up!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Completed Evaluations Card */}
          <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Completed Evaluations</CardTitle>
              <CardDescription className="text-slate-600">
                Your recently completed evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedEvaluations.length > 0 ? (
                <div className="space-y-4">
                  {completedEvaluations.map((evaluation, index) => (
                    <div key={evaluation.id} className="p-3 rounded-lg hover:bg-slate-50 transition-colors border animate-stagger" style={{ animationDelay: `${index * 75}ms` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {evaluation.call_report?.working_title || "Untitled Project"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Writer: {evaluation.call_report?.writer_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Evaluated: {new Date(evaluation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold border-2 bg-blue-100 text-blue-800 border-blue-300">
                            {evaluation.average_score.toFixed(1)}/10
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Your Score</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-center">
                    <Link href="/evaluator/evaluations-list?view=completed" className="text-sm text-[#224794] hover:underline">
                      View all completed evaluations →
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  You haven&apos;t completed any evaluations yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// Skeleton for Dashboard Content
function DashboardContentSkeleton() {
  return (
    <>
      {/* Stats Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Quick Actions Card Skeleton */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card p-6 shadow-sm h-full">
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-slate-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending & Completed Cards Skeleton */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-slate-200 rounded animate-pulse mb-4"></div>
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

