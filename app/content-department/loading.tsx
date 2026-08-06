import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon, FileTextIcon } from "lucide-react";
import { StatsGridSkeleton } from "@/components/skeletons/stats-grid-skeleton";
import { ActivityCardSkeleton } from "@/components/skeletons/activity-card-skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContentDepartmentLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header - Static, shows immediately */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-96 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Button disabled className="bg-[#10b981] hover:bg-[#059669]">
            <PlusIcon className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
          <Button disabled variant="outline">
            <FileTextIcon className="h-4 w-4 mr-2" />
            Log One-Liner Report
          </Button>
        </div>
      </div>

      {/* Stats Grid - Show skeleton while fetching */}
      <StatsGridSkeleton />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Quick Actions - Static */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-slate-600">
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Meetings - Show skeletons */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <ActivityCardSkeleton />

          <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Upcoming Meetings</CardTitle>
              <CardDescription className="text-slate-600">
                Scheduled meetings for this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
