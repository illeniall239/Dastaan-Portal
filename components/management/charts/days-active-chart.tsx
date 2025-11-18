"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface DaysActiveChartProps {
  ideas: ActiveIdeaDetail[];
}

export function DaysActiveChart({ ideas }: DaysActiveChartProps) {
  const distributionData = useMemo(() => {
    const newIdeas = ideas.filter(i => i.days_active < 7).length;
    const activeIdeas = ideas.filter(i => i.days_active >= 7 && i.days_active < 30).length;
    const matureIdeas = ideas.filter(i => i.days_active >= 30 && i.days_active < 60).length;
    const stalledIdeas = ideas.filter(i => i.days_active >= 60).length;
    const total = ideas.length;

    return [
      {
        name: 'New\n(<7 days)',
        count: newIdeas,
        percentage: total > 0 ? ((newIdeas / total) * 100).toFixed(1) : '0',
        color: '#10b981', // green-500
        category: 'new'
      },
      {
        name: 'Active\n(7-30 days)',
        count: activeIdeas,
        percentage: total > 0 ? ((activeIdeas / total) * 100).toFixed(1) : '0',
        color: '#3b82f6', // blue-500
        category: 'active'
      },
      {
        name: 'Mature\n(30-60 days)',
        count: matureIdeas,
        percentage: total > 0 ? ((matureIdeas / total) * 100).toFixed(1) : '0',
        color: '#f59e0b', // amber-500
        category: 'mature'
      },
      {
        name: 'Stalled\n(60+ days)',
        count: stalledIdeas,
        percentage: total > 0 ? ((stalledIdeas / total) * 100).toFixed(1) : '0',
        color: '#ef4444', // red-500
        category: 'stalled'
      }
    ];
  }, [ideas]);

  // Calculate average days active
  const avgDaysActive = useMemo(() => {
    if (ideas.length === 0) return 0;
    const sum = ideas.reduce((acc, i) => acc + i.days_active, 0);
    return Math.round(sum / ideas.length);
  }, [ideas]);

  const totalIdeas = ideas.length;
  const stalledCount = distributionData[3].count;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pipeline Freshness</CardTitle>
            <CardDescription>
              {totalIdeas} ideas • {stalledCount} need attention
            </CardDescription>
          </div>
          <Clock className="h-5 w-5 text-blue-500" />
        </div>
      </CardHeader>
      <CardContent>
        {totalIdeas === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No ideas to display</p>
          </div>
        ) : (
          <>
            {/* Average Days Badge */}
            <div className="mb-4 flex justify-center">
              <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-700 font-medium mb-1">Average Days Active</div>
                <div className="text-2xl font-bold text-blue-600">{avgDaysActive}</div>
                <div className="text-xs text-blue-600 mt-1">days in pipeline</div>
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
                  label={{ value: 'Number of Ideas', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} ideas (${props.payload.percentage}%)`,
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
            <div className="mt-6 grid grid-cols-2 gap-3">
              {distributionData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg border"
                  style={{
                    backgroundColor: `${item.color}10`,
                    borderColor: item.color
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-medium text-slate-700">
                      {item.name.replace('\n', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">{item.count}</div>
                    <div className="text-xs text-slate-500">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
