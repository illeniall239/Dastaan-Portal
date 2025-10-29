"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Clock, AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";
import { PipelineStageData } from "@/lib/management/pipeline-analytics";

interface PipelineFlowChartProps {
  stages: PipelineStageData[];
  totalStories: number;
  activePipeline: number;
  avgTimeToCompletion: number;
}

export function PipelineFlowChart({
  stages,
  totalStories,
  activePipeline,
  avgTimeToCompletion,
}: PipelineFlowChartProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Get max count for sizing
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  // Color scheme for stages
  const getStageColor = (index: number, bottleneck: boolean) => {
    if (bottleneck) return 'border-red-400 bg-red-50';

    const colors = [
      'border-blue-400 bg-blue-50',
      'border-purple-400 bg-purple-50',
      'border-indigo-400 bg-indigo-50',
      'border-cyan-400 bg-cyan-50',
      'border-teal-400 bg-teal-50',
      'border-green-400 bg-green-50',
      'border-emerald-400 bg-emerald-50',
      'border-lime-400 bg-lime-50',
    ];
    return colors[index % colors.length];
  };

  const getStageTextColor = (index: number, bottleneck: boolean) => {
    if (bottleneck) return 'text-red-700';

    const colors = [
      'text-blue-700',
      'text-purple-700',
      'text-indigo-700',
      'text-cyan-700',
      'text-teal-700',
      'text-green-700',
      'text-emerald-700',
      'text-lime-700',
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Content Pipeline Flow</CardTitle>
            <CardDescription>Story workflow from submission to completion</CardDescription>
          </div>
          <GitBranch className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Stories</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{totalStories}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Active Pipeline</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{activePipeline}</p>
              </div>
              <GitBranch className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Avg Completion</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{avgTimeToCompletion.toFixed(0)}d</p>
              </div>
              <Clock className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Pipeline Stages Flow */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="font-semibold text-slate-700">Pipeline Stages</h4>
            <Badge variant="outline" className="text-xs">Click to drill down</Badge>
          </div>

          {stages.map((stage, index) => {
            const widthPercentage = (stage.count / maxCount) * 100;
            const isSelected = selectedStage === stage.stage;

            return (
              <div key={stage.stage}>
                <button
                  onClick={() => setSelectedStage(isSelected ? null : stage.stage)}
                  className={`w-full text-left transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''
                  }`}
                >
                  <div
                    className={`relative p-4 rounded-lg border-2 ${getStageColor(index, stage.bottleneck)} transition-all`}
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${getStageTextColor(index, stage.bottleneck)}`}>
                          {index + 1}. {stage.displayName}
                        </span>
                        {stage.bottleneck && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Bottleneck
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>

                    {/* Count and Progress Bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="relative w-full h-8 bg-white rounded border border-slate-200 overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 ${getStageColor(index, stage.bottleneck).replace('bg-', 'bg-opacity-40 bg-')} transition-all duration-500`}
                            style={{ width: `${Math.max(widthPercentage, 5)}%` }}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className={`font-bold ${getStageTextColor(index, stage.bottleneck)}`}>
                              {stage.count} stories
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{stage.avgTimeInStage.toFixed(1)}d avg</span>
                        </div>
                      </div>
                    </div>

                    {/* Percentage of total */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {((stage.count / activePipeline) * 100).toFixed(1)}% of active pipeline
                    </div>
                  </div>
                </button>

                {/* Drill-down details (placeholder) */}
                {isSelected && (
                  <div className="mt-2 ml-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h5 className="font-semibold text-sm mb-2">Stage Details</h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Stories in stage</p>
                        <p className="font-bold">{stage.count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg time in stage</p>
                        <p className="font-bold">{stage.avgTimeInStage.toFixed(1)} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-bold">
                          {stage.bottleneck ? (
                            <span className="text-red-600">Needs attention</span>
                          ) : (
                            <span className="text-green-600">On track</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stage progress</p>
                        <p className="font-bold">{((stage.count / activePipeline) * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-blue-600 hover:underline cursor-pointer">
                      View all stories in this stage →
                    </p>
                  </div>
                )}

                {/* Flow Arrow */}
                {index < stages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ChevronRight className="h-5 w-5 text-slate-400 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottleneck Alert */}
        {stages.some(s => s.bottleneck) && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">Bottlenecks Detected</p>
                <p className="text-sm text-red-600 mt-1">
                  {stages.filter(s => s.bottleneck).map(s => s.displayName).join(', ')} {stages.filter(s => s.bottleneck).length === 1 ? 'stage is' : 'stages are'} experiencing delays. Consider allocating more resources.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
