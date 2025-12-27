"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Palette } from "lucide-react";
import Link from "next/link";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { THEME_COLORS, getThemeColor } from "@/lib/management/color-palettes";

interface ThemeGroupsProps {
  ideas: ActiveIdeaDetail[];
}

export function ThemeGroups({ ideas }: ThemeGroupsProps) {
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  // Group ideas by theme
  const themeGroups: Record<string, ActiveIdeaDetail[]> = {};
  
  ideas.forEach(idea => {
    const theme = idea.theme || "Unspecified";
    if (!themeGroups[theme]) {
      themeGroups[theme] = [];
    }
    themeGroups[theme].push(idea);
  });

  // Sort themes by count (descending), but keep "Unspecified" at the end
  const sortedThemes = Object.entries(themeGroups)
    .sort((a, b) => {
      if (a[0] === "Unspecified") return 1;
      if (b[0] === "Unspecified") return -1;
      return b[1].length - a[1].length;
    });

  // Only show themes that have ideas
  const activeThemes = sortedThemes.filter(([, ideas]) => ideas.length > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-[#224794]" />
          <h2 className="text-lg font-semibold text-gray-900">By Theme</h2>
        </div>
        <span className="text-sm text-gray-500">{activeThemes.length} themes</span>
      </div>

      <div className="space-y-2">
        {activeThemes.map(([theme, themeIdeas]) => {
          const color = getThemeColor(theme === "Unspecified" ? null : theme);
          const isExpanded = expandedTheme === theme;
          
          // Sort ideas by rating within theme
          const sortedIdeas = [...themeIdeas].sort((a, b) => 
            (b.overall_rating || 0) - (a.overall_rating || 0)
          );

          return (
            <div key={theme}>
              <button
                onClick={() => setExpandedTheme(isExpanded ? null : theme)}
                className="w-full"
              >
                <div 
                  className={`flex items-center justify-between p-3 rounded-lg transition-all hover:shadow-sm ${isExpanded ? 'shadow-sm' : ''}`}
                  style={{ 
                    backgroundColor: `${color}15`,
                    borderLeft: `4px solid ${color}`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-gray-900 text-left">{theme}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-700">{themeIdeas.length}</span>
                    {isExpanded ? 
                      <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    }
                  </div>
                </div>
              </button>

              {/* Expanded list */}
              {isExpanded && (
                <div className="ml-7 mt-2 mb-3 pl-4 border-l-2 border-gray-100">
                  <ul className="space-y-2">
                    {sortedIdeas.slice(0, 8).map(idea => (
                      <li key={idea.id} className="flex items-center gap-2">
                        {idea.overall_rating !== null ? (
                          <span 
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              idea.overall_rating >= 8 ? 'bg-green-50 text-green-700' :
                              idea.overall_rating >= 5 ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}
                          >
                            {idea.overall_rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 px-1.5 py-0.5">—</span>
                        )}
                        <Link
                          href={`/management/active-projects/${idea.id}`}
                          className="text-sm text-gray-700 hover:text-[#224794] hover:underline truncate"
                        >
                          {idea.working_title}
                        </Link>
                      </li>
                    ))}
                    {themeIdeas.length > 8 && (
                      <li className="text-xs text-gray-400 pt-1">
                        +{themeIdeas.length - 8} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

