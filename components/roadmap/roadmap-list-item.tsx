"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { RoadmapListItem } from "@/types";
import { STAGE_CONFIG } from "@/lib/roadmap/constants";
import { cn } from "@/lib/utils";

interface RoadmapListItemCardProps {
  item: RoadmapListItem;
  onClick?: () => void;
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RoadmapListItemCard({ item, onClick }: RoadmapListItemCardProps) {
  const config = STAGE_CONFIG[item.currentStage];
  const isStuck = item.totalDays > 14 && item.currentStage !== "completed";

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-blue-300",
        { "border-l-4 border-l-red-400": isStuck }
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Title and meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{item.workingTitle}</h3>
              {isStuck && (
                <Badge variant="destructive" className="text-xs">
                  Stuck
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {item.callReportId}
              {item.teamName && (
                <>
                  {" "}
                  <span className="text-gray-300">|</span> {item.teamName}
                </>
              )}
            </p>

            {/* Dates row */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Logged: {formatDate(item.loggedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{item.totalDays} day(s)</span>
              </div>
            </div>
          </div>

          {/* Right: Stage and progress */}
          <div className="flex flex-col items-end gap-2">
            <Badge className={cn("whitespace-nowrap", config.bgColor, config.color)}>
              {config.label}
            </Badge>
            <div className="flex items-center gap-2 w-32">
              <Progress
                value={item.overallProgress}
                className="h-1.5 bg-white border border-gray-100"
                indicatorClassName="bg-primary"
              />
              <span className="text-xs text-muted-foreground min-w-[32px]">
                {item.overallProgress}%
              </span>
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 self-center" />
        </div>
      </CardContent>
    </Card>
  );
}
