"use client";

import { Card } from "@/components/ui/card";
import { Star, AlertCircle, Minus } from "lucide-react";
import Link from "next/link";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { getThemeColor } from "@/lib/management/color-palettes";

interface RatingTiersProps {
  ideas: ActiveIdeaDetail[];
}

export function RatingTiers({ ideas }: RatingTiersProps) {
  // Categorize by rating
  const highRated = ideas
    .filter(i => i.overall_rating !== null && i.overall_rating >= 8)
    .sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
  
  const mediumRated = ideas
    .filter(i => i.overall_rating !== null && i.overall_rating >= 5 && i.overall_rating < 8)
    .sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
  
  const lowRated = ideas
    .filter(i => i.overall_rating !== null && i.overall_rating < 5)
    .sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
  
  const unrated = ideas.filter(i => i.overall_rating === null);

  const tiers = [
    {
      key: "high",
      label: "High Priority",
      sublabel: "Rating 8-10",
      icon: Star,
      ideas: highRated,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      accentColor: "bg-green-500",
      textColor: "text-green-700",
      iconColor: "text-green-600"
    },
    {
      key: "medium",
      label: "Medium Priority",
      sublabel: "Rating 5-7",
      icon: Minus,
      ideas: mediumRated,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      accentColor: "bg-amber-500",
      textColor: "text-amber-700",
      iconColor: "text-amber-600"
    },
    {
      key: "low",
      label: "Needs Review",
      sublabel: "Rating 1-4",
      icon: AlertCircle,
      ideas: lowRated,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      accentColor: "bg-red-500",
      textColor: "text-red-700",
      iconColor: "text-red-600"
    },
    {
      key: "unrated",
      label: "Pending Evaluation",
      sublabel: "Not yet rated",
      icon: Star,
      ideas: unrated,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      accentColor: "bg-gray-400",
      textColor: "text-gray-600",
      iconColor: "text-gray-400"
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-[#224794]" />
          <h2 className="text-lg font-semibold text-gray-900">By Rating</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          
          return (
            <Card 
              key={tier.key}
              className={`p-3 ${tier.bgColor} ${tier.borderColor} border`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-6 rounded-full ${tier.accentColor}`} />
                  <div>
                    <div className={`text-sm font-semibold ${tier.textColor}`}>{tier.label}</div>
                    <div className="text-[10px] text-gray-500">{tier.sublabel}</div>
                  </div>
                </div>
                <div className={`text-xl font-bold ${tier.textColor}`}>
                  {tier.ideas.length}
                </div>
              </div>

              {/* List */}
              {tier.ideas.length > 0 ? (
                <ul className="space-y-1.5">
                  {tier.ideas.slice(0, 4).map(idea => (
                    <li key={idea.id} className="flex items-center gap-1.5">
                      <span 
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getThemeColor(idea.theme) }}
                        title={idea.theme || "No theme"}
                      />
                      <Link
                        href={`/management/active-projects/${idea.id}`}
                        className="text-xs text-gray-700 hover:text-[#224794] hover:underline truncate flex-1"
                      >
                        {idea.working_title}
                      </Link>
                    </li>
                  ))}
                  {tier.ideas.length > 4 && (
                    <li className="text-[10px] text-gray-400">
                      +{tier.ideas.length - 4} more
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 italic">No projects</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

