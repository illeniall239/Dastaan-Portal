"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface GenreDonutProps {
  ideas: ActiveIdeaDetail[];
  teams?: { id: string; name: string }[];
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
  "Unassigned": "#6b7280",
};

export function GenreDonut({ ideas, teams }: GenreDonutProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [showAllGenres, setShowAllGenres] = useState(false);

  const filteredIdeas = useMemo(() => {
    if (selectedTeam === "all") return ideas;
    return ideas.filter((idea) => (idea as any).team_id === selectedTeam);
  }, [ideas, selectedTeam]);

  const data = useMemo(() => {
    const genreCounts: Record<string, number> = {};

    filteredIdeas.forEach(idea => {
      if (idea.genre && idea.genre.length > 0) {
        idea.genre.forEach(g => {
          const label = (g === "Other" || !g) ? "Unassigned" : g;
          genreCounts[label] = (genreCounts[label] || 0) + 1;
        });
      } else {
        genreCounts["Unassigned"] = (genreCounts["Unassigned"] || 0) + 1;
      }
    });

    return Object.entries(genreCounts)
      .map(([name, value]) => ({
        name,
        value,
        color: GENRE_COLORS[name] || GENRE_COLORS["Unassigned"]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredIdeas]);

  const total = filteredIdeas.length;

  const handleSegmentClick = (data: any) => {
    const genreName = data.name;

    if (!genreName) return;

    const genreIdeas = filteredIdeas.filter(idea => {
      if (genreName === "Unassigned") {
        return !idea.genre || idea.genre.length === 0 || idea.genre.includes("Other");
      }
      return idea.genre && idea.genre.includes(genreName);
    });

    setModalData({
      title: `${genreName} - Genre Details`,
      subtitle: `${genreIdeas.length} active ${genreIdeas.length === 1 ? 'idea' : 'ideas'}`,
      type: "table",
      data: genreIdeas,
      columns: [
        { key: "working_title", label: "Title" },
        {
          key: "genre",
          label: "Genres",
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
        <h3 className="text-sm font-semibold text-gray-900">By Genre</h3>
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
                onClick={handleSegmentClick}
                cursor="pointer"
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
        <div className={`flex-1 space-y-1.5 ${showAllGenres ? "max-h-32 overflow-y-auto" : "overflow-hidden"}`}>
          {(showAllGenres ? data : data.slice(0, 5)).map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 transition-colors"
              onClick={() => handleSegmentClick(item)}
            >
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
            <button
              onClick={() => setShowAllGenres(!showAllGenres)}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              {showAllGenres ? "Show less" : `+${data.length - 5} more`}
            </button>
          )}
        </div>
      </div>

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </Card>
  );
}
