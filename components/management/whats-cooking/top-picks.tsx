"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { getThemeColor, getStatusLabel } from "@/lib/management/color-palettes";

interface TopPicksProps {
  ideas: ActiveIdeaDetail[];
}

export function TopPicks({ ideas }: TopPicksProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);

  // Get top rated ideas (7+), prefer average_initial_assessment
  const getEffectiveRating = (i: ActiveIdeaDetail) => i.average_initial_assessment ?? i.overall_rating;

  const allTopIdeas = ideas
    .filter(idea => { const r = getEffectiveRating(idea); return r !== null && r >= 7; })
    .sort((a, b) => (getEffectiveRating(b) || 0) - (getEffectiveRating(a) || 0));

  const topIdeas = allTopIdeas.slice(0, 6);

  const handleViewAll = () => {
    setModalData({
      title: "Top Picks - All High-Rated Ideas",
      subtitle: `${allTopIdeas.length} ideas rated 7.0 or higher`,
      type: "table",
      data: allTopIdeas,
      columns: [
        { key: "working_title", label: "Title" },
        {
          key: "overall_rating",
          label: "Rating",
          format: (value: number | null) => value !== null ? value.toFixed(1) : "N/A"
        },
        {
          key: "genre",
          label: "Genre",
          format: (value: string[]) => value ? value.join(", ") : "N/A"
        },
        { key: "category", label: "Category" },
        {
          key: "average_score",
          label: "Avg Score",
          format: (value: number) => value ? value.toFixed(2) : "N/A"
        },
        {
          key: "evaluator_count",
          label: "Evaluators",
          format: (value: number) => `${value || 0}`
        },
        { key: "slot", label: "Slot" },
        {
          key: "status",
          label: "Status",
          format: (value: string) => value?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'
        }
      ]
    });
    setModalOpen(true);
  };

  if (topIdeas.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-[#224794]" />
          <h2 className="text-lg font-semibold text-gray-900">Top Picks</h2>
        </div>
        <p className="text-gray-500 text-sm">No high-rated ideas yet. Ideas with rating 7+ will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#224794]" />
          <h2 className="text-lg font-semibold text-gray-900">Top Picks</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{allTopIdeas.length} high-rated projects</span>
          {allTopIdeas.length > 6 && (
            <Button
              onClick={handleViewAll}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All →
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topIdeas.map((idea) => {
          const themeColor = getThemeColor(idea.theme);

          return (
            <Link
              key={idea.id}
              href={`/management/active-projects/${idea.id}`}
              className="block"
            >
              <Card
                className="p-4 hover:shadow-md transition-shadow border-l-4 h-full"
                style={{ borderLeftColor: themeColor }}
              >
                {/* Rating prominently displayed */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-lg">
                    <Star className="h-4 w-4 text-green-600 fill-green-600" />
                    <span className="text-xl font-bold text-green-700">
                      {(idea.average_initial_assessment ?? idea.overall_rating)?.toFixed(1)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs border-gray-200 text-gray-600">
                    {getStatusLabel(idea.status)}
                  </Badge>
                </div>

                {/* Title */}
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                  {idea.working_title}
                </h3>

                {/* Details */}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Writer:</span>
                    <span className="truncate">{idea.writer_names?.join(', ') || idea.writer_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Genre:</span>
                    <span>{idea.genre?.join(', ') || '—'}</span>
                  </div>
                  {idea.theme && (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: themeColor }}
                      />
                      <span className="text-gray-500">{idea.theme}</span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </div>
  );
}

