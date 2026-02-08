import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";
import { PlusIcon, FileTextIcon, FilePenLine } from "lucide-react";
import { getAllCallReports } from "@/lib/meetings/server";
import { Suspense } from "react";
import { CallReportCardsGridSkeleton } from "@/components/skeletons/call-report-card-skeleton";
import { BackButton } from "@/components/ui/back-button";
import { CallReportCard } from "@/components/evaluator/call-report-card";
import { createClient } from "@/lib/supabase/server";

// Add Next.js caching - revalidate every 5 minutes (300 seconds)
// This significantly improves navigation speed by caching call reports list
export const revalidate = 300;

export default async function EvaluatorCallReportsPage() {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Ensure user has evaluator role
  if (user.role !== "evaluator") {
    redirect("/unauthorized");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Page Header - Static, shows immediately */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
        {/* Left side: Back button + Heading */}
        <div className="flex flex-col gap-4 sm:gap-6 w-full sm:w-auto">
          <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Writer Engagement Reports</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View all logged writer engagement reports
            </p>
          </div>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto lg:flex-shrink-0">
          <Button asChild size="sm" className="bg-[#224794] hover:bg-[#1a3670] touch-target w-full sm:w-auto">
            <Link href="/evaluator/log-call-report">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden md:inline">Log New Writer Engagement Report</span>
              <span className="md:hidden">Log Report</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="touch-target w-full sm:w-auto">
            <Link href="/evaluator/log-detailed-one-liner">
              <FilePenLine className="h-4 w-4 mr-1.5" />
              <span className="hidden md:inline">Log Detailed One-Liner</span>
              <span className="md:hidden">One-Liner</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Call Reports List - Show skeleton while fetching */}
      <Suspense fallback={<CallReportCardsGridSkeleton count={3} />}>
        <CallReportsList />
      </Suspense>
    </div>
  );
}

// Call Reports List Component - Fetches data
async function CallReportsList() {
  // Fetch all call reports
  let callReports: any[] = [];
  try {
    callReports = await getAllCallReports();
  } catch (error) {
    console.error("Error fetching call reports:", error);
  }

  // Check if current user is a team head
  let isTeamHead = false;
  let currentTeamId: string | undefined;
  try {
    const user = await getCurrentUser();
    if (user) {
      const supabase = await createClient();
      const { data: userProfile } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .single();
      currentTeamId = userProfile?.team_id;
      if (currentTeamId) {
        const { data: team } = await supabase
          .from("teams")
          .select("team_head_id")
          .eq("id", currentTeamId)
          .single();
        isTeamHead = team?.team_head_id === user.id;
      }
    }
  } catch {
    // Non-critical, continue without share button
  }

  return (
    <div className="grid gap-4">
      {callReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
            <FileTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No writer engagement reports yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Start by logging your first writer engagement report.
            </p>
            <Button asChild>
              <Link href="/evaluator/log-call-report">
                <PlusIcon className="h-4 w-4 mr-2" />
                Log Your First Writer Engagement Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        callReports.map((report: any) => (
          <CallReportCard
            key={report.id}
            report={report}
            isTeamHead={isTeamHead}
            currentTeamId={currentTeamId}
          />
        ))
      )}
    </div>
  );
}