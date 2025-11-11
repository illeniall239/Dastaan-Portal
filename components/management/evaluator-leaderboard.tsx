"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";
import { EvaluatorTimeFilter, TimeRange } from "./evaluator-time-filter";
import { filterSampleEvaluatorStatsByTimeRange } from "@/lib/management/sample-data";
import { useEvaluatorStats, type EvaluatorStats } from "@/lib/hooks";

interface EvaluatorLeaderboardProps {
  evaluators: EvaluatorStats[];
  useSampleData?: boolean;
}

export function EvaluatorLeaderboard({ evaluators, useSampleData = false }: EvaluatorLeaderboardProps) {
  const [selectedPreset, setSelectedPreset] = useState("all");
  const [selectedLabel, setSelectedLabel] = useState("All Time");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // React Query hook for fetching evaluator stats with time range filtering
  const { data: apiStats, isLoading } = useEvaluatorStats({
    from: dateRange.from,
    to: dateRange.to,
    enabled: !useSampleData && selectedPreset !== "all",
  });

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedPreset(range.preset);
    setSelectedLabel(range.label);

    if (!useSampleData && range.preset !== "all") {
      // For real data, update date range to trigger React Query refetch
      setDateRange({ from: range.from, to: range.to });
    }
  };

  // Determine which stats to display
  let displayStats: EvaluatorStats[];
  if (useSampleData) {
    // For sample data, filter client-side
    displayStats = filterSampleEvaluatorStatsByTimeRange(evaluators, selectedPreset);
  } else if (selectedPreset === "all") {
    // For "all time", use the initial evaluators prop
    displayStats = evaluators;
  } else {
    // For date-filtered real data, use React Query results
    displayStats = apiStats || [];
  }

  // Sort by total evaluations (highest to lowest)
  const sortedEvaluators = [...displayStats].sort((a, b) => b.totalEvaluations - a.totalEvaluations);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl">Evaluator Activity Overview</CardTitle>
              <Users className="h-6 w-6 text-blue-500" />
              {useSampleData && (
                <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-400 text-xs font-semibold">
                  DEMO DATA
                </Badge>
              )}
            </div>
            <CardDescription>
              Activity and performance metrics for all evaluators - {selectedLabel}
            </CardDescription>
          </div>
          <div className="flex-shrink-0">
            <EvaluatorTimeFilter
              selectedPreset={selectedPreset}
              onChange={handleTimeRangeChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-muted-foreground">Loading data...</span>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluator</TableHead>
                  <TableHead className="text-center">Total One-Liners</TableHead>
                  <TableHead className="text-center">Episodic Evaluations</TableHead>
                  <TableHead className="text-center">Writer Engagement Reports</TableHead>
                  <TableHead className="text-center">Total Activities</TableHead>
                  <TableHead className="text-center">Avg Time Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEvaluators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No activity in this time period
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEvaluators.map((evaluator) => (
                    <TableRow key={evaluator.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{evaluator.name}</p>
                          <p className="text-xs text-muted-foreground">{evaluator.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {evaluator.oneLinerCount}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {evaluator.episodicEvals}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {evaluator.callReportEvals}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold">
                          {evaluator.totalEvaluations}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {evaluator.avgTimeSpent.toFixed(1)} hrs
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
