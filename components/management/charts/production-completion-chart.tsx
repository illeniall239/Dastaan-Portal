"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface ProductionCompletionChartProps {
  ideas: ActiveIdeaDetail[];
}

export function ProductionCompletionChart({ ideas }: ProductionCompletionChartProps) {
  const distributionData = useMemo(() => {
    // Filter ideas with episode data
    const ideasWithEpisodes = ideas.filter(i => i.total_episodes && i.total_episodes > 0);

    const notStarted = ideasWithEpisodes.filter(i => !i.received_episodes || i.received_episodes === 0).length;
    const inProgress = ideasWithEpisodes.filter(i =>
      i.received_episodes && i.received_episodes > 0 &&
      i.completion_percentage && i.completion_percentage < 100
    ).length;
    const completed = ideasWithEpisodes.filter(i =>
      i.completion_percentage && i.completion_percentage >= 100
    ).length;
    const total = ideasWithEpisodes.length;

    return [
      {
        name: 'Not Started',
        count: notStarted,
        percentage: total > 0 ? ((notStarted / total) * 100).toFixed(1) : '0',
        color: '#e5e7eb', // gray-200
      },
      {
        name: 'In Progress',
        count: inProgress,
        percentage: total > 0 ? ((inProgress / total) * 100).toFixed(1) : '0',
        color: '#3b82f6', // blue-500
      },
      {
        name: 'Completed',
        count: completed,
        percentage: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
        color: '#10b981', // green-500
      }
    ];
  }, [ideas]);

  // Calculate average completion
  const avgCompletion = useMemo(() => {
    const ideasWithEpisodes = ideas.filter(i => i.total_episodes && i.total_episodes > 0);
    if (ideasWithEpisodes.length === 0) return 0;
    const sum = ideasWithEpisodes.reduce((acc, i) => acc + (i.completion_percentage || 0), 0);
    return Math.round(sum / ideasWithEpisodes.length);
  }, [ideas]);

  const totalTracked = ideas.filter(i => i.total_episodes && i.total_episodes > 0).length;
  const totalIdeas = ideas.length;
  const completedCount = distributionData[2].count;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Production Progress</CardTitle>
            <CardDescription>
              {totalTracked} tracked projects • {completedCount} completed
            </CardDescription>
          </div>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        {totalTracked === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No production data available</p>
            <p className="text-xs mt-2">Add episode counts to track progress</p>
          </div>
        ) : (
          <>
            {/* Average Completion Badge */}
            <div className="mb-4 flex justify-center">
              <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <div className="text-xs text-green-700 font-medium mb-1">Average Completion</div>
                <div className="text-2xl font-bold text-green-600">{avgCompletion}%</div>
                <div className="text-xs text-green-600 mt-1">{totalTracked} of {totalIdeas} ideas tracked</div>
              </div>
            </div>

            {/* Bar Chart */}
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distributionData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  stroke="#6b7280"
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis
                  fontSize={11}
                  stroke="#6b7280"
                  label={{ value: 'Number of Projects', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} projects (${props.payload.percentage}%)`,
                    'Count'
                  ]}
                />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={80}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary Grid */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {distributionData.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-2 rounded-lg border"
                  style={{
                    backgroundColor: `${item.color}10`,
                    borderColor: item.color
                  }}
                >
                  <div
                    className="w-3 h-3 rounded mb-1"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-slate-700 text-center">
                    {item.name}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1">{item.count}</div>
                  <div className="text-xs text-slate-500">{item.percentage}%</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
