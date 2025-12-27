"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileVideo, CheckCircle2, Clock, FolderOpen } from "lucide-react";
import type { EpisodeMetrics } from "@/lib/management/active-ideas-details";

interface EpisodeMetricsCardsProps {
  metrics: EpisodeMetrics;
}

export function EpisodeMetricsCards({ metrics }: EpisodeMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Total Episodes Planned */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileVideo className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-100 font-medium">Episodes Planned</p>
              <p className="text-2xl font-bold text-white">{metrics.totalEpisodesPlanned}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Episodes Received */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-100 font-medium">Episodes Received</p>
              <p className="text-2xl font-bold text-white">{metrics.totalEpisodesReceived}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Episode Delivery Progress */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-100 font-medium">Episode Delivery Progress</p>
              <p className="text-2xl font-bold text-white">{metrics.overallCompletionPercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Projects */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-orange-100 font-medium">Active Projects</p>
              <p className="text-2xl font-bold text-white">{metrics.totalProjects}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
