"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/lib/hooks";
import { Loader2 } from "lucide-react";

interface DashboardStatsClientProps {
  initialStats?: any; // Pass server-fetched initial stats for hydration if needed
}

export function DashboardStatsClient({ initialStats }: DashboardStatsClientProps) {
  const { data: stats, isLoading } = useDashboardStats();

  // Use initialStats if provided and no data is loaded yet
  const displayStats = stats || initialStats;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {isLoading ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats?.summary?.totalActiveProjects || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active projects
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
              <div className="text-2xl font-bold">{displayStats?.funnel?.in_evaluation || 0}</div>
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
              <div className="text-2xl font-bold">{displayStats?.funnel?.approved || 0}</div>
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
              <div className="text-2xl font-bold">{(displayStats?.funnel?.in_negotiation || 0) + (displayStats?.funnel?.in_legal_review || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Active workflows
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}