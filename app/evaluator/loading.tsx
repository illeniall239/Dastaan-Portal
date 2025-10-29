import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsGridSkeleton } from "@/components/skeletons/stats-grid-skeleton";
import { NotificationSkeleton } from "@/components/skeletons/notification-skeleton";

export default function EvaluatorLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-96 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
      </div>

      {/* Pending Evaluations Notification Skeleton */}
      <NotificationSkeleton />

      {/* Stats Grid Skeleton */}
      <StatsGridSkeleton />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Quick Actions Skeleton */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <Card className="h-full shadow-lg border-0">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-4 p-4 rounded-xl border">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl border">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Pending & Completed Evaluations Skeleton */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Pending Evaluations Skeleton */}
          <Card className="h-full shadow-lg border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Completed Evaluations Skeleton */}
          <Card className="h-full shadow-lg border-0">
            <CardHeader>
              <Skeleton className="h-6 w-52 mb-2" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <div className="text-right ml-4">
                        <Skeleton className="h-10 w-16 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
