"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface GenreDonutProps {
  ideas: ActiveIdeaDetail[];
}

// Genre colors
const GENRE_COLORS: Record<string, string> = {
  "Romance": "#ec4899",
  "Drama": "#8b5cf6",
  "Thriller": "#ef4444",
  "Comedy": "#f59e0b",
  "Family Drama": "#0ea5e9",
  "Action": "#dc2626",
  "Mystery": "#6366f1",
  "Social": "#14b8a6",
  "Historical": "#a855f7",
  "Other": "#6b7280",
};

export function GenreDonut({ ideas }: GenreDonutProps) {
  const data = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    
    ideas.forEach(idea => {
      if (idea.genre && idea.genre.length > 0) {
        idea.genre.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      } else {
        genreCounts["Other"] = (genreCounts["Other"] || 0) + 1;
      }
    });

    return Object.entries(genreCounts)
      .map(([name, value]) => ({
        name,
        value,
        color: GENRE_COLORS[name] || GENRE_COLORS["Other"]
      }))
      .sort((a, b) => b.value - a.value);
  }, [ideas]);

  const total = ideas.length;

  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">By Genre</h3>
      
      <div className="flex items-center gap-4">
        {/* Donut Chart */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} projects`, name]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{total}</div>
              <div className="text-[10px] text-gray-500">Total</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 overflow-hidden">
          {data.slice(0, 5).map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600 truncate">{item.name}</span>
              </div>
              <span className="font-medium text-gray-900 ml-2">{item.value}</span>
            </div>
          ))}
          {data.length > 5 && (
            <div className="text-[10px] text-gray-400">+{data.length - 5} more</div>
          )}
        </div>
      </div>
    </Card>
  );
}

