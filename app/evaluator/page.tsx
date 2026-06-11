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
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const adminClient = createAdminClient();
  const { data: currentUser } = await adminClient
    .from("users")
    .select("team_id, role")
    .eq("id", userId)
    .single();

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Only admin and management roles see global data; all other roles see their own
  const hasGlobalAccess = ["admin", "management"].includes(currentUser.role);

  // Fetch ALL data in parallel for maximum performance
  const [statsData, pendingData, completedData, productionMetrics, crossTeamSharesData] = await Promise.all([
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
      // One-liner evaluations count — own evals for regular, all for mgmt (adminClient bypasses RLS)
      (async () => {
        if (hasGlobalAccess) {
          return adminClient
            .from("evaluator_forms")
            .select("id", { count: "exact", head: true });
        }
        return adminClient
          .from("evaluator_forms")
          .select("id", { count: "exact", head: true })
          .eq("evaluator_id", userId);
      })(),
      // Pending evaluations count
      supabase.rpc("get_pending_evaluations_count", {
        evaluator_user_id: userId,
        team_id_filter: hasGlobalAccess ? null : currentUser.team_id,
      }),
      // Episode evaluations count — own evals for regular, all for mgmt (adminClient bypasses RLS)
      (async () => {
        if (hasGlobalAccess) {
          return adminClient
            .from("episodic_evaluations")
            .select("id", { count: "exact", head: true });
        }
        return adminClient
          .from("episodic_evaluations")
          .select("id", { count: "exact", head: true })
          .eq("evaluator_id", userId);
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

    // Production metrics - global-access evaluators see all teams
    getProductionMetrics(hasGlobalAccess ? null : currentUser.team_id, currentUser.role),

    // Cross-team shares for this user's team
    (async () => {
      if (!currentUser.team_id) return [];
      const { data: shares } = await supabase
        .from("cross_team_shares")
        .select(`
          id,
          call_report_id,
          status,
          shared_at,
          required_evaluations,
          completed_evaluations,
          notes,
          call_report:call_reports (id, call_report_id, working_title, writer_name, logline),
          from_team:teams!cross_team_shares_from_team_id_fkey (id, name)
        `)
        .eq("to_team_id", currentUser.team_id)
        .neq("status", "cancelled")
        .order("shared_at", { ascending: false });

      if (!shares || shares.length === 0) return [];

      // Check which shares the current user has already evaluated
      const shareIds = shares.map((s) => s.id);
      const { data: myEvals } = await supabase
        .from("evaluator_forms")
        .select("cross_team_share_id")
        .eq("evaluator_id", userId)
        .in("cross_team_share_id", shareIds);

      const evaluatedShareIds = new Set(
        myEvals?.map((e) => e.cross_team_share_id) || []
      );

      return shares.filter((s) => !evaluatedShareIds.has(s.id));
    })(),
  ]);

  // Extract counts from stats data
  const [callReportsRes, completedEvaluationsRes, pendingCountRes, episodeEvaluationsRes] = statsData;
  const callReportsCount = callReportsRes.count || 0;
  const completedEvaluationsCount = completedEvaluationsRes.count || 0;
  const pendingEvaluationsCount = pendingCountRes.data || 0;
  const episodeEvaluationsCount = episodeEvaluationsRes.count || 0;

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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <ModernStatCard
          title="Pending Evaluations"
          value={pendingEvaluationsCount}
          icon={Clock}
          href="/evaluator/evaluations-list?view=pending"
          accent={true}
        />

        <ModernStatCard
          title="One-liner Evaluations"
          value={completedEvaluationsCount}
          icon={CheckCircle2}
          href="/evaluator/evaluations-list?view=completed"
        />

        <ModernStatCard
          title="Episode Evaluations"
          value={episodeEvaluationsCount}
          icon={ClipboardListIcon}
          href="/evaluator/evaluations-list"
        />

        <ModernStatCard
          title="Total Writer Engagement Reports"
          value={callReportsCount}
          icon={FileText}
          href="/evaluator/call-reports"
        />

        {crossTeamSharesData.length > 0 && (
          <ModernStatCard
            title="Cross-Team Shares Tracking"
            value={crossTeamSharesData.length}
            icon={Share2}
            href="/evaluator/evaluations-list"
            accent={true}
          />
        )}
      </div>

      {/* Production Pipeline Metrics */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Production Pipeline</h2>
        <ProductionMetricsCards metrics={productionMetrics} showAllMetrics={true} />
      </div>

      {/* Evaluation Requests Section */}
      {crossTeamSharesData.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Cross-Team Shares Tracking</h2>
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="h-5 w-5 text-purple-600" />
              <p className="text-sm font-medium text-purple-800">
                {crossTeamSharesData.length} cross-team share{crossTeamSharesData.length !== 1 ? "s" : ""} from other teams
              </p>
            </div>
            {crossTeamSharesData.slice(0, 5).map((share: any) => (
              <Link
                key={share.id}
                href={`/evaluator/evaluate/${share.call_report_id}?crossTeamShareId=${share.id}`}
                className="block p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {share.call_report?.working_title || "Untitled Project"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Writer: {share.call_report?.writer_name || "Unknown"}
                    </p>
                    <p className="text-xs text-purple-600 mt-0.5">
                      From {share.from_team?.name || "Unknown team"} &middot; {formatDate(share.shared_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 border-purple-300 text-purple-700 text-xs shrink-0">
                    Evaluate
                  </Badge>
                </div>
              </Link>
            ))}
            {crossTeamSharesData.length > 5 && (
              <div className="text-center pt-1">
                <Link
                  href="/evaluator/evaluations-list"
                  className="text-sm text-purple-700 hover:underline font-medium"
                >
                  View all {crossTeamSharesData.length} cross-team shares →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

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
          subtitle="Select a one-liner to evaluate"
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
