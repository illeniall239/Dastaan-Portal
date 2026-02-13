import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { getAllCallReports } from "@/lib/meetings/server";
import { Suspense } from "react";
import { CallReportCardsGridSkeleton } from "@/components/skeletons/call-report-card-skeleton";
import { BackButton } from "@/components/ui/back-button";
import { CallReportSearchableList } from "@/components/call-reports/call-report-searchable-list";

// Add Next.js caching - revalidate every 5 minutes
export const revalidate = 300;

export default async function CallReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "gcm") {
    redirect("/permission-denied?message=Only GCM users can access writer engagement reports.&returnUrl=/gcm");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex flex-col gap-4 sm:gap-6 w-full sm:w-auto">
          <BackButton fallbackHref="/gcm" variant="outline" size="sm" className="w-fit" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Writer Engagement Reports</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View all logged writer engagement reports
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto lg:flex-shrink-0">
          <Button asChild className="bg-[#224794] hover:bg-[#1a3670] touch-target px-4">
            <Link href="/gcm/log-call-report">
              <PlusIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Log New Report</span>
              <span className="sm:hidden">Log</span>
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
    console.error("Error fetching writer engagement reports:", error);
  }

  return (
    <CallReportSearchableList
      callReports={callReports}
      portalPrefix="gcm"
      emptyStateHref="/gcm/log-call-report"
    />
  );
}
