"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { getRatingTier, RATING_COLORS } from "@/lib/management/color-palettes";

interface RatingDistributionChartProps {
  ideas: ActiveIdeaDetail[];
}

export function RatingDistributionChart({ ideas }: RatingDistributionChartProps) {
  const distributionData = useMemo(() => {
    const high = ideas.filter(i => i.overall_rating !== null && i.overall_rating >= 8).length;
    const medium = ideas.filter(i => i.overall_rating !== null && i.overall_rating >= 5 && i.overall_rating < 8).length;
    const low = ideas.filter(i => i.overall_rating !== null && i.overall_rating < 5).length;
    const unrated = ideas.filter(i => i.overall_rating === null).length;
    const total = ideas.length;

    return [
      {
        name: 'High Priority\n(8-10)',
        count: high,
        percentage: total > 0 ? ((high / total) * 100).toFixed(1) : '0',
        color: RATING_COLORS.high.chart,
        tier: 'high' as const
      },
      {
        name: 'Medium Priority\n(5-7)',
        count: medium,
        percentage: total > 0 ? ((medium / total) * 100).toFixed(1) : '0',
        color: RATING_COLORS.medium.chart,
        tier: 'medium' as const
      },
      {
        name: 'Low Priority\n(1-4)',
        count: low,
        percentage: total > 0 ? ((low / total) * 100).toFixed(1) : '0',
        color: RATING_COLORS.low.chart,
        tier: 'low' as const
      },
      {
        name: 'Unrated',
        count: unrated,
        percentage: total > 0 ? ((unrated / total) * 100).toFixed(1) : '0',
        color: RATING_COLORS.unrated.chart,
        tier: 'unrated' as const
      }
    ];
  }, [ideas]);

  // Calculate average rating
  const avgRating = useMemo(() => {
    const ratedIdeas = ideas.filter(i => i.overall_rating !== null);
    if (ratedIdeas.length === 0) return null;
    const sum = ratedIdeas.reduce((acc, i) => acc + (i.overall_rating || 0), 0);
    return (sum / ratedIdeas.length).toFixed(1);
  }, [ideas]);

  const totalIdeas = ideas.length;
  const highPriorityCount = distributionData[0].count;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Rating Distribution</CardTitle>
            <CardDescription>
              {totalIdeas} total ideas • {highPriorityCount} high priority
            </CardDescription>
          </div>
          <Star className="h-5 w-5 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent>
        {totalIdeas === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No ideas to display</p>
          </div>
        ) : (
          <>
            {/* Average Rating Badge */}
            {avgRating && (
              <div className="mb-4 flex justify-center">
                <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="text-xs text-green-700 font-medium mb-1">Average Rating</div>
                  <div className="text-2xl font-bold text-green-600">{avgRating}/10</div>
                </div>
              </div>
            )}

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
