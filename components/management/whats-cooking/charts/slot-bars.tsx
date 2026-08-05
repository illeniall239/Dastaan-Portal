"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { getCategoryLabel } from "@/lib/management/color-palettes";

interface SlotBarsProps {
  ideas: ActiveIdeaDetail[];
  teams?: { id: string; name: string }[];
}

export function SlotBars({ ideas, teams }: SlotBarsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const filteredIdeas = useMemo(() => {
    if (selectedTeam === "all") return ideas;
    return ideas.filter((idea) => (idea as any).team_id === selectedTeam);
  }, [ideas, selectedTeam]);

  const data = useMemo(() => {
    const slotCounts: Record<string, number> = {};

    filteredIdeas.forEach(idea => {
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
  }, [filteredIdeas]);

  const handleBarClick = (barData: any) => {
    const slotName = barData.name;

    // Filter ideas for this specific slot
    const slotIdeas = filteredIdeas.filter(idea =>
      (idea.slot || "Unassigned") === slotName
    );

    // Prepare modal data
    setModalData({
      title: `${slotName} - Slot Details`,
      subtitle: `${slotIdeas.length} active ${slotIdeas.length === 1 ? 'idea' : 'ideas'}`,
      type: "table",
      data: slotIdeas,
      columns: [
        { key: "working_title", label: "Title" },
        {
          key: "writer_names",
          label: "Writer",
          format: (value: string[]) => value && value.length > 0 ? value.join(', ') : 'N/A'
        },
        {
          key: "genre",
          label: "Genre",
          format: (value: string[]) => value && value.length > 0 ? value.join(', ') : 'N/A'
        },
        {
          key: "category",
          label: "Category",
          format: (value: string) => getCategoryLabel(value)
        },
        {
          key: "average_score",
          label: "Score",
          format: (value: number) => value ? value.toFixed(2) : "N/A"
        },
        { key: "slot", label: "Slot" }
      ]
    });
    setModalOpen(true);
  };

  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">By Time Slot</h3>
        {teams && teams.length > 0 && (
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="h-36">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            No projects in this filter
          </div>
        ) : (
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
                onClick={handleBarClick}
                cursor="pointer"
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
        )}
      </div>

      {/* Summary */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>{data.filter(d => d.name !== "Unassigned").length} slots assigned</span>
        <span>{data.find(d => d.name === "Unassigned")?.value || 0} unassigned</span>
      </div>

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </Card>
  );
}
