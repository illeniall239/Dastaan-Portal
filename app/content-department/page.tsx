import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CalendarIcon, PlusIcon, UsersIcon, FileTextIcon, CheckCircle2, Calendar, FileText, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Suspense } from "react";
import { StatsGridSkeleton } from "@/components/skeletons/stats-grid-skeleton";
import { ActivityCardSkeleton } from "@/components/skeletons/activity-card-skeleton";
import { logger } from "@/lib/logger";
import { getRecentActivity } from "@/lib/dashboard/server";

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

      {/* Stats Grid - Show skeleton while fetching */}
      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGrid />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column - Quick Actions - Static, shows immediately */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6 flex flex-col">
          <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-slate-600 text-sm">
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 sm:p-6 pt-0">
              <Link href="/content-department/calendar" prefetch>
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '0ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#224794] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#224794] transition-colors">View Calendar</p>
                    <p className="text-xs text-slate-500">See all meetings</p>
                  </div>
                </div>
              </Link>
              <Link href="/content-department/call-reports" prefetch>
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '100ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#10b981] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#10b981] transition-colors">Writer Engagement Reports</p>
                    <p className="text-xs text-slate-500">View reports</p>
                  </div>
                </div>
              </Link>
              <Link href="/content-department/episodes" prefetch>
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '200ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#f79224] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#f79224] transition-colors">Episodes</p>
                    <p className="text-xs text-slate-500">View episodes</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recent Activity & Upcoming - Show skeleton while fetching */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 flex flex-col">
          <Suspense fallback={<ActivityCardSkeleton />}>
            <RecentActivityCard />
          </Suspense>

          <Suspense fallback={<UpcomingMeetingsSkeleton />}>
            <UpcomingMeetingsCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// Stats Grid Component - Fetches data
async function StatsGrid() {
  const supabase = await createClient();

  let meetingsCount = 0;
  let callReportsCount = 0;
  let episodesCount = 0;

  try {
    const [meetingsRes, callReportsRes, episodesRes] = await Promise.all([
      supabase
        .from("call_reports")
        .select("id", { count: "exact", head: true })
        .eq("meeting_type", "scheduled_meeting"),
      supabase
        .from("call_reports")
        .select("id", { count: "exact", head: true })
        .eq("meeting_type", "call_report"),
      supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
    ]);

    meetingsCount = meetingsRes.count || 0;
    callReportsCount = callReportsRes.count || 0;
    episodesCount = episodesRes.count || 0;
  } catch (error) {
    logger.error("❌ [Stats] Error fetching stats:", error);
  }

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Scheduled Meetings"
        value={meetingsCount}
        icon="Calendar"
        variant="primary"
        href="/content-department/calendar"
      />
      <StatCard
        title="Writer Engagement Reports"
        value={callReportsCount}
        icon="FileText"
        href="/content-department/call-reports"
      />
      <StatCard
        title="Episodes Logged"
        value={episodesCount}
        icon="FileText"
        href="/content-department/episodes"
      />
    </div>
  );
}

// Recent Activity Component - Fetches data
async function RecentActivityCard() {
  let recentActivity: any[] = [];

  try {
    recentActivity = await getRecentActivity(5);
  } catch (error) {
    logger.error("❌ [Activity] Error fetching recent activity:", error);
  }

  return (
    <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold">Recent Activity</CardTitle>
            <CardDescription className="text-slate-600 text-sm">
              Latest updates in the content pipeline
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-[#224794] hover:text-[#2b5baf] hover:bg-blue-50 touch-target self-start sm:self-auto" asChild>
            <Link href="/content-department/call-reports">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
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
                  className="group block p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 p-2 sm:p-2.5 rounded-xl bg-slate-100 group-hover:bg-slate-200 transition-colors shadow-sm">
                        <ActivityIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-[#224794] transition-colors line-clamp-2">
                          {activityDescription}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 sm:mt-1.5 font-medium">
                          By {activity.performedBy}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-slate-700">{formattedTime}</p>
                      <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{formattedDate}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity to display
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Upcoming Meetings Component - Fetches data
async function UpcomingMeetingsCard() {
  const supabase = await createClient();
  let meetingsCount = 0;

  try {
    const { count } = await supabase
      .from("call_reports")
      .select("*", { count: "exact", head: true })
      .eq("meeting_type", "scheduled_meeting");

    meetingsCount = count || 0;
  } catch (error) {
    console.error("❌ [Meetings] Error fetching meetings:", error);
  }

  return (
    <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl font-bold">Upcoming Meetings</CardTitle>
        <CardDescription className="text-slate-600 text-sm">
          Scheduled meetings for this week
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {meetingsCount > 0 ? (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-sm text-slate-700 font-medium">
              <span className="text-2xl font-bold text-[#224794]">{meetingsCount}</span> meeting{meetingsCount !== 1 ? 's' : ''} scheduled this week.{' '}
              <Link href="/content-department/calendar" className="text-[#224794] hover:text-[#1a3670] underline font-semibold">
                View calendar
              </Link>
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-600 font-medium">
              No upcoming meetings scheduled.{' '}
              <Link href="/content-department/calendar" className="text-[#224794] hover:text-[#1a3670] underline font-semibold">
                Schedule a meeting
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton for Upcoming Meetings
function UpcomingMeetingsSkeleton() {
  return (
    <Card className="h-full shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Upcoming Meetings</CardTitle>
        <CardDescription className="text-slate-600">
          Scheduled meetings for this week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
        </div>
      </CardContent>
    </Card>
  );
}
