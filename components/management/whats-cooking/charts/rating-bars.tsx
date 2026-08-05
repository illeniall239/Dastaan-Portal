"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface RatingBarsProps {
  ideas: ActiveIdeaDetail[];
  teams?: { id: string; name: string }[];
}

export function RatingBars({ ideas, teams }: RatingBarsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const filteredIdeas = useMemo(() => {
    if (selectedTeam === "all") return ideas;
    return ideas.filter((idea) => (idea as any).team_id === selectedTeam);
  }, [ideas, selectedTeam]);

  const data = useMemo(() => {
    const high = filteredIdeas.filter(i => i.overall_rating !== null && i.overall_rating >= 8).length;
    const medium = filteredIdeas.filter(i => i.overall_rating !== null && i.overall_rating >= 5 && i.overall_rating < 8).length;
    const low = filteredIdeas.filter(i => i.overall_rating !== null && i.overall_rating < 5).length;
    const unrated = filteredIdeas.filter(i => i.overall_rating === null).length;

    return [
      { name: "High", label: "8-10", value: high, color: "#22c55e" },
      { name: "Medium", label: "5-7", value: medium, color: "#f59e0b" },
      { name: "Low", label: "1-4", value: low, color: "#ef4444" },
      { name: "Unrated", label: "N/A", value: unrated, color: "#9ca3af" },
    ];
  }, [filteredIdeas]);

  const maxValue = Math.max(...data.map(d => d.value), 1);

  const handleBarClick = (barData: any) => {
    const ratingCategory = barData.name;

    let ratingIdeas: ActiveIdeaDetail[];
    switch (ratingCategory) {
      case "High":
        ratingIdeas = filteredIdeas.filter(i => i.overall_rating !== null && i.overall_rating >= 8);
        break;
      case "Medium":
        ratingIdeas = filteredIdeas.filter(i => i.overall_rating !== null && i.overall_rating >= 5 && i.overall_rating < 8);
        break;
      case "Low":
        ratingIdeas = filteredIdeas.filter(i => i.overall_rating !== null && i.overall_rating < 5);
        break;
      case "Unrated":
        ratingIdeas = filteredIdeas.filter(i => i.overall_rating === null);
        break;
      default:
        ratingIdeas = [];
    }

    setModalData({
      title: `${ratingCategory} Rating - ${barData.label}`,
      subtitle: `${ratingIdeas.length} active ${ratingIdeas.length === 1 ? 'idea' : 'ideas'}`,
      type: "table",
      data: ratingIdeas,
      columns: [
        { key: "working_title", label: "Title" },
        {
          key: "genre",
          label: "Genre",
          format: (value: string[]) => value ? value.join(", ") : "N/A"
        },
        {
          key: "category",
          label: "Category",
          format: (value: string) => {
            const labels: Record<string, string> = {
              external_producer: "External Producer",
              writer_pitch: "Writer Pitch",
              inhouse_content: "In-house Content",
              content_head_initiative: "Content Head Initiative",
              given_by_management: "Given by Management",
            };
            return labels[value] || value?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "N/A";
          }
        },
        {
          key: "overall_rating",
          label: "Rating",
          format: (value: number | null) => value !== null ? value.toFixed(1) : "Unrated"
        },
        { key: "slot", label: "Slot" }
      ]
    });
    setModalOpen(true);
  };

  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Rating Distribution</h3>
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
              onClick={handleBarClick}
              cursor="pointer"
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

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </Card>
  );
}
