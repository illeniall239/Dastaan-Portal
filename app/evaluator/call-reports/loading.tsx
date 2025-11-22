import { CallReportCardsGridSkeleton } from "@/components/skeletons/call-report-card-skeleton";

export default function CallReportsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header - Static, shows immediately */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Writer Engagement Reports</h1>
          <p className="text-muted-foreground mt-1">
            View all logged writer engagement reports
          </p>
        </div>
      </div>

      {/* Call Reports List - Show skeletons while fetching */}
      <CallReportCardsGridSkeleton count={3} />
    </div>
  );
}
