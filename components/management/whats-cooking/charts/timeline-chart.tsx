"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface TimelineChartProps {
  ideas: ActiveIdeaDetail[];
}

export function TimelineChart({ ideas }: TimelineChartProps) {
  const data = useMemo(() => {
    // Get the last 12 weeks of data
    const now = new Date();
    const weeks: { week: string; date: Date; count: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      // Format week label
      const monthDay = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      weeks.push({
        week: monthDay,
        date: weekStart,
        count: 0
      });
    }

    // Count projects per week based on created_at
    ideas.forEach(idea => {
      const createdAt = new Date(idea.created_at);
      
      for (let i = 0; i < weeks.length; i++) {
        const weekStart = weeks[i].date;
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        if (createdAt >= weekStart && createdAt < weekEnd) {
          weeks[i].count++;
          break;
        }
      }
    });

    return weeks.map(w => ({ week: w.week, count: w.count }));
  }, [ideas]);

  const totalRecent = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Projects Added</h3>
        <span className="text-xs text-gray-500">{totalRecent} in last 12 weeks</span>
      </div>
      
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#224794" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#224794" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="week" 
              tick={{ fontSize: 9, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={2}
              angle={-45}
              textAnchor="end"
              height={40}
            />
            <YAxis hide domain={[0, maxCount * 1.2]} />
            <Tooltip
              formatter={(value: number) => [`${value} projects`, "Added"]}
              labelFormatter={(label) => `Week of ${label}`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#224794"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

