"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, FileText, PenLine, Edit3, Clapperboard, CheckCircle, Play } from "lucide-react";
import Link from "next/link";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { getStatusLabel } from "@/lib/management/color-palettes";

interface StageSummaryProps {
  ideas: ActiveIdeaDetail[];
}

// Simplified stage groupings
const STAGE_GROUPS = [
  {
    key: "discussion",
    label: "Discussion",
    icon: FileText,
    color: "#6366f1", // indigo
    statuses: ["Story Under Discussion/Development", "Contract done - Story Under Discussion/Development", "Story Discussed & Approved"]
  },
  {
    key: "writing",
    label: "In Writing",
    icon: PenLine,
    color: "#f59e0b", // amber
    statuses: ["In Writing", "Pre-Production - In Writing", "Production Planning - In Writing", "In Writing & Editing", "Production Planning - In Writing - Feedback need to discuss"]
  },
  {
    key: "editing",
    label: "In Editing",
    icon: Edit3,
    color: "#8b5cf6", // violet
    statuses: ["Pre Production - In Editing", "Script is in Editing Process", "Need to be Re-Edit", "Revised script is awaited", "Production Planning - In Editing"]
  },
  {
    key: "preproduction",
    label: "Pre-Production",
    icon: Clapperboard,
    color: "#0ea5e9", // sky
    statuses: ["Pre-Production", "In Pre-Production", "Pre Production", "In Pre-Production - Outsource", "Production Planning"]
  },
  {
    key: "completed",
    label: "Script Ready",
    icon: CheckCircle,
    color: "#22c55e", // green
    statuses: ["Script completed", "Script Final", "Script Received/Not Final", "Script completed not on shoot"]
  },
  {
    key: "production",
    label: "In Production",
    icon: Play,
    color: "#ef4444", // red
    statuses: ["On-air Drama", "Project on Shoot"]
  }
];

export function StageSummary({ ideas }: StageSummaryProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  // Group ideas by stage
  const stageData = STAGE_GROUPS.map(stage => {
    const stageIdeas = ideas.filter(idea => 
      stage.statuses.some(s => idea.status?.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(idea.status?.toLowerCase() || ''))
    );
    return {
      ...stage,
      ideas: stageIdeas,
      count: stageIdeas.length
    };
  });

  // Count ideas that don't fit any category
  const categorizedIds = new Set(stageData.flatMap(s => s.ideas.map(i => i.id)));
  const otherIdeas = ideas.filter(idea => !categorizedIds.has(idea.id));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Pipeline by Stage</h2>
        <span className="text-sm text-gray-500">{ideas.length} total projects</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stageData.map((stage) => {
          const Icon = stage.icon;
          const isExpanded = expandedStage === stage.key;

          return (
            <div key={stage.key}>
              <button
                onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                className="w-full text-left"
              >
                <Card 
                  className={`p-4 transition-all hover:shadow-md ${isExpanded ? 'ring-2 ring-offset-1' : ''}`}
                  style={{ 
                    borderTop: `3px solid ${stage.color}`,
                    ...(isExpanded ? { ringColor: stage.color } : {})
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-5 w-5" style={{ color: stage.color }} />
                    {stage.count > 0 && (
                      isExpanded ? 
                        <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                  <div className="text-xs text-gray-500 mt-1">{stage.label}</div>
                </Card>
              </button>

              {/* Expanded list */}
              {isExpanded && stage.count > 0 && (
                <Card className="mt-2 p-3 bg-gray-50 border-gray-200">
                  <ul className="space-y-2">
                    {stage.ideas.slice(0, 5).map(idea => (
                      <li key={idea.id}>
                        <Link
                          href={`/management/active-projects/${idea.id}`}
                          className="text-sm text-gray-700 hover:text-[#224794] hover:underline flex items-center gap-2"
                        >
                          {idea.overall_rating && (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              {idea.overall_rating.toFixed(1)}
                            </span>
                          )}
                          <span className="truncate">{idea.working_title}</span>
                        </Link>
                      </li>
                    ))}
                    {stage.count > 5 && (
                      <li className="text-xs text-gray-400 pt-1">
                        +{stage.count - 5} more
                      </li>
                    )}
                  </ul>
                </Card>
              )}
            </div>
          );
        })}
      </div>

      {/* Other/Uncategorized */}
      {otherIdeas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            <span className="font-medium">{otherIdeas.length}</span> projects in other stages
          </div>
        </div>
      )}
    </div>
  );
}

