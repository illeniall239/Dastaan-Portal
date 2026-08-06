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

// Add Next.js caching - revalidate every 5 minutes for better performance
export const revalidate = 300;

export default async function CallReportsPage() {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Allow content department users to access this page
  if (user.role !== "content_creator") {
    redirect("/permission-denied?message=Only content creators can access one-liner reports.&returnUrl=/content-department");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Page Header - Static, shows immediately */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex flex-col gap-4 sm:gap-6 w-full sm:w-auto">
          <BackButton fallbackHref="/content-department" variant="outline" size="sm" className="w-fit" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">One-Liner Reports</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View all logged one-liner reports
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto lg:flex-shrink-0">
          <Button asChild className="bg-[#224794] hover:bg-[#1a3670] touch-target px-4">
            <Link href="/content-department/log-call-report">
              <PlusIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Log New Report</span>
              <span className="sm:hidden">Log</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* One-Liner Reports List - Show skeleton while fetching */}
      <Suspense fallback={<CallReportCardsGridSkeleton count={3} />}>
        <CallReportsList />
      </Suspense>
    </div>
  );
}

// One-Liner Reports List Component - Fetches data
async function CallReportsList() {
  let callReports: any[] = [];
  try {
    callReports = await getAllCallReports();
  } catch (error) {
    console.error("Error fetching one-liner reports:", error);
  }

  return (
    <CallReportSearchableList
      callReports={callReports}
      portalPrefix="content-department"
      emptyStateHref="/content-department/log-call-report"
    />
  );
}
