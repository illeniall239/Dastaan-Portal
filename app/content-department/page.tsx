import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarIcon, PlusIcon, FileTextIcon, Calendar, FileText, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Suspense } from "react";
import { logger } from "@/lib/logger";
import { ModernStatCard } from "@/components/dashboard/modern-stat-card";
import { ModernContentCard } from "@/components/dashboard/modern-content-card";
import { formatDateTime } from "@/lib/utils/format-date";
import { SlotDistributionChart, GenreDistributionChart, ContentTypeChart } from "@/components/evaluator/score-distribution-chart";
import type { ChartProject } from "@/components/evaluator/score-distribution-chart";
import { AssessmentVsEvaluationChart } from "@/components/content-department/assessment-vs-evaluation-chart";

// Add Next.js caching - revalidate every 30 seconds
export const revalidate = 300; // 5 minutes for better performance

export default async function ContentDepartmentDashboard() {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated (handled by layout, but keeping for safety)
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Page Header with Actions - Static, shows immediately */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Welcome back, <span className="text-[#224794]">{user.name}</span>.</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button asChild className="bg-[#10b981] hover:bg-[#059669] touch-target">
            <Link href="/content-department/calendar" prefetch>
              <PlusIcon className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Link>
          </Button>
          <Button asChild variant="outline" className="touch-target">
            <Link href="/content-department/log-call-report" prefetch>
              <FileTextIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Log One-Liner Report</span>
              <span className="sm:hidden">Log Report</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent userId={user.id} userRole={user.role} teamId={user.team_id ?? null} />
      </Suspense>
    </div>
  );
}

