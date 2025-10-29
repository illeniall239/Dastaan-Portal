import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { CallReportCardsGridSkeleton } from "@/components/skeletons/call-report-card-skeleton";

export default function CallReportsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header - Static, shows immediately */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Writer Engagement Reports</h1>
          <p className="text-muted-foreground mt-1">
            View all logged writer engagement reports and meeting documentation
          </p>
        </div>
        <Button asChild className="bg-[#224794] hover:bg-[#1a3670]">
          <Link href="/content-department/log-call-report">
            <PlusIcon className="h-4 w-4 mr-2" />
            Log New Writer Engagement Report
          </Link>
        </Button>
      </div>

      {/* Call Reports List - Show skeletons while fetching */}
      <CallReportCardsGridSkeleton count={3} />
    </div>
  );
}
