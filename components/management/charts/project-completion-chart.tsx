"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EpisodeMetrics } from "@/lib/management/active-ideas-details";

interface ProjectCompletionChartProps {
  metrics: EpisodeMetrics;
}

export function ProjectCompletionChart({ metrics }: ProjectCompletionChartProps) {
  const total = metrics.totalProjects;

  // Calculate percentages for the bar
  const notStartedPct = total > 0 ? (metrics.projectsNotStarted / total) * 100 : 0;
  const inProgressPct = total > 0 ? (metrics.projectsInProgress / total) * 100 : 0;
  const completePct = total > 0 ? (metrics.projectsComplete / total) * 100 : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-800">
          Project Completion Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="h-8 rounded-full overflow-hidden flex bg-slate-100 mb-6">
          {completePct > 0 && (
            <div
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${completePct}%` }}
            />
          )}
          {inProgressPct > 0 && (
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${inProgressPct}%` }}
            />
          )}
          {notStartedPct > 0 && (
            <div
              className="bg-slate-300 transition-all duration-500"
              style={{ width: `${notStartedPct}%` }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-green-700 font-medium">Complete</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{metrics.projectsComplete}</p>
            <p className="text-xs text-green-600">100% done</p>
          </div>

          <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-700 font-medium">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{metrics.projectsInProgress}</p>
            <p className="text-xs text-amber-600">1-99% done</p>
          </div>

          <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-xs text-slate-700 font-medium">Not Started</span>
            </div>
            <p className="text-2xl font-bold text-slate-700">{metrics.projectsNotStarted}</p>
            <p className="text-xs text-slate-600">0% done</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
