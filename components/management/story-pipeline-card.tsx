"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Circle, User } from "lucide-react";
import type { PipelineStory } from "@/types";
import { cn } from "@/lib/utils";

interface StoryPipelineCardProps {
  story: PipelineStory;
  onClick: () => void;
}

export function StoryPipelineCard({ story, onClick }: StoryPipelineCardProps) {
  // Determine card styling based on days in current stage
  const getCardStyles = (days: number) => {
    if (days < 7) return {
      gradient: "from-green-50 to-white",
      border: "border-green-200",
      badge: "bg-green-100 text-green-700 border-green-300",
      accent: "text-green-600"
    };
    if (days <= 14) return {
      gradient: "from-yellow-50 to-white",
      border: "border-yellow-200",
      badge: "bg-yellow-100 text-yellow-700 border-yellow-300",
      accent: "text-yellow-600"
    };
    return {
      gradient: "from-red-50 to-white",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700 border-red-300",
      accent: "text-red-600"
    };
  };

  // Get stage status with better styling
  const getStageIcon = (status: "completed" | "in_progress" | "pending") => {
    switch (status) {
      case "completed":
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          </div>
        );
      case "in_progress":
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
          </div>
        );
    }
  };

  const styles = getCardStyles(story.days_in_current_stage);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 overflow-hidden",
        "bg-gradient-to-br",
        styles.gradient,
        styles.border
      )}
      onClick={onClick}
    >
      {/* Header with gradient accent */}
      <div className={cn("h-1 w-full", styles.accent.replace('text-', 'bg-'))} />

      <div className="p-4">
        {/* Story ID Badge */}
        <div className="flex items-center justify-end mb-2">
          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
            {story.story_id}
          </span>
        </div>

        {/* Story Title - Centered for Urdu */}
        <div className="mb-3 text-center">
          <h3
            className="font-urdu text-lg font-bold leading-relaxed text-slate-900 mb-2 min-h-[2.5rem] flex items-center justify-center"
            dir="rtl"
            lang="ur"
          >
            {story.title}
          </h3>
        </div>

        {/* Writer Name */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 mb-3">
          <User className="h-3 w-3" />
          <span className="line-clamp-1">{story.writer_name}</span>
        </div>

        {/* Genre Badge */}
        <div className="flex justify-center mb-3">
          <Badge variant="outline" className="text-xs font-medium border-slate-300">
            {story.genre}
          </Badge>
        </div>

        {/* Days in Stage - Prominent Display */}
        <div className={cn(
          "flex items-center justify-center gap-2 rounded-lg py-2 px-3 mb-3 border",
          styles.badge
        )}>
          <Clock className={cn("h-4 w-4", styles.accent)} />
          <span className={cn("text-xs font-semibold", styles.accent)}>
            {story.days_in_current_stage} days in current stage
          </span>
        </div>

        {/* Stage Progress Indicators */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-1">
              {getStageIcon(story.stage1_status)}
              <span className="text-[10px] text-slate-500 font-medium">Stage 1</span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
            <div className="flex flex-col items-center gap-1">
              {getStageIcon(story.stage2_status)}
              <span className="text-[10px] text-slate-500 font-medium">Stage 2</span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
            <div className="flex flex-col items-center gap-1">
              {getStageIcon(story.stage3_status)}
              <span className="text-[10px] text-slate-500 font-medium">Stage 3</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
