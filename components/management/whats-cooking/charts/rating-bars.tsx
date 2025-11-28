"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface RatingBarsProps {
  ideas: ActiveIdeaDetail[];
}

export function RatingBars({ ideas }: RatingBarsProps) {
  const data = useMemo(() => {
    const high = ideas.filter(i => i.overall_rating !== null && i.overall_rating >= 8).length;
    const medium = ideas.filter(i => i.overall_rating !== null && i.overall_rating >= 5 && i.overall_rating < 8).length;
    const low = ideas.filter(i => i.overall_rating !== null && i.overall_rating < 5).length;
    const unrated = ideas.filter(i => i.overall_rating === null).length;

    return [
      { name: "High", label: "8-10", value: high, color: "#22c55e" },
      { name: "Medium", label: "5-7", value: medium, color: "#f59e0b" },
      { name: "Low", label: "1-4", value: low, color: "#ef4444" },
      { name: "Unrated", label: "N/A", value: unrated, color: "#9ca3af" },
    ];
  }, [ideas]);

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Rating Distribution</h3>
      
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
          >
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, maxValue * 1.2]} />
            <Tooltip
              formatter={(value: number) => [`${value} projects`, "Count"]}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              label={{ 
                position: 'top', 
                fontSize: 11, 
                fill: '#374151',
                fontWeight: 600
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-[10px] text-gray-500 mt-1">
        {data.map(item => (
          <div key={item.name} className="flex items-center gap-1">
            <span 
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

