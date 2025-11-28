"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface EpisodeProgressProps {
  ideas: ActiveIdeaDetail[];
}

export function EpisodeProgress({ ideas }: EpisodeProgressProps) {
  const topProjects = useMemo(() => {
    return ideas
      .filter(idea => idea.total_episodes && idea.total_episodes > 0)
      .sort((a, b) => (b.completion_percentage || 0) - (a.completion_percentage || 0))
      .slice(0, 6);
  }, [ideas]);

  if (topProjects.length === 0) {
    return (
      <Card className="p-4 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Episode Progress</h3>
        <p className="text-xs text-gray-500">No projects with episode data</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Episode Progress</h3>
      
      <div className="space-y-3">
        {topProjects.map((project) => {
          const percentage = project.completion_percentage || 0;
          const received = project.received_episodes || 0;
          const total = project.total_episodes || 0;
          
          // Color based on completion
          let barColor = "#224794";
          if (percentage >= 80) barColor = "#22c55e";
          else if (percentage >= 50) barColor = "#f59e0b";
          else if (percentage < 20) barColor = "#ef4444";

          return (
            <div key={project.id}>
              <div className="flex items-center justify-between mb-1">
                <Link
                  href={`/management/active-projects/${project.id}`}
                  className="text-xs text-gray-700 hover:text-[#224794] hover:underline truncate max-w-[60%]"
                >
                  {project.working_title}
                </Link>
                <span className="text-xs text-gray-500">
                  {received}/{total}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: barColor
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
        Showing top {topProjects.length} by completion
      </div>
    </Card>
  );
}

