import { Suspense } from "react";
import { getFeedbackTimeline, getFeedbackTimelineStats } from "@/lib/feedback-timeline/server";
import { FeedbackTimelineStatsCards } from "@/components/programmer/feedback-timeline-stats";
import { FeedbackTimelineTable } from "@/components/programmer/feedback-timeline-table";

// Cache for 5 minutes
export const revalidate = 300;

export default async function FeedbackTimelinePage() {
  return (
    <div className="mobile-container mobile-section space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Feedback Timeline
        </h1>
        <p className="text-gray-500 mt-1">
          Monitor script feedback timelines across all teams
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<PageSkeleton />}>
        <PageContent />
      </Suspense>
    </div>
  );
}

async function PageContent() {
  // Fetch data in parallel
  const [timeline, stats] = await Promise.all([
    getFeedbackTimeline(),
    getFeedbackTimelineStats(),
  ]);

  return (
    <>
      {/* Stats Cards */}
      <FeedbackTimelineStatsCards stats={stats} />

      {/* Timeline Table */}
      <FeedbackTimelineTable data={timeline} />
    </>
  );
}

function PageSkeleton() {
  return (
    <>
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200 shadow-md p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </>
  );
}
