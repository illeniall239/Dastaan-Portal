import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  Minus,
  CheckCircle2,
  FileText as FileTextIcon,
  Calendar,
  RefreshCw
} from "lucide-react";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";
import { RejectedArchiveItem } from "@/components/stakeholder/rejected-archive-item";
import { StatCard } from "@/components/dashboard/stat-card";
import { Suspense } from "react";
import { StatsGridSkeleton } from "@/components/skeletons/stats-grid-skeleton";
import { ActivityCardSkeleton } from "@/components/skeletons/activity-card-skeleton";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

// Mock data for testing
const mockDashboardData = {
  summary: {
    totalActiveProjects: 24,
    overduePayments: 3,
    weeklyActivities: 18,
    pendingApprovals: 7
  },
  activeEvaluations: [
    {
      id: "1",
      title: "The Midnight Chronicles",
      writer: "Ahmed Raza",
      meetingDate: "2025-10-15",
      currentAvgScore: 7.8,
      completedEvaluations: 15,
      totalRequired: 20
    },
    {
      id: "2",
      title: "Desert Winds",
      writer: "Fatima Khan",
      meetingDate: "2025-10-18",
      currentAvgScore: 6.2,
      completedEvaluations: 8,
      totalRequired: 20
    }
  ],
  funnel: {
    submitted: 12,
    in_evaluation: 8,
    approved: 15,
    in_negotiation: 5,
    in_legal_review: 3,
    contracted: 12
  },
  rejectedArchive: [
    {
      id: "1",
      callReportId: "CR-2025-0001",
      writerName: "Ali Siddiqui",
      workingTitle: "Ocean's Edge",
      logline: "A marine biologist discovers a hidden underwater civilization.",
      meetingDate: "2025-09-20",
      averageScore: 3.2,
      totalEvaluations: 20,
      rejectionReason: "Lack of commercial appeal and weak character development",
      archivedAt: "2025-09-25T14:30:00Z",
      evaluations: []
    }
  ]
};

// Add Next.js caching - revalidate every 30 seconds for real-time data
export const revalidate = 300; // 5 minutes for better performance

export default async function StakeholderDemoPage() {
  // NOTE: This route is deprecated. Management users should use /management instead.
  // Keeping this for reference only - will be removed in future.

  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Redirect non-management/admin users to their appropriate dashboard
  if (user.role !== "management" && user.role !== "admin") {
    redirect("/dashboard");
  }

  // Redirect management/admin to the proper management dashboard
  redirect("/management");

  return (
    <div className="p-6 space-y-6">
      {/* This page is deprecated - redirects to /management */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Redirecting to Management Dashboard...</h1>
          <p className="text-muted-foreground mt-1">
            Please wait...
          </p>
        </div>
      </div>

      {/* Stats Grid - Show skeleton while fetching */}
      <Suspense fallback={<StatsGridSkeleton />}>
        <StakeholderStatsGrid />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Quick Actions - Static, shows immediately */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-slate-600">
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="#overview">
                <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md">
                  <div className="p-3 rounded-xl bg-[#224794] shadow-lg transition-shadow duration-300">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#224794] transition-colors">View Overview</p>
                    <p className="text-xs text-slate-500">Full dashboard view</p>
                  </div>
                </div>
              </Link>
              <Link href="#rejected-archive">
                <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md">
                  <div className="p-3 rounded-xl bg-[#f79224] shadow-lg transition-shadow duration-300">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#f79224] transition-colors">Rejected Archive</p>
                    <p className="text-xs text-slate-500">Manage rejected items</p>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard">
                <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md">
                  <div className="p-3 rounded-xl bg-[#10b981] shadow-lg transition-shadow duration-300">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#10b981] transition-colors">Main Dashboard</p>
                    <p className="text-xs text-slate-500">Back to main view</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Active Evaluations & Pipeline - Show skeleton while fetching */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <Suspense fallback={<ActivityCardSkeleton />}>
            <ActiveEvaluationsCard />
          </Suspense>

          <Suspense fallback={<ActivityCardSkeleton />}>
            <PipelineOverviewCard />
          </Suspense>
        </div>
      </div>

      {/* Rejected Archive Section - Full width */}
      <div className="space-y-6">
        <Suspense fallback={<ActivityCardSkeleton />}>
          <RejectedArchiveSection />
        </Suspense>
      </div>
    </div>
  );
}

// Stats Grid Component - Uses mock data for testing
async function StakeholderStatsGrid() {
  // Use mock data for testing
  const { summary } = mockDashboardData;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Projects"
        value={summary.totalActiveProjects}
        icon="FileText"
        variant="primary"
      />
      <StatCard
        title="Overdue Payments"
        value={summary.overduePayments}
        icon="AlertTriangle"
      />
      <StatCard
        title="Weekly Activities"
        value={summary.weeklyActivities}
        icon="Activity"
      />
      <StatCard
        title="Pending Approvals"
        value={summary.pendingApprovals}
        icon="Clock"
      />
    </div>
  );
}

