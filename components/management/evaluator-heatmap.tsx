"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface EvaluatorActivity {
  evaluatorId: string;
  evaluatorName: string;
  weeklyActivity: {
    weekStart: string;
    count: number;
  }[];
}

interface EvaluatorHeatmapProps {
  activities: EvaluatorActivity[];
}

export function EvaluatorHeatmap({ activities }: EvaluatorHeatmapProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Evaluator Activity Heatmap</CardTitle>
          <CardDescription>Weekly evaluation activity (last 12 weeks)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No activity data available</p>
        </CardContent>
      </Card>
    );
  }

  // Get max count for color scaling
  const maxCount = Math.max(
    ...activities.flatMap(a => a.weeklyActivity.map(w => w.count))
  );

  // Get color based on count
  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-50';
    const intensity = Math.min(Math.floor((count / maxCount) * 5), 4);
    const colors = [
      'bg-blue-100',
      'bg-blue-200',
      'bg-blue-400',
      'bg-blue-600',
      'bg-blue-800',
    ];
    return colors[intensity];
  };

  const getTextColor = (count: number) => {
    if (count === 0) return 'text-slate-400';
    const intensity = Math.min(Math.floor((count / maxCount) * 5), 4);
    return intensity >= 3 ? 'text-white' : 'text-slate-700';
  };

  // Get week headers (last 12 weeks)
  const weekHeaders = activities[0]?.weeklyActivity.map(w => {
    const date = new Date(w.weekStart);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Evaluator Activity Heatmap</CardTitle>
            <CardDescription>Weekly evaluation activity (last 12 weeks)</CardDescription>
          </div>
          <Activity className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header Row */}
            <div className="flex items-center mb-2">
              <div className="w-32 flex-shrink-0"></div>
              <div className="flex gap-1">
                {weekHeaders.map((week, index) => (
                  <div
                    key={index}
                    className="w-12 text-xs text-center text-muted-foreground font-medium"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {week}
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Rows */}
            {activities.map((evaluator) => (
              <div key={evaluator.evaluatorId} className="flex items-center mb-1">
                <div className="w-32 flex-shrink-0 pr-2">
                  <p className="text-sm font-medium truncate" title={evaluator.evaluatorName}>
                    {evaluator.evaluatorName}
                  </p>
                </div>
                <div className="flex gap-1">
                  {evaluator.weeklyActivity.map((week, index) => (
                    <div
                      key={index}
                      className={`w-12 h-12 rounded flex items-center justify-center ${getColor(week.count)} ${getTextColor(week.count)} text-xs font-semibold border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all`}
                      title={`${evaluator.evaluatorName}\n${new Date(week.weekStart).toLocaleDateString()}\n${week.count} evaluation${week.count !== 1 ? 's' : ''}`}
                    >
                      {week.count > 0 ? week.count : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Less</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded"></div>
            <div className="w-4 h-4 bg-blue-100 border border-slate-200 rounded"></div>
            <div className="w-4 h-4 bg-blue-200 border border-slate-200 rounded"></div>
            <div className="w-4 h-4 bg-blue-400 border border-slate-200 rounded"></div>
            <div className="w-4 h-4 bg-blue-600 border border-slate-200 rounded"></div>
            <div className="w-4 h-4 bg-blue-800 border border-slate-200 rounded"></div>
          </div>
          <span className="text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  );
}
