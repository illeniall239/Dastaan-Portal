import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { AdminPanelLink } from "@/components/auth/AdminPanelLink";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Calendar, FileText, CheckCircle2, RefreshCw } from "lucide-react";

// Add Next.js caching - revalidate every 30 seconds
export const revalidate = 300; // 5 minutes for better performance

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Redirect content department users to their specialized dashboard
  if (user.role === "content_manager" || user.role === "content_creator") {
    redirect("/content-department");
  }
  
  // Redirect evaluators to their specialized dashboard
  if (user.role === "evaluator") {
    redirect("/evaluator");
  }

  // Fetch recent activity
  let recentActivity = [];
  try {
    const { getRecentActivity } = await import("@/lib/dashboard/server");
    recentActivity = await getRecentActivity(5);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image
              src="/geo-logo.png"
              alt="Geo Logo"
              width={60}
              height={60}
              priority
            />
            <div>
              <h1 className="text-2xl font-bold">Dastaan Portal</h1>
              <p className="text-sm text-muted-foreground">
                Story Development Management System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.position}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your content today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Active workflows
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with the most common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {user.role === "content_creator" && (
              <>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/stories/new">
                    <div className="text-left">
                      <div className="font-semibold">Submit Story</div>
                      <div className="text-sm text-muted-foreground">
                        Submit a new story idea
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/stories">
                    <div className="text-left">
                      <div className="font-semibold">My Stories</div>
                      <div className="text-sm text-muted-foreground">
                        View all your submissions
                      </div>
                    </div>
                  </Link>
                </Button>
              </>
            )}

            {user.role === "content_manager" && (
              <>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/call-reports/new">
                    <div className="text-left">
                      <div className="font-semibold">New Writer Engagement Report</div>
                      <div className="text-sm text-muted-foreground">
                        Create meeting report
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/stories">
                    <div className="text-left">
                      <div className="font-semibold">All Stories</div>
                      <div className="text-sm text-muted-foreground">
                        Manage story pipeline
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/evaluations">
                    <div className="text-left">
                      <div className="font-semibold">Evaluations</div>
                      <div className="text-sm text-muted-foreground">
                        Review evaluations
                      </div>
                    </div>
                  </Link>
                </Button>
              </>
            )}

            {user.role === "evaluator" && (
              <>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/evaluations/pending">
                    <div className="text-left">
                      <div className="font-semibold">My Tasks</div>
                      <div className="text-sm text-muted-foreground">
                        Pending evaluations
                      </div>
                    </div>
                  </Link>
                </Button>
              </>
            )}

            {user.role === "executive" && (
              <>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/approvals">
                    <div className="text-left">
                      <div className="font-semibold">Approvals</div>
                      <div className="text-sm text-muted-foreground">
                        Review one-liners
                      </div>
                    </div>
                  </Link>
                </Button>
              </>
            )}

            {user.role === "legal" && (
              <>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/legal">
                    <div className="text-left">
                      <div className="font-semibold">Legal Reviews</div>
                      <div className="text-sm text-muted-foreground">
                        Manage legal reviews
                      </div>
                    </div>
                  </Link>
                </Button>
              </>
            )}

            {user.role === "finance" && (
              <>
                <Button asChild variant="outline" className="h-auto py-4">
                  <Link href="/finance/payments">
                    <div className="text-left">
                      <div className="font-semibold">Payments</div>
                      <div className="text-sm text-muted-foreground">
                        Manage payments
                      </div>
                    </div>
                  </Link>
                </Button>
              </>
            )}

            <AdminPanelLink />

            <Button asChild variant="outline" className="h-auto py-4">
              <Link href="/stories" prefetch>
                <div className="text-left">
                  <div className="font-semibold">Browse Stories</div>
                  <div className="text-sm text-muted-foreground">
                    View all stories
                  </div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates in the content pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => {
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

                  // Format activity description based on action type
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
                      activityDescription = `Submitted evaluation for: ${activity.details?.project_title || 'Untitled Project'}`;
                      ActivityIcon = CheckCircle2;
                      activityLink = `/content-department/evaluations/${activity.entityId}`;
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
                      className="block p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <ActivityIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {activityDescription}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              By {activity.performedBy}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{formattedTime}</p>
                          <p className="text-xs text-muted-foreground">{formattedDate}</p>
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
      </main>
    </div>
  );
}