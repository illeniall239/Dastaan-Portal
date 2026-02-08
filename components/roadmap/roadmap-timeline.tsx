"use client";

import { cn } from "@/lib/utils";
import {
  FileText,
  ClipboardCheck,
  ThumbsUp,
  Handshake,
  Scale,
  FileSignature,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import type { RoadmapStageData, RoadmapStageStatus } from "@/types";
import { STAGE_CONFIG } from "@/lib/roadmap/constants";

interface RoadmapTimelineProps {
  stages: RoadmapStageData[];
  onStageClick?: (stage: RoadmapStageData) => void;
  selectedStage?: string | null;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  ClipboardCheck,
  ThumbsUp,
  Handshake,
  Scale,
  FileSignature,
  Wallet,
  CheckCircle2,
};

function getStatusStyles(status: RoadmapStageStatus) {
  switch (status) {
    case "completed":
      return {
        circle: "bg-emerald-500 border-emerald-500 text-white",
        line: "bg-emerald-500",
        label: "text-emerald-700",
      };
    case "in_progress":
      return {
        circle: "bg-blue-500 border-blue-500 text-white animate-pulse",
        line: "bg-gray-200",
        label: "text-blue-700 font-semibold",
      };
    case "pending":
      return {
        circle: "bg-gray-100 border-gray-300 text-gray-400",
        line: "bg-gray-200",
        label: "text-gray-400",
      };
    case "skipped":
      return {
        circle: "bg-gray-50 border-gray-200 text-gray-300",
        line: "bg-gray-200",
        label: "text-gray-300 line-through",
      };
  }
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RoadmapTimeline({
  stages,
  onStageClick,
  selectedStage,
}: RoadmapTimelineProps) {
  return (
    <div className="w-full overflow-x-auto overflow-y-hidden pb-4 pt-6">
      <div className="flex items-start w-full px-4">
        {stages.map((stage, index) => {
          const config = STAGE_CONFIG[stage.stage];
          const Icon = ICONS[config.icon];
          const styles = getStatusStyles(stage.status);
          const isLast = index === stages.length - 1;
          const isSelected = selectedStage === stage.stage;

          return (
            <div
              key={stage.stage}
              className={cn("flex-1 flex flex-col items-center relative", {
                "cursor-pointer": onStageClick,
              })}
              onClick={() => onStageClick?.(stage)}
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute top-6 left-1/2 w-full h-0.5 -z-10",
                    stage.status === "completed" ? "bg-emerald-500" : "bg-gray-200"
                  )}
                />
              )}

              {/* Stage content */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Circle with icon */}
                <div className="relative">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all bg-white relative",
                      styles.circle,
                      isSelected && "ring-2 ring-offset-2 ring-blue-500 scale-110"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Days indicator for in-progress - Positioned absolute */}
                  {stage.status === "in_progress" && stage.daysInStage !== null && (
                    <span className="absolute -top-2 -right-3 z-20 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white shadow-sm border border-white">
                      {stage.daysInStage}d
                    </span>
                  )}
                </div>

                {/* Stage label */}
                <p
                  className={cn(
                    "mt-3 text-xs font-medium text-center transition-colors",
                    styles.label,
                    isSelected && "text-blue-700 font-bold"
                  )}
                >
                  {config.shortLabel}
                </p>

                {/* Date */}
                <p className="text-[10px] text-muted-foreground mt-0.5 min-h-[15px]">
                  {stage.status === "completed"
                    ? formatDate(stage.completedAt)
                    : stage.status === "in_progress"
                      ? "Now"
                      : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div >
  );
}