// Active Evaluations Component - Uses mock data for testing
async function ActiveEvaluationsCard() {
  // Use mock data for testing
  const { activeEvaluations } = mockDashboardData;

  return (
    <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Active Evaluations</CardTitle>
            <CardDescription>Call reports currently being evaluated (5 internal evaluators required)</CardDescription>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Activity className="h-3 w-3 mr-1" />
            Live Progress
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activeEvaluations.length > 0 ? (
          <div className="space-y-4">
            {activeEvaluations.map((evaluation: any) => {
              const meetingDate = new Date(evaluation.meetingDate);

              // Determine score indicator icon and color
              let ScoreIcon = Minus;
              let scoreColor = "text-yellow-600";
              if (evaluation.currentAvgScore >= 7.0) {
                ScoreIcon = TrendingUp;
                scoreColor = "text-green-600";
              } else if (evaluation.currentAvgScore < 5.0 && evaluation.currentAvgScore > 0) {
                ScoreIcon = AlertTriangle;
                scoreColor = "text-red-600";
              }

              return (
                <div key={evaluation.id} className="border-2 border-blue-200 rounded-lg bg-white p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-semibold">{evaluation.title}</h4>
                        <Badge variant="secondary">In Progress</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Writer: {evaluation.writer} • Meeting: {meetingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1.5 text-lg font-bold ${scoreColor}`}>
                        <ScoreIcon className="h-5 w-5" />
                        <span>{evaluation.currentAvgScore > 0 ? evaluation.currentAvgScore.toFixed(1) : '--'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Current Avg</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold">Evaluation Progress</p>
                        <Badge variant="outline" className="text-xs">
                          {evaluation.completedEvaluations}/{evaluation.totalRequired} Required
                        </Badge>
                      </div>
                    </div>
                    <EvaluationProgressBar
                      completed={evaluation.completedEvaluations}
                      total={evaluation.totalRequired}
                      internalCompleted={evaluation.completedEvaluations}
                      externalCompleted={0}
                      internalRequired={evaluation.totalRequired}
                      externalRequired={0}
                      showLabels={false}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {evaluation.totalRequired - evaluation.completedEvaluations} more required evaluation{evaluation.totalRequired - evaluation.completedEvaluations !== 1 ? 's' : ''} needed for final decision
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No active evaluations at the moment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Pipeline Overview Component - Uses mock data for testing
async function PipelineOverviewCard() {
  // Use mock data for testing
  const { funnel } = mockDashboardData;

  return (
    <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Pipeline Overview</CardTitle>
        <CardDescription>Stories across workflow stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
            <span className="text-sm font-medium">Submitted</span>
            <Badge variant="outline">{funnel.submitted}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors">
            <span className="text-sm font-medium">In Evaluation</span>
            <Badge variant="outline">{funnel.in_evaluation}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-green-50 rounded hover:bg-green-100 transition-colors">
            <span className="text-sm font-medium">Approved</span>
            <Badge variant="outline">{funnel.approved}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-purple-50 rounded hover:bg-purple-100 transition-colors">
            <span className="text-sm font-medium">In Negotiation</span>
            <Badge variant="outline">{funnel.in_negotiation}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-orange-50 rounded hover:bg-orange-100 transition-colors">
            <span className="text-sm font-medium">In Legal Review</span>
            <Badge variant="outline">{funnel.in_legal_review}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
            <span className="text-sm font-medium">Contracted</span>
            <Badge variant="outline">{funnel.contracted}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Rejected Archive Component - Uses mock data for testing
async function RejectedArchiveSection() {
  // Use mock data for testing
  const { rejectedArchive } = mockDashboardData;

  // Mock recent activity data
  const recentActivity = [
    {
      id: "1",
      action: "created_call_report",
      performedBy: "Sarah Johnson",
      timestamp: "2025-10-18T10:30:00Z",
      details: {
        title: "The Midnight Chronicles"
      }
    },
    {
      id: "2",
      action: "submitted_evaluation",
      performedBy: "Michael Chen",
      timestamp: "2025-10-18T09:15:00Z",
      details: {
        project_title: "Desert Winds"
      }
    },
    {
      id: "3",
      action: "created_meeting",
      performedBy: "Emma Wilson",
      timestamp: "2025-10-18T08:45:00Z",
      details: {
        title: "Ocean's Edge Review"
      }
    }
  ];

  return (
    <>
      {/* Recent Activity Section */}
      <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
          </div>
          <CardDescription>Latest updates across all departments</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => {
                const activityDate = new Date(activity.timestamp);
                const formattedTime = activityDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true
                });

                // Format activity description based on action type
                let activityDescription = "";
                let ActivityIcon: React.ElementType;

                switch (activity.action) {
                  case "created_call_report":
                    activityDescription = `Created call report: ${activity.details?.title || 'Untitled'}`;
                    ActivityIcon = FileTextIcon;
                    break;
                  case "submitted_evaluation":
                    activityDescription = `Submitted evaluation for: ${activity.details?.project_title || 'Untitled Project'}`;
                    ActivityIcon = CheckCircle2;
                    break;
                  case "created_meeting":
                    activityDescription = `Scheduled meeting: ${activity.details?.title || 'Untitled Meeting'}`;
                    ActivityIcon = Calendar;
                    break;
                  default:
                    activityDescription = `${activity.action.replace(/_/g, ' ').toUpperCase()}`;
                    ActivityIcon = RefreshCw;
                }

                return (
                  <div key={activity.id} className="flex items-start gap-3 p-2">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activityDescription}</p>
                      <p className="text-xs text-muted-foreground">
                        By {activity.performedBy} • {formattedTime}
                      </p>
                    </div>
                  </div>
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

      {/* Rejected Archive Section */}
      <Card id="rejected-archive" className="border-red-200 bg-red-50/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-red-600" />
              <div>
                <CardTitle className="text-xl font-bold">Rejected Archive</CardTitle>
                <CardDescription>Call reports that did not meet evaluation criteria (score {'<'} 5.0)</CardDescription>
              </div>
            </div>
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {rejectedArchive.length} Rejected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {rejectedArchive.length > 0 ? (
            <div className="space-y-4">
              {rejectedArchive.map((item: any) => (
                <RejectedArchiveItem
                  key={item.id}
                  id={item.id}
                  callReportId={item.callReportId}
                  writerName={item.writerName}
                  workingTitle={item.workingTitle}
                  logline={item.logline}
                  meetingDate={item.meetingDate}
                  averageScore={item.averageScore}
                  totalEvaluations={item.totalEvaluations}
                  rejectionReason={item.rejectionReason}
                  archivedAt={item.archivedAt}
                  evaluations={item.evaluations}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No rejected stories in the archive</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}