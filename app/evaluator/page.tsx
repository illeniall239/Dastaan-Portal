import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ClipboardListIcon,
  FileTextIcon,
  FileText,
  CheckCircle2,
  Clock,
  CalendarIcon,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PendingEvaluationsNotification } from "@/components/evaluations/pending-evaluations-notification";
import { Suspense } from "react";
import { NotificationSkeleton } from "@/components/skeletons/notification-skeleton";
import { ModernStatCard } from "@/components/dashboard/modern-stat-card";
import { ModernContentCard } from "@/components/dashboard/modern-content-card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDate } from "@/lib/utils/format-date";
import { ProductionMetricsCards } from "@/components/dashboard/production-metrics-cards";
import { getProductionMetrics } from "@/lib/production-metrics/server";
import { TeamBadge } from "@/components/shared/team-badge";

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
    <div className="mobile-container mobile-section space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome back, <span className="text-[#224794]">{user.name}</span>.
          </h1>
          <p className="text-gray-500 mt-1">
            Track your evaluations and pending reviews.
          </p>
        </div>
      </div>

      {/* Pending Evaluations Notification */}
      <Suspense fallback={<NotificationSkeleton />}>
        <PendingEvaluationsNotification userId={user.id} userName={user.name} />
      </Suspense>

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent userId={user.id} />
      </Suspense>
    </div>
  );
}

