import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarIcon, PlusIcon, FileTextIcon, Calendar, FileText, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { logger } from "@/lib/logger";
import { ModernStatCard } from "@/components/dashboard/modern-stat-card";
import { ModernContentCard } from "@/components/dashboard/modern-content-card";
import { formatDateTime } from "@/lib/utils/format-date";

// Add Next.js caching - revalidate every 30 seconds
export const revalidate = 300; // 5 minutes for better performance

export default async function GcmDashboard() {
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Welcome back, <span className="text-[#224794]">{user.name}</span>.</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button asChild className="bg-[#10b981] hover:bg-[#059669] touch-target">
            <Link href="/gcm/calendar" prefetch>
              <PlusIcon className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Link>
          </Button>
          <Button asChild variant="outline" className="touch-target">
            <Link href="/gcm/log-call-report" prefetch>
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

  let meetingsCount = 0;
  let callReportsCount = 0;
  let episodesCount = 0;
  let upcomingMeetings: any[] = [];

  try {
    // STEP 2: Build queries with team filters
    let meetingsQuery = supabase
      .from("meetings")
      .select("id", { count: "exact", head: true });

    let callReportsQuery = supabase
      .from("call_reports")
      .select("id", { count: "exact", head: true });

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
      meetingsQuery = meetingsQuery.eq("team_id", currentUser.team_id);
      callReportsQuery = callReportsQuery.eq("team_id", currentUser.team_id);
      episodesQuery = episodesQuery.eq("team_id", currentUser.team_id);
      upcomingMeetingsQuery = upcomingMeetingsQuery.eq("team_id", currentUser.team_id);
    }

    const [meetingsRes, callReportsRes, episodesRes, upcomingMeetingsRes] = await Promise.all([
      meetingsQuery,
      callReportsQuery,
      episodesQuery,
      upcomingMeetingsQuery
    ]);

    meetingsCount = meetingsRes.count || 0;
    callReportsCount = callReportsRes.count || 0;
    episodesCount = episodesRes.count || 0;
    upcomingMeetings = upcomingMeetingsRes.data || [];
  } catch (error) {
    logger.error("❌ [Stats] Error fetching dashboard data:", error);
  }

  const quickActions = [
    {
      icon: Calendar,
      label: "Schedule Meeting",
      description: "Book meetings on calendar",
      href: "/gcm/calendar",
    },
    {
      icon: FileText,
      label: "Log One-Liner Report",
      description: "Document writer meetings",
      href: "/gcm/log-call-report",
    },
    {
      icon: FileText,
      label: "View One-Liner Reports",
      description: "All engagement reports",
      href: "/gcm/call-reports",
    },
    {
      icon: Film,
      label: "View Episodes",
      description: "Manage episodes",
      href: "/gcm/episodes",
    },
  ];

  return (
    <>
      {/* Stats Grid - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernStatCard
          title="Scheduled Meetings"
          value={meetingsCount}
          icon={Calendar}
          href="/gcm/calendar"
          accent={true}
        />

        <ModernStatCard
          title="One-Liner Reports"
          value={callReportsCount}
          icon={FileText}
          href="/gcm/call-reports"
        />

        <ModernStatCard
          title="Episodes Logged"
          value={episodesCount}
          icon={Film}
          href="/gcm/episodes"
        />

        <ModernStatCard
          title="Total Stories"
          value={0}
          icon={FileText}
          href="/gcm/call-reports"
        />
      </div>

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
              href="/gcm/call-reports"
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
                  href="/gcm/calendar"
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
              href="/gcm/calendar"
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
