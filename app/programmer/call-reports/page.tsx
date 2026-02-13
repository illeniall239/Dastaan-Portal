import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon, FilePenLine } from "lucide-react";
import { getAllCallReports } from "@/lib/meetings/server";
import { Suspense } from "react";
import { CallReportCardsGridSkeleton } from "@/components/skeletons/call-report-card-skeleton";
import { BackButton } from "@/components/ui/back-button";
import { CallReportSearchableList } from "@/components/call-reports/call-report-searchable-list";

// Add Next.js caching - revalidate every 5 minutes
export const revalidate = 300;

export default async function ProgrammerCallReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!["programmer", "management", "admin"].includes(user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex flex-col gap-4 sm:gap-6 w-full sm:w-auto">
          <BackButton fallbackHref="/programmer" variant="outline" size="sm" className="w-fit" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Writer Engagement Reports</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View all logged writer engagement reports across all teams
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto lg:flex-shrink-0">
          <Button asChild size="sm" className="bg-[#224794] hover:bg-[#1a3670] touch-target w-full sm:w-auto">
            <Link href="/programmer/log-call-report">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden md:inline">Log New Writer Engagement Report</span>
              <span className="md:hidden">Log Report</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="touch-target w-full sm:w-auto">
            <Link href="/programmer/log-detailed-one-liner">
              <FilePenLine className="h-4 w-4 mr-1.5" />
              <span className="hidden md:inline">Log Detailed One-Liner</span>
              <span className="md:hidden">One-Liner</span>
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<CallReportCardsGridSkeleton count={3} />}>
        <CallReportsList />
      </Suspense>
    </div>
  );
}

async function CallReportsList() {
  let callReports: any[] = [];
  try {
    callReports = await getAllCallReports();
  } catch (error) {
    console.error("Error fetching call reports:", error);
  }

  return (
    <CallReportSearchableList
      callReports={callReports}
      portalPrefix="programmer"
      emptyStateHref="/programmer/log-call-report"
    />
  );
}
