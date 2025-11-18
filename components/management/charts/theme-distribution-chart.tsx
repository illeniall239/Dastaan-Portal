"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { THEME_COLORS, getThemeColor } from "@/lib/management/color-palettes";

interface ThemeDistributionChartProps {
  ideas: ActiveIdeaDetail[];
}

export function ThemeDistributionChart({ ideas }: ThemeDistributionChartProps) {
  const distributionData = useMemo(() => {
    const themeCounts: Record<string, number> = {};

    ideas.forEach(idea => {
      const theme = idea.theme || 'Unspecified';
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });

    const total = ideas.length;

    return Object.entries(themeCounts)
      .map(([theme, count]) => ({
        name: theme,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
        color: getThemeColor(theme)
      }))
      .sort((a, b) => b.count - a.count);
  }, [ideas]);

  const totalIdeas = ideas.length;
  const themeCount = distributionData.length;
  const topTheme = distributionData[0]?.name || 'N/A';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Theme Distribution</CardTitle>
            <CardDescription>
              {totalIdeas} ideas • {themeCount} unique themes
            </CardDescription>
          </div>
          <Heart className="h-5 w-5 text-pink-500" />
        </div>
      </CardHeader>
      <CardContent>
        {totalIdeas === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No ideas to display</p>
          </div>
        ) : (
          <>
            {/* Most Popular Theme Badge */}
            <div className="mb-4 flex justify-center">
              <div
                className="px-4 py-2 border rounded-lg"
                style={{
                  backgroundColor: `${getThemeColor(topTheme)}15`,
                  borderColor: getThemeColor(topTheme)
                }}
              >
                <div className="text-xs font-medium mb-1" style={{ color: getThemeColor(topTheme) }}>
                  Most Popular Theme
                </div>
                <div className="text-2xl font-bold" style={{ color: getThemeColor(topTheme) }}>
                  {topTheme}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {distributionData[0]?.count} ideas ({distributionData[0]?.percentage}%)
                </div>
              </div>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="flex justify-center items-center w-full">
              <ResponsiveContainer width="100%" height={Math.max(distributionData.length * 50, 300)}>
                <BarChart
                  data={distributionData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#6b7280"
                    width={110}
                    tick={{ fontSize: 13 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} ideas (${props.payload.percentage}%)`,
                      props.payload.name
                    ]}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
