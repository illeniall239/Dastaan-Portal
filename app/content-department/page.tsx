import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CalendarIcon, PlusIcon, FileTextIcon, CheckCircle2, Calendar, FileText, RefreshCw, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { StatsGridSkeleton } from "@/components/skeletons/stats-grid-skeleton";
import { ActivityCardSkeleton } from "@/components/skeletons/activity-card-skeleton";
import { logger } from "@/lib/logger";
import { getRecentActivity } from "@/lib/dashboard/server";
import { BentoGrid } from "@/components/dashboard/bento-grid";
import { BentoCard } from "@/components/dashboard/bento-card";
import { EnhancedStatCard } from "@/components/dashboard/enhanced-stat-card";
import { EnhancedQuickActions } from "@/components/dashboard/enhanced-quick-actions";

// Add Next.js caching - revalidate every 30 seconds
export const revalidate = 300; // 5 minutes for better performance

export default async function ContentDepartmentDashboard() {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated (handled by layout, but keeping for safety)
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header with Actions - Static, shows immediately */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, <span className="text-[#224794]">{user.name}</span>.</h1>
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
              <span className="hidden sm:inline">Log Writer Engagement Report</span>
              <span className="sm:hidden">Log Report</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Bento Grid Dashboard */}
      <Suspense fallback={<StatsGridSkeleton />}>
        <BentoDashboard />
      </Suspense>
    </div>
  );
}