// Dashboard Content Component - Fetches data and displays modern grid layout
async function DashboardContent({ userId, userRole, teamId }: { userId: string; userRole: string; teamId: string | null }) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const hasGlobalAccess = ['admin', 'management'].includes(userRole);
  const teamFilter = !hasGlobalAccess && teamId ? teamId : null;

  // Build all queries upfront, execute in ONE parallel batch
  let callReportsQuery = supabase
    .from("call_reports")
    .select("id", { count: "exact", head: true })
    .eq("meeting_type", "call_report")
    .is("archived_at", null);

  let episodesQuery = supabase
    .from("episodes")
    .select("id", { count: "exact", head: true });

  let upcomingMeetingsQuery = supabase
    .from("meetings")
    .select("id, title, meeting_date, contact_name")
    .gte("meeting_date", new Date().toISOString())
    .order("meeting_date", { ascending: true })
    .limit(5);

  let chartCrQuery = adminClient
    .from("call_reports")
    .select("id, working_title, writer_name, genre, content_type, target_slot, overall_rating")
    .eq("meeting_type", "call_report")
    .is("archived_at", null);

  if (teamFilter) {
    callReportsQuery = callReportsQuery.eq("team_id", teamFilter);
    episodesQuery = episodesQuery.eq("team_id", teamFilter);
    upcomingMeetingsQuery = upcomingMeetingsQuery.eq("team_id", teamFilter);
    chartCrQuery = chartCrQuery.eq("team_id", teamFilter);
  }

  // Single Promise.all — stats + chart base data in parallel
  const [callReportsRes, episodesRes, upcomingMeetingsRes, chartCrRes] = await Promise.all([
    callReportsQuery,
    episodesQuery,
    upcomingMeetingsQuery,
    chartCrQuery,
  ]);

  const callReportsCount = callReportsRes.count || 0;
  const episodesCount = episodesRes.count || 0;
  const upcomingMeetings = upcomingMeetingsRes.data || [];

  // Process chart data + comparison data from the same base query
  const crs = (chartCrRes.data || []) as any[];
  let chartProjects: ChartProject[] = [];

  type ComparisonProject = {
    id: string;
    title: string;
    initialAssessment: number | null;
    evaluationScore: number | null;
    type: "oneliner" | "episodic";
    episodeNumber?: number;
  };
  let comparisonData: ComparisonProject[] = [];

  if (crs.length > 0) {
    const crIds = crs.map((r: any) => r.id);
    const crTitleMap = new Map(crs.map((cr: any) => [cr.id, cr.working_title || "Untitled"]));
    const crInitialMap = new Map(crs.filter((cr: any) => cr.overall_rating != null).map((cr: any) => [cr.id, cr.overall_rating]));

    // Parallel: evaluator_forms (slots + scores) + episodes
    const [formsRes, episodesRes2] = await Promise.all([
      adminClient
        .from("evaluator_forms")
        .select("call_report_id, slot, average_score, submitted_at")
        .in("call_report_id", crIds)
        .not("submitted_at", "is", null),
      adminClient
        .from("episodes")
        .select("id, call_report_id, episode_number, initial_assessment")
        .in("call_report_id", crIds)
        .eq("is_current", true)
        .order("episode_number", { ascending: true }),
    ]);

    const forms = (formsRes.data || []) as any[];
    const episodes = (episodesRes2.data || []) as any[];

    // Build slot map + eval average map from single forms query
    const slotMap: Record<string, string> = {};
    const evalAvgMap = new Map<string, number[]>();
    for (const f of forms) {
      if (f.slot && !slotMap[f.call_report_id]) slotMap[f.call_report_id] = f.slot;
      if (f.average_score != null) {
        if (!evalAvgMap.has(f.call_report_id)) evalAvgMap.set(f.call_report_id, []);
        evalAvgMap.get(f.call_report_id)!.push(f.average_score);
      }
    }

    chartProjects = crs.map((cr: any) => ({
      id: cr.id,
      title: cr.working_title || "Untitled",
      writer: cr.writer_name || "—",
      genre: Array.isArray(cr.genre) ? cr.genre : [],
      contentType: cr.content_type || null,
      slot: slotMap[cr.id] || cr.target_slot || null,
    }));

    // One-liner comparison
    for (const crId of crIds) {
      const initScore = crInitialMap.get(crId) ?? null;
      const evalScores = evalAvgMap.get(crId);
      const evalAvg = evalScores && evalScores.length > 0
        ? Number((evalScores.reduce((a: number, b: number) => a + b, 0) / evalScores.length).toFixed(1))
        : null;
      comparisonData.push({
        id: crId,
        title: crTitleMap.get(crId) || "Untitled",
        initialAssessment: initScore,
        evaluationScore: evalAvg,
        type: "oneliner",
      });
    }

    // Episodic comparison (parallel: revisions + evals)
    if (episodes.length > 0) {
      const epIds = episodes.map((e: any) => e.id);
      const [epRevisionsRes, epEvalsRes] = await Promise.all([
        adminClient
          .from("episode_revisions")
          .select("episode_id, initial_assessment")
          .in("episode_id", epIds)
          .not("initial_assessment", "is", null),
        adminClient
          .from("episodic_evaluations")
          .select("episode_id, overall_average")
          .in("episode_id", epIds)
          .not("submitted_at", "is", null)
          .not("overall_average", "is", null),
      ]);

      const epRevMap = new Map<string, number>();
      for (const r of (epRevisionsRes.data || []) as any[]) {
        epRevMap.set(r.episode_id, r.initial_assessment);
      }

      const epEvalAvgMap = new Map<string, number[]>();
      for (const e of (epEvalsRes.data || []) as any[]) {
        if (!epEvalAvgMap.has(e.episode_id)) epEvalAvgMap.set(e.episode_id, []);
        epEvalAvgMap.get(e.episode_id)!.push(e.overall_average);
      }

      for (const ep of episodes) {
        const initScore = epRevMap.get(ep.id) ?? ep.initial_assessment ?? null;
        const evalScores = epEvalAvgMap.get(ep.id);
        const evalAvg = evalScores && evalScores.length > 0
          ? Number((evalScores.reduce((a: number, b: number) => a + b, 0) / evalScores.length).toFixed(1))
          : null;
        comparisonData.push({
          id: ep.id,
          title: crTitleMap.get(ep.call_report_id) || "Untitled",
          initialAssessment: initScore,
          evaluationScore: evalAvg,
          type: "episodic",
          episodeNumber: ep.episode_number,
        });
      }
    }
  }
  const quickActions = [
    {
      icon: Calendar,
      label: "Schedule Meeting",
      description: "Book meetings on calendar",
      href: "/content-department/calendar",
    },
    {
      icon: FileText,
      label: "Log One-Liner Report",
      description: "Document writer meetings",
      href: "/content-department/log-call-report",
    },
    {
      icon: FileText,
      label: "View One-Liner Reports",
      description: "All engagement reports",
      href: "/content-department/call-reports",
    },
    {
      icon: Film,
      label: "View Episodes",
      description: "Manage episodes",
      href: "/content-department/episodes",
    },
  ];

  return (
    <>
      {/* Stats Grid - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModernStatCard
          title="One-Liners Logged"
          value={callReportsCount}
          icon={FileText}
          href="/content-department/call-reports"
          accent={true}
        />

        <ModernStatCard
          title="Episodes Logged"
          value={episodesCount}
          icon={Film}
          href="/content-department/episodes"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SlotDistributionChart projects={chartProjects} />
        <GenreDistributionChart projects={chartProjects} />
        <ContentTypeChart projects={chartProjects} />
      </div>

      {/* Assessment vs Evaluation */}
      <AssessmentVsEvaluationChart data={comparisonData} />

      {/* Content Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <ModernContentCard
          title="Quick Actions"
          subtitle="Frequently accessed pages"
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

        {/* Recent One-Liner Reports */}
        <ModernContentCard
          title="Recent One-Liner Reports"
          subtitle="Last 5 one-liner reports"
        >
          <p className="text-sm text-gray-500 text-center py-8">
            View all one-liner reports to see recent activity
          </p>
          <div className="pt-2 text-center">
            <Link
              href="/content-department/call-reports"
              className="text-sm text-[#224794] hover:underline font-medium"
            >
              View all reports →
            </Link>
          </div>
        </ModernContentCard>

        {/* Upcoming Meetings */}
        <ModernContentCard
          title="Upcoming Meetings"
          subtitle="Next 5 scheduled meetings"
        >
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href="/content-department/calendar"
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {meeting.title || "Untitled Meeting"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {meeting.contact_name ? `With: ${meeting.contact_name}` : "No contact specified"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(meeting.meeting_date)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No upcoming meetings scheduled
            </p>
          )}
          <div className="pt-2 text-center">
            <Link
              href="/content-department/calendar"
              className="text-sm text-[#224794] hover:underline font-medium"
            >
              View calendar →
            </Link>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
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