// Combined Dashboard Content - Fetches all data in parallel
async function DashboardContent({ userId }: { userId: string }) {
  const supabase = await createClient();

  // STEP 1: Get current user's team_id FIRST for team isolation
  const { data: currentUser } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", userId)
    .single();

  if (!currentUser) {
    throw new Error("User not found");
  }

  const hasGlobalAccess = ["admin", "management"].includes(currentUser.role);

  // Fetch ALL data in parallel for maximum performance
  const [statsData, pendingData, completedData, productionMetrics] = await Promise.all([
    // Stats data - WITH TEAM FILTERS
    Promise.all([
      // Total call reports count
      (async () => {
        let query = supabase
          .from("call_reports")
          .select("id", { count: "exact", head: true })
          .eq("meeting_type", "call_report");

        if (!hasGlobalAccess && currentUser.team_id) {
          query = query.eq("team_id", currentUser.team_id);
        }

        return await query;
      })(),
      supabase
        .from("evaluator_forms")
        .select("id", { count: "exact", head: true })
        .eq("evaluator_id", userId),
      // Pending evaluations count
      supabase.rpc("get_pending_evaluations_count", {
        evaluator_user_id: userId,
        team_id_filter: currentUser.team_id,
      }),
      // Upcoming scheduled meetings count
      (async () => {
        const today = new Date().toISOString();
        let query = supabase
          .from("call_reports")
          .select("id", { count: "exact", head: true })
          .eq("meeting_type", "scheduled_meeting")
          .gte("meeting_date", today);

        if (!hasGlobalAccess && currentUser.team_id) {
          query = query.eq("team_id", currentUser.team_id);
        }

        return await query;
      })(),
    ]),

    // Pending evaluations data
    (async () => {
      let allCallReportsQuery = supabase
        .from("call_reports")
        .select(
          `
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
        `
        )
        .eq("meeting_type", "call_report")
        .order("meeting_date", { ascending: false });

      // TEAM ISOLATION: Add team filter
      if (!hasGlobalAccess && currentUser.team_id) {
        allCallReportsQuery = allCallReportsQuery.eq(
          "team_id",
          currentUser.team_id
        );
      }

      const { data: allCallReports } = await allCallReportsQuery;

      const { data: myEvaluations } = await supabase
        .from("evaluator_forms")
        .select("call_report_id")
        .eq("evaluator_id", userId);

      const evaluatedReportIds = new Set(
        myEvaluations?.map((e) => e.call_report_id) || []
      );

      // Process writers and add writer_names array
      const processedReports = (allCallReports || []).map((report: any) => {
        const writers =
          report.call_report_writers
            ?.map((w: any) => w.writer?.name || "")
            .filter(Boolean) || [];
        return {
          ...report,
          writer_names: writers.length > 0 ? writers : undefined,
        };
      });

      return processedReports
        .filter((report) => !evaluatedReportIds.has(report.id))
        .slice(0, 5);
    })(),

    // Completed evaluations data
    supabase
      .from("evaluator_forms")
      .select(
        `
        *,
        call_report:call_report_id (
          id,
          call_report_id,
          working_title,
          writer_name,
          meeting_date,
          team_id,
          team:teams(id, name, team_type)
        )
      `
      )
      .eq("evaluator_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Production metrics - WITH TEAM FILTER (evaluators see only their team)
    getProductionMetrics(currentUser.team_id, currentUser.role),
  ]);

  // Extract counts from stats data
  const [callReportsRes, completedEvaluationsRes, pendingCountRes, scheduledMeetingsRes] = statsData;
  const callReportsCount = callReportsRes.count || 0;
  const completedEvaluationsCount = completedEvaluationsRes.count || 0;
  const pendingEvaluationsCount = pendingCountRes.data || 0;
  const scheduledMeetingsCount = scheduledMeetingsRes.count || 0;

  // Extract completed evaluations
  const completedEvaluations = completedData.data || [];

  const quickActions = [
    {
      icon: FileTextIcon,
      label: "Log Writer Engagement Report",
      description: "Document writer meetings",
      href: "/evaluator/log-call-report",
    },
    {
      icon: CalendarIcon,
      label: "Schedule a Meeting",
      description: "Book meetings on calendar",
      href: "/evaluator/calendar",
    },
    {
      icon: ClipboardListIcon,
      label: "Evaluate Projects",
      description: "Start new evaluations",
      href: "/evaluator/evaluations-list",
    },
    {
      icon: CheckCircle2,
      label: "View Evaluations",
      description: "All projects",
      href: "/evaluator/evaluations-list?view=pending",
    },
  ];

  return (
    <>
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernStatCard
          title="Pending Evaluations"
          value={pendingEvaluationsCount}
          icon={Clock}
          href="/evaluator/evaluations-list?view=pending"
          accent={true}
        />

        <ModernStatCard
          title="Completed Evaluations"
          value={completedEvaluationsCount}
          icon={CheckCircle2}
          href="/evaluator/evaluations-list?view=completed"
        />

        <ModernStatCard
          title="Total Writer Engagement Reports"
          value={callReportsCount}
          icon={FileText}
          href="/evaluator/call-reports"
        />

        <ModernStatCard
          title="Scheduled Meetings"
          value={scheduledMeetingsCount}
          icon={CalendarIcon}
          href="/evaluator/calendar"
        />
      </div>

      {/* Production Pipeline Metrics */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Production Pipeline</h2>
        <ProductionMetricsCards metrics={productionMetrics} showAllMetrics={true} />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <ModernContentCard
          title="Quick Actions"
          subtitle="Common tasks and shortcuts"
        >
          <div className="space-y-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <Icon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </ModernContentCard>

        {/* Pending Evaluations List */}
        <ModernContentCard
          title="Pending Evaluations"
          subtitle="Select a call report to evaluate"
        >
          {pendingData.length > 0 ? (
            <div className="space-y-2">
              {pendingData.map((report, index) => (
                <Link
                  key={report.id}
                  href="/evaluator/evaluations-list?view=pending"
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {report.working_title || "Untitled Project"}
                    </p>
                    {report.team && <TeamBadge team={report.team} size="sm" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {report.writer_names && report.writer_names.length > 1
                      ? `Writers: ${report.writer_names.join(", ")}`
                      : `Writer: ${report.writer_name || "Unknown"}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Logged: {formatDateTime(
                      report.logged_at ||
                      report.created_at ||
                      report.meeting_date ||
                      report.updated_at ||
                      report.inserted_at
                    )}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No pending evaluations. All caught up!
            </p>
          )}
        </ModernContentCard>

        {/* Completed Evaluations */}
        <ModernContentCard
          title="Completed Evaluations"
          subtitle="Your recently completed evaluations"
        >
          {completedEvaluations.length > 0 ? (
            <div className="space-y-3">
              {completedEvaluations.map((evaluation, index) => (
                <div
                  key={evaluation.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {evaluation.call_report?.working_title || "Untitled Project"}
                      </p>
                      {evaluation.call_report?.team && (
                        <TeamBadge team={evaluation.call_report.team} size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Writer: {evaluation.call_report?.writer_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Evaluated: {formatDate(evaluation.created_at)}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex flex-col items-end space-y-2 min-w-[120px]">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-sm font-bold bg-green-100 text-green-800 w-full border border-green-200">
                      {evaluation.average_score.toFixed(1)}/10
                    </span>
                    {evaluation.decision && (
                      <Badge
                        variant={
                          evaluation.decision === "approve"
                            ? "default"
                            : evaluation.decision === "reject"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs w-full justify-center py-1"
                      >
                        {evaluation.decision === "approve"
                          ? "Approved"
                          : evaluation.decision === "reject"
                            ? "Rejected"
                            : "Needs Improvement"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-2 text-center">
                <Link
                  href="/evaluator/evaluations-list?view=completed"
                  className="text-sm text-[#224794] hover:underline font-medium"
                >
                  View all completed →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              You haven&apos;t completed any evaluations yet.
            </p>
          )}
        </ModernContentCard>
      </div>
    </>
  );
}

// Skeleton for Dashboard Content
function DashboardContentSkeleton() {
  return (
    <>
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
          >
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-12 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
          >
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-20 bg-gray-100 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
