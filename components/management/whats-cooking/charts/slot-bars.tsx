"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface SlotBarsProps {
  ideas: ActiveIdeaDetail[];
}

export function SlotBars({ ideas }: SlotBarsProps) {
  const data = useMemo(() => {
    const slotCounts: Record<string, number> = {};
    
    ideas.forEach(idea => {
      const slot = idea.slot || "Unassigned";
      slotCounts[slot] = (slotCounts[slot] || 0) + 1;
    });

    // Sort slots in time order, with Unassigned at the end
    const sortedSlots = Object.entries(slotCounts)
      .sort((a, b) => {
        if (a[0] === "Unassigned") return 1;
        if (b[0] === "Unassigned") return -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([name, value]) => ({ name, value }));

    return sortedSlots;
  }, [ideas]);

  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">By Time Slot</h3>
      
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 60, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
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
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.name === "Unassigned" ? "#9ca3af" : "#224794"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>{data.filter(d => d.name !== "Unassigned").length} slots assigned</span>
        <span>{data.find(d => d.name === "Unassigned")?.value || 0} unassigned</span>
      </div>
    </Card>
  );
}

