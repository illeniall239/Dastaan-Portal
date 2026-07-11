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
  Globe,
  Film,
  BookOpen,
  ListChecks,
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
export const revalidate = 300;

export default async function ProgrammerDashboard() {
  // Auth is handled by layout - no need to duplicate here
  const user = await getCurrentUser();

  // Layout already validates role, but we need user data for the page
  if (!user) {
    redirect("/login"); // Fallback safety check
  }

  return (
    <div className="mobile-container mobile-section space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome back, <span className="text-[#224794]">{user.name}</span>.
          </h1>
        </div>
      </div>

      {/* Pending Evaluations Notification */}
      <Suspense fallback={<NotificationSkeleton />}>
        <PendingEvaluationsNotification userId={user.id} userName={user.name} />
      </Suspense>

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent userId={user.id} userRole={user.role} />
      </Suspense>
    </div>
  );
}

// Combined Dashboard Content - Fetches all data in parallel
async function DashboardContent({ userId, userRole }: { userId: string; userRole: string }) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Resolve team info via admin client (bypasses RLS on teams table)
  const { data: userProfile } = await adminClient
    .from("users")
    .select("team_id")
    .eq("id", userId)
    .single();

  let isRestrictedProgrammer = false;
  let teamMemberIds: string[] = [userId];
  const teamId = userProfile?.team_id ?? null;

  if (userRole === "programmer" && teamId) {
    const { data: team } = await adminClient
      .from("teams")
      .select("team_type")
      .eq("id", teamId)
      .single();
    if (team?.team_type === "management") {
      isRestrictedProgrammer = true;
      const { data: members } = await adminClient
        .from("users")
        .select("id")
        .eq("team_id", teamId);
      teamMemberIds = (members || []).map((m: any) => m.id);
    }
  }

  // For regular programmers: fetch content dev team member IDs to exclude from stats
  let contentDevUserIds: string[] = [];
  if (!isRestrictedProgrammer && userRole === "programmer") {
    const { data: mgmtTeams } = await adminClient.from("teams").select("id").eq("team_type", "management");
    if (mgmtTeams && mgmtTeams.length > 0) {
      const { data: cdUsers } = await adminClient.from("users").select("id").in("team_id", mgmtTeams.map((t: any) => t.id));
      contentDevUserIds = (cdUsers || []).map((u: any) => u.id);
    }
  }

  // Fetch ALL data in parallel
  const [statsData, recentCallReports, recentEvaluations, productionMetrics] = await Promise.all([
    Promise.all([
      // Total call reports count
      (async () => {
        let q = supabase
          .from("call_reports")
          .select("id", { count: "exact", head: true })
          .eq("meeting_type", "call_report");
        if (isRestrictedProgrammer && teamId) q = q.eq("team_id", teamId);
        return q;
      })(),
      // Total one-liner evaluations count — programmer team only (adminClient bypasses RLS)
      (async () => {
        if (isRestrictedProgrammer) {
          return adminClient
            .from("evaluator_forms")
            .select("id", { count: "exact", head: true })
            .in("evaluator_id", teamMemberIds);
        }
        let q = adminClient
          .from("evaluator_forms")
          .select(`id, evaluator:users!evaluator_id!inner(role)`, { count: "exact", head: true })
          .eq("evaluator.role", "programmer");
        if (contentDevUserIds.length > 0) {
          q = q.not("evaluator_id", "in", `(${contentDevUserIds.join(",")})`);
        }
        return q;
      })(),
      // Total episode evaluations count — programmer team only (adminClient bypasses RLS)
      (async () => {
        if (isRestrictedProgrammer) {
          return adminClient
            .from("episodic_evaluations")
            .select("id", { count: "exact", head: true })
            .in("evaluator_id", teamMemberIds);
        }
        let q = adminClient
          .from("episodic_evaluations")
          .select(`id, evaluator:users!evaluator_id!inner(role)`, { count: "exact", head: true })
          .eq("evaluator.role", "programmer");
        if (contentDevUserIds.length > 0) {
          q = q.not("evaluator_id", "in", `(${contentDevUserIds.join(",")})`);
        }
        return q;
      })(),
      // Total episodes across all projects
      (async () => {
        let q = adminClient
          .from("consolidated_cms_view")
          .select("total_episodes, received_episodes");
        if (isRestrictedProgrammer && teamId) q = q.eq("team_id", teamId);
        return q;
      })(),
      // One-liner evaluation status breakdown (submitted vs pending)
      (async () => {
        if (isRestrictedProgrammer) {
          return adminClient
            .from("evaluator_forms")
            .select("submitted_at, call_report_id")
            .in("evaluator_id", teamMemberIds);
        }
        let q = adminClient
          .from("evaluator_forms")
          .select("submitted_at, call_report_id, evaluator:users!evaluator_id!inner(role)")
          .eq("evaluator.role", "programmer");
        if (contentDevUserIds.length > 0) {
          q = q.not("evaluator_id", "in", `(${contentDevUserIds.join(",")})`);
        }
        return q;
      })(),
      // Episodic evaluation status breakdown (submitted vs pending)
      (async () => {
        if (isRestrictedProgrammer) {
          return adminClient
            .from("episodic_evaluations")
            .select("submitted_at")
            .in("evaluator_id", teamMemberIds);
        }
        let q = adminClient
          .from("episodic_evaluations")
          .select("submitted_at, evaluator:users!evaluator_id!inner(role)")
          .eq("evaluator.role", "programmer");
        if (contentDevUserIds.length > 0) {
          q = q.not("evaluator_id", "in", `(${contentDevUserIds.join(",")})`);
        }
        return q;
      })(),
    ]),

    // Recent call reports
    (async () => {
      let q = supabase
        .from("call_reports")
        .select(`
          id, call_report_id, working_title, writer_name, meeting_date, logline,
          call_report_writers:call_report_writers (
            writer_id, writer_email, writer_phone, display_order, writer:writers(name)
          )
        `)
        .eq("meeting_type", "call_report")
        .order("meeting_date", { ascending: false })
        .limit(5);
      if (isRestrictedProgrammer && teamId) q = q.eq("team_id", teamId);
      return q;
    })(),

    // Recent evaluations (team-scoped for restricted, all programmers for regular)
    (async () => {
      if (isRestrictedProgrammer) {
        return supabase
          .from("evaluator_forms")
          .select(`
            *,
            call_report:call_report_id (
              id, call_report_id, working_title, writer_name, meeting_date, team_id,
              team:teams(id, name, team_type)
            ),
            evaluator:users!evaluator_id (name)
          `)
          .in("evaluator_id", teamMemberIds)
          .order("created_at", { ascending: false })
          .limit(5);
      }
      let q = supabase
        .from("evaluator_forms")
        .select(`
          *,
          call_report:call_report_id (
            id, call_report_id, working_title, writer_name, meeting_date, team_id,
            team:teams(id, name, team_type)
          ),
          evaluator:users!evaluator_id!inner (name, role)
        `)
        .eq("evaluator.role", "programmer")
        .order("created_at", { ascending: false })
        .limit(5);
      if (contentDevUserIds.length > 0) {
        q = q.not("evaluator_id", "in", `(${contentDevUserIds.join(",")})`);
      }
      return q;
    })(),

    // Production metrics
    isRestrictedProgrammer && teamId ? getProductionMetrics(teamId, userRole) : getProductionMetrics(),
  ]);

  // Extract counts from stats data
  const [
    callReportsRes,
    totalOneLinerEvaluationsRes,
    totalEpisodeEvaluationsRes,
    episodeStatsRes,
    oneLinerBreakdownRes,
    epEvalBreakdownRes,
  ] = statsData;
  const callReportsCount = callReportsRes.count || 0;
  const totalOneLinerEvaluationsCount = totalOneLinerEvaluationsRes.count || 0;
  const totalEpisodeEvaluationsCount = totalEpisodeEvaluationsRes.count || 0;

  // Episode totals
  const episodeData = (episodeStatsRes.data || []) as any[];
  const totalEpisodesAvailable = episodeData.reduce((s: number, r: any) => s + (r.total_episodes || 0), 0);
  const totalEpisodesReceived = episodeData.reduce((s: number, r: any) => s + (r.received_episodes || 0), 0);

  // One-liner breakdown
  const oneLinerData = (oneLinerBreakdownRes.data || []) as any[];
  const oneLinersEvaluated = oneLinerData.filter((e: any) => e.submitted_at).length;
  const oneLinersPending = oneLinerData.filter((e: any) => !e.submitted_at).length;
  const uniqueOneLinersUploaded = new Set(oneLinerData.map((e: any) => e.call_report_id)).size;

  // Episode evaluation breakdown
  const epEvalData = (epEvalBreakdownRes.data || []) as any[];
  const episodesEvaluated = epEvalData.filter((e: any) => e.submitted_at).length;
  const episodesNotEvaluated = epEvalData.filter((e: any) => !e.submitted_at).length;

  // Process recent call reports
  const processedReports = (recentCallReports.data || []).map((report: any) => {
    const writers =
      report.call_report_writers
        ?.map((w: any) => w.writer?.name || "")
        .filter(Boolean) || [];
    return {
      ...report,
      writer_names: writers.length > 0 ? writers : undefined,
    };
  });

  const recentEvaluationsData = recentEvaluations.data || [];

  const quickActions = [
    {
      icon: FileTextIcon,
      label: "Log Writer Engagement Report",
      description: "Document writer meetings",
      href: "/programmer/log-call-report",
    },
    {
      icon: CalendarIcon,
      label: "Schedule a Meeting",
      description: "Book meetings on calendar",
      href: "/programmer/calendar",
    },
    {
      icon: ClipboardListIcon,
      label: "Evaluate Projects",
      description: "Start new evaluations",
      href: "/programmer/evaluations-list",
    },
    {
      icon: Globe,
      label: "View All Reports",
      description: "Global view across teams",
      href: "/programmer/call-reports",
    },
  ];

  return (
    <>
      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernStatCard
          title="Projects Logged"
          value={callReportsCount}
          icon={FileText}
          href="/programmer/call-reports"
        />

        <ModernStatCard
          title="Episodes Received"
          value={totalEpisodesReceived}
          icon={CheckCircle2}
          href="/programmer/episodes"
        />

        <ModernStatCard
          title="One-Liner Evaluations"
          value={oneLinersEvaluated}
          icon={Globe}
          href="/programmer/evaluations-list"
          accent={true}
        />

        <ModernStatCard
          title="Episode Evaluations"
          value={episodesEvaluated}
          icon={ListChecks}
          href="/programmer/episodes"
          accent={true}
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

        {/* Recent Call Reports (All Teams) */}
        <ModernContentCard
          title="Recent One-Liners"
          subtitle="Latest reports from all teams"
        >
          {processedReports.length > 0 ? (
            <div className="space-y-2">
              {processedReports.map((report, index) => (
                <Link
                  key={report.id}
                  href={`/programmer/call-reports/${report.id}`}
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
              No one-liners found.
            </p>
          )}
        </ModernContentCard>

        {/* Recent Evaluations (All Teams) */}
        <ModernContentCard
          title="Recent Evaluations"
          subtitle="Latest evaluations from the programming team"
        >
          {recentEvaluationsData.length > 0 ? (
            <div className="space-y-3">
              {recentEvaluationsData.map((evaluation, index) => (
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
                      By: {evaluation.evaluator?.name || "Unknown"} • {formatDate(evaluation.created_at)}
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
                  href="/programmer/evaluations-list"
                  className="text-sm text-[#224794] hover:underline font-medium"
                >
                  View all evaluations →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No evaluations found.
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
            className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
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
            className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
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
