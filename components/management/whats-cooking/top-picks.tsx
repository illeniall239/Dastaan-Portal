"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { getThemeColor, getStatusLabel } from "@/lib/management/color-palettes";

interface TopPicksProps {
  ideas: ActiveIdeaDetail[];
}

export function TopPicks({ ideas }: TopPicksProps) {
  // Get top rated ideas (8+), sorted by rating descending
  const topIdeas = ideas
    .filter(idea => idea.overall_rating !== null && idea.overall_rating >= 7)
    .sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))
    .slice(0, 6);

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
        <span className="text-sm text-gray-500">{topIdeas.length} high-rated projects</span>
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
                      {idea.overall_rating?.toFixed(1)}
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
    </div>
  );
}

