"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, GitBranch, Clock } from "lucide-react";

interface PipelineOverviewCardsProps {
  totalStories: number;
  activePipeline: number;
  avgTimeToCompletion: number;
}

export function PipelineOverviewCards({
  totalStories,
  activePipeline,
  avgTimeToCompletion,
}: PipelineOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Stories Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Total Stories</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700">{totalStories}</p>
              <p className="text-[10px] sm:text-xs text-blue-600 mt-1">All time submissions</p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Pipeline Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-purple-600 font-medium mb-1">Active Pipeline</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-700">{activePipeline}</p>
              <p className="text-[10px] sm:text-xs text-purple-600 mt-1">Currently in progress</p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
              <GitBranch className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Completion Time Card */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-600 font-medium mb-1">Avg Completion</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-700">
                {avgTimeToCompletion.toFixed(0)}
                <span className="text-base sm:text-lg md:text-xl ml-1">days</span>
              </p>
              <p className="text-[10px] sm:text-xs text-green-600 mt-1">Time to completion</p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
