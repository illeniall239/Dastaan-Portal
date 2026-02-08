"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Users, FileText } from "lucide-react";
import { RoadmapTimeline } from "./roadmap-timeline";
import { RoadmapStageCard } from "./roadmap-stage-card";
import { STAGE_CONFIG } from "@/lib/roadmap/constants";
import { useRoadmapData } from "@/lib/hooks/queries/useRoadmapData";
import type { RoadmapStageData } from "@/types";

interface RoadmapDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callReportId: string | null;
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RoadmapDetailModal({
  open,
  onOpenChange,
  callReportId,
}: RoadmapDetailModalProps) {
  const [selectedStage, setSelectedStage] = useState<RoadmapStageData | null>(null);

  // Use React Query for data fetching with caching
  const {
    data: roadmapData,
    isLoading: loading,
    error: queryError,
  } = useRoadmapData({
    callReportId,
    enabled: open && !!callReportId,
  });

  const error = queryError ? (queryError as Error).message : null;

  // Reset selected stage when modal closes or select current stage when data loads
  useEffect(() => {
    if (!open) {
      setSelectedStage(null);
    } else if (roadmapData) {
      // Select current stage by default
      const currentStage = roadmapData.stages.find(
        (s: RoadmapStageData) => s.status === "in_progress"
      );
      setSelectedStage(currentStage || roadmapData.stages[0]);
    }
  }, [open, roadmapData]);

  const config = roadmapData ? STAGE_CONFIG[roadmapData.currentStage] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Roadmap Detail</DialogTitle>
          <DialogDescription>View the complete journey of this idea through all workflow stages</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Loading...</h2>
                <p className="text-sm text-muted-foreground mt-1">-</p>
              </div>
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Error Loading Data</h2>
                <p className="text-sm text-muted-foreground mt-1">-</p>
              </div>
            </div>
            <p className="text-red-500">{error}</p>
          </div>
        ) : roadmapData ? (
          <div className="space-y-8 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {roadmapData.workingTitle}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 text-base">
                  {roadmapData.callReportId}
                  {roadmapData.teamName && (
                    <>
                      {" "}
                      <span className="text-gray-300 mx-1">|</span>{" "}
                      {roadmapData.teamName}
                    </>
                  )}
                </p>
              </div>
              {config && (
                <Badge className={`${config.bgColor} ${config.color} px-3 py-1 text-sm mr-8`}>
                  {config.label}
                </Badge>
              )}
            </div>

            {/* Summary info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-white rounded-md border text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Logged</p>
                  <p className="font-medium">{formatDate(roadmapData.loggedAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-white rounded-md border text-muted-foreground">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Days</p>
                  <p className="font-medium">{roadmapData.totalDays}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-white rounded-md border text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Progress</p>
                  <p className="font-medium">{roadmapData.overallProgress}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-white rounded-md border text-muted-foreground">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Writers</p>
                  <p className="font-medium truncate max-w-[120px]" title={roadmapData.writers.join(", ")}>
                    {roadmapData.writers.length > 0
                      ? roadmapData.writers.join(", ")
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                Journey Timeline
              </h3>
              <RoadmapTimeline
                stages={roadmapData.stages}
                selectedStage={selectedStage?.stage}
                onStageClick={setSelectedStage}
              />
            </div>

            {/* Selected stage details */}
            {selectedStage && (
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Stage Details
                </h3>
                <RoadmapStageCard stage={selectedStage} />
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