// Bento Dashboard Component - Fetches data and displays bento grid
async function BentoDashboard() {
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

  let meetingsCount = 0;
  let callReportsCount = 0;
  let episodesCount = 0;
  let recentActivity: any[] = [];

  try {
    // STEP 2: Build queries with team filters
    let meetingsQuery = supabase
      .from("call_reports")
      .select("id", { count: "exact", head: true })
      .eq("meeting_type", "scheduled_meeting");

    let callReportsQuery = supabase
      .from("call_reports")
      .select("id", { count: "exact", head: true })
      .eq("meeting_type", "call_report");

    let episodesQuery = supabase
      .from("episodes")
      .select("id", { count: "exact", head: true });

    // TEAM ISOLATION: Apply filters unless admin/management
    if (!hasGlobalAccess && currentUser?.team_id) {
      meetingsQuery = meetingsQuery.eq("team_id", currentUser.team_id);
      callReportsQuery = callReportsQuery.eq("team_id", currentUser.team_id);
      episodesQuery = episodesQuery.eq("team_id", currentUser.team_id);
    }

    const [meetingsRes, callReportsRes, episodesRes] = await Promise.all([
      meetingsQuery,
      callReportsQuery,
      episodesQuery
    ]);

    meetingsCount = meetingsRes.count || 0;
    callReportsCount = callReportsRes.count || 0;
    episodesCount = episodesRes.count || 0;

    // Fetch recent activity
    recentActivity = await getRecentActivity(
      5,
      currentUser?.team_id,
      currentUser?.role
    );
  } catch (error) {
    logger.error("❌ [Stats] Error fetching dashboard data:", error);
  }

  const quickActions = [
    {
      icon: "Calendar",
      label: "View Calendar",
      description: "See all scheduled meetings",
      href: "/content-department/calendar",
      color: "blue" as const,
    },
    {
      icon: "CheckCircle2",
      label: "Writer Engagement Reports",
      description: "View all reports",
      href: "/content-department/call-reports",
      color: "green" as const,
    },
    {
      icon: "Film",
      label: "Episodes",
      description: "View all episodes",
      href: "/content-department/episodes",
      color: "orange" as const,
    },
  ];

  return (
    <BentoGrid>
      {/* Hero Card - Scheduled Meetings (2x2) - LUXURY MINIMAL */}
      <EnhancedStatCard
        title="Scheduled Meetings"
        value={meetingsCount}
        icon="Calendar"
        size="2x2"
        variant="hero"
        gradient="blue"
        borderAccent="left"
        accentColor="blue"
        href="/content-department/calendar"
        luxuryMinimal
      />

      {/* Writer Engagement Reports (1x1) - LUXURY MINIMAL */}
      <EnhancedStatCard
        title="Writer Engagement Reports"
        value={callReportsCount}
        icon="FileText"
        size="1x1"
        variant="metric"
        gradient="green"
        borderAccent="top"
        accentColor="green"
        href="/content-department/call-reports"
        luxuryMinimal
      />

      {/* Episodes Logged (1x1) - LUXURY MINIMAL */}
      <EnhancedStatCard
        title="Episodes Logged"
        value={episodesCount}
        icon="Film"
        size="1x1"
        variant="metric"
        gradient="orange"
        borderAccent="top"
        accentColor="orange"
        href="/content-department/episodes"
        luxuryMinimal
      />

      {/* Quick Actions (1x2) - LUXURY MINIMAL */}
      <BentoCard
        size="1x2"
        variant="content"
        gradient="none"
        minimalist
      >
        <div className="h-full flex flex-col">
          <div className="mb-4">
            <h3 className="luxury-text-label text-neutral-700">Quick Actions</h3>
            <p className="luxury-text-micro text-neutral-500 mt-1">Common tasks and shortcuts</p>
          </div>
          <EnhancedQuickActions actions={quickActions} luxuryMinimal />
        </div>
      </BentoCard>

      {/* Recent Activity (2x2) - LUXURY MINIMAL */}
      <BentoCard
        size="2x2"
        variant="content"
        gradient="none"
        minimalist
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="luxury-text-label text-neutral-700">Recent Activity</h3>
              <p className="luxury-text-micro text-neutral-500 mt-1">Latest updates in the content pipeline</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[#224794] hover:text-[#2b5baf] hover:bg-blue-50" asChild>
              <Link href="/content-department/call-reports">View All</Link>
            </Button>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-2 overflow-auto flex-1">
              {recentActivity.map((activity, index) => {
                const activityDate = new Date(activity.timestamp);
                const formattedTime = activityDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true
                });
                const formattedDate = activityDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric"
                });

                let activityDescription = "";
                let ActivityIcon: React.ElementType;
                let activityLink = "";

                switch (activity.action) {
                  case "created_call_report":
                    activityDescription = `Created call report: ${activity.details?.title || 'Untitled'}`;
                    ActivityIcon = FileText;
                    activityLink = `/content-department/call-reports/${activity.entityId}`;
                    break;
                  case "submitted_evaluation":
                    activityDescription = `Evaluation submitted for: ${activity.details?.project_title || 'Untitled Project'}`;
                    ActivityIcon = CheckCircle2;
                    activityLink = `/content-department/call-reports`;
                    break;
                  case "created_meeting":
                    activityDescription = `Scheduled meeting: ${activity.details?.title || 'Untitled Meeting'}`;
                    ActivityIcon = Calendar;
                    activityLink = `/content-department/calendar`;
                    break;
                  default:
                    activityDescription = `${activity.action.replace(/_/g, ' ').toUpperCase()}: ${activity.entityType} ${activity.entityId}`;
                    ActivityIcon = RefreshCw;
                    activityLink = `/${activity.entityType}s/${activity.entityId}`;
                }

                return (
                  <Link
                    key={activity.id}
                    href={activityLink}
                    className="group block p-3 rounded-lg hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                          <ActivityIcon className="h-4 w-4 text-slate-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 group-hover:text-[#224794] transition-colors line-clamp-1">
                            {activityDescription}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            By {activity.performedBy}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium text-slate-700">{formattedTime}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formattedDate}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No recent activity to display
            </p>
          )}
        </div>
      </BentoCard>

      {/* Upcoming Meetings (2x1) - LUXURY MINIMAL */}
      <BentoCard
        size="2x1"
        variant="content"
        gradient="none"
        minimalist
      >
        <div>
          <h3 className="luxury-text-label text-neutral-700 mb-1">Upcoming Meetings</h3>
          <p className="luxury-text-micro text-neutral-500 mb-4">Scheduled meetings for this week</p>
          {meetingsCount > 0 ? (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-slate-700 font-medium">
                <span className="text-2xl font-bold text-[#224794]">{meetingsCount}</span> meeting{meetingsCount !== 1 ? 's' : ''} scheduled this week.{' '}
                <Link href="/content-department/calendar" className="text-[#224794] hover:text-[#1a3670] underline font-semibold">
                  View calendar
                </Link>
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-600 font-medium">
                No upcoming meetings scheduled.{' '}
                <Link href="/content-department/calendar" className="text-[#224794] hover:text-[#1a3670] underline font-semibold">
                  Schedule a meeting
                </Link>
              </p>
            </div>
          )}
        </div>
      </BentoCard>
    </BentoGrid>
  );
}

