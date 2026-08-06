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
        <DashboardContent />
      </Suspense>
    </div>
  );
}

// Dashboard Content Component - Fetches data and displays modern grid layout
async function DashboardContent() {
  const supabase = await createClient();

  // STEP 1: Get current user's team context for team isolation
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  const hasGlobalAccess = currentUser?.role && ['admin', 'management'].includes(currentUser.role);

  let callReportsCount = 0;
  let episodesCount = 0;
  let upcomingMeetings: any[] = [];

  try {
    // STEP 2: Build queries with team filters
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

    // TEAM ISOLATION: Apply filters unless admin/management
    if (!hasGlobalAccess && currentUser?.team_id) {
      callReportsQuery = callReportsQuery.eq("team_id", currentUser.team_id);
      episodesQuery = episodesQuery.eq("team_id", currentUser.team_id);
      upcomingMeetingsQuery = upcomingMeetingsQuery.eq("team_id", currentUser.team_id);
    }

    const [callReportsRes, episodesRes, upcomingMeetingsRes] = await Promise.all([
      callReportsQuery,
      episodesQuery,
      upcomingMeetingsQuery
    ]);

    callReportsCount = callReportsRes.count || 0;
    episodesCount = episodesRes.count || 0;
    upcomingMeetings = upcomingMeetingsRes.data || [];
  } catch (error) {
    logger.error("❌ [Stats] Error fetching dashboard data:", error);
  }

  // Chart data — slot, genre, content_type
  const adminClient = createAdminClient();
  let chartProjects: ChartProject[] = [];
  try {
    let crQuery = adminClient
      .from("call_reports")
      .select("id, working_title, writer_name, genre, content_type, target_slot")
      .eq("meeting_type", "call_report")
      .is("archived_at", null);

    if (!hasGlobalAccess && currentUser?.team_id) {
      crQuery = crQuery.eq("team_id", currentUser.team_id);
    }

    const { data: crs } = await crQuery;

    if (crs && crs.length > 0) {
      const ids = crs.map((r: any) => r.id);

      const { data: forms } = await adminClient
        .from("evaluator_forms")
        .select("call_report_id, slot")
        .in("call_report_id", ids)
        .not("submitted_at", "is", null)
        .not("slot", "is", null);

      const slotMap: Record<string, string> = {};
      for (const f of (forms || []) as any[]) {
        if (f.slot && !slotMap[f.call_report_id]) slotMap[f.call_report_id] = f.slot;
      }

      chartProjects = (crs as any[]).map((cr) => ({
        id: cr.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "—",
        genre: Array.isArray(cr.genre) ? cr.genre : [],
        contentType: cr.content_type || null,
        slot: slotMap[cr.id] || cr.target_slot || null,
      }));
    }
  } catch (error) {
    logger.error("❌ [Charts] Error fetching chart data:", error);
  }

  // Assessment vs Evaluation comparison data
  type ComparisonProject = {
    id: string;
    title: string;
    initialAssessment: number | null;
    evaluationScore: number | null;
    type: "oneliner" | "episodic";
    episodeNumber?: number;
  };
  let comparisonData: ComparisonProject[] = [];
  try {
    if (chartProjects.length > 0) {
      const crIds = chartProjects.map((p) => p.id);

      // One-liner: initial assessment from call_reports.overall_rating + evaluator avg from evaluator_forms
      const { data: crWithRating } = await adminClient
        .from("call_reports")
        .select("id, working_title, overall_rating")
        .in("id", crIds);

      const crInitialMap = new Map<string, number>();
      const crTitleMap = new Map<string, string>();
      for (const cr of (crWithRating || []) as any[]) {
        crTitleMap.set(cr.id, cr.working_title || "Untitled");
        if (cr.overall_rating != null) crInitialMap.set(cr.id, cr.overall_rating);
      }

      const { data: evalForms } = await adminClient
        .from("evaluator_forms")
        .select("call_report_id, average_score")
        .in("call_report_id", crIds)
        .not("submitted_at", "is", null)
        .not("average_score", "is", null);

      const evalAvgMap = new Map<string, number[]>();
      for (const f of (evalForms || []) as any[]) {
        if (!evalAvgMap.has(f.call_report_id)) evalAvgMap.set(f.call_report_id, []);
        evalAvgMap.get(f.call_report_id)!.push(f.average_score);
      }

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

      // Episodic: initial_assessment from episodes table + evaluator avg from episodic_evaluations
      const { data: episodes } = await adminClient
        .from("episodes")
        .select("id, call_report_id, episode_number, initial_assessment")
        .in("call_report_id", crIds)
        .eq("is_current", true)
        .order("episode_number", { ascending: true });

      if (episodes && episodes.length > 0) {
        const epIds = episodes.map((e: any) => e.id);

        // Also check episode_revisions for latest initial_assessment
        const { data: epRevisions } = await adminClient
          .from("episode_revisions")
          .select("episode_id, initial_assessment")
          .in("episode_id", epIds)
          .not("initial_assessment", "is", null);

        const epRevMap = new Map<string, number>();
        for (const r of (epRevisions || []) as any[]) {
          epRevMap.set(r.episode_id, r.initial_assessment);
        }

        const { data: epEvals } = await adminClient
          .from("episodic_evaluations")
          .select("episode_id, overall_average")
          .in("episode_id", epIds)
          .not("submitted_at", "is", null)
          .not("overall_average", "is", null);

        const epEvalAvgMap = new Map<string, number[]>();
        for (const e of (epEvals || []) as any[]) {
          if (!epEvalAvgMap.has(e.episode_id)) epEvalAvgMap.set(e.episode_id, []);
          epEvalAvgMap.get(e.episode_id)!.push(e.overall_average);
        }

        for (const ep of episodes as any[]) {
          // Prefer revision initial_assessment, fallback to episode's own
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
  } catch (error) {
    logger.error("❌ [Comparison] Error fetching comparison data:", error);
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

