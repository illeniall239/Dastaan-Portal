"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Pin } from "lucide-react";
import { EvaluatorTimeFilter, TimeRange } from "./evaluator-time-filter";
import { useEvaluatorStats, type EvaluatorStats } from "@/lib/hooks";

interface EvaluatorLeaderboardProps {
  evaluators: EvaluatorStats[];
}

export function EvaluatorLeaderboard({ evaluators }: EvaluatorLeaderboardProps) {
  const [selectedPreset, setSelectedPreset] = useState("all");
  const [selectedLabel, setSelectedLabel] = useState("All Time");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [freezePanes, setFreezePanes] = useState(false);

  // React Query hook for fetching evaluator stats with time range filtering
  const { data: apiStats, isLoading } = useEvaluatorStats({
    from: dateRange.from,
    to: dateRange.to,
    enabled: selectedPreset !== "all",
  });

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedPreset(range.preset);
    setSelectedLabel(range.label);

    if (range.preset !== "all") {
      // Update date range to trigger React Query refetch
      setDateRange({ from: range.from, to: range.to });
    }
  };

  // Determine which stats to display
  let displayStats: EvaluatorStats[];
  if (selectedPreset === "all") {
    // For "all time", use the initial evaluators prop
    displayStats = evaluators;
  } else {
    // For date-filtered data, use React Query results
    displayStats = apiStats || [];
  }

  // Sort alphabetically by evaluator name
  const sortedEvaluators = [...displayStats].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg">Evaluator Activity Overview</CardTitle>
              <Users className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-blue-500" />
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Activity and performance metrics for all evaluators - {selectedLabel}
            </CardDescription>
          </div>
          <div className="flex-shrink-0 w-full sm:w-auto flex items-center gap-2">
            <EvaluatorTimeFilter
              selectedPreset={selectedPreset}
              onChange={handleTimeRangeChange}
            />
            <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-8 text-xs px-2 shrink-0">
              <Pin className="h-3 w-3" />
              {freezePanes ? "Unfreeze" : "Freeze Panes"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-500" />
            <span className="ml-2 sm:ml-3 text-sm text-muted-foreground">Loading data...</span>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <div className="overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow className={freezePanes ? "sticky top-0 z-10" : ""}>
                    <TableHead className={`text-xs sm:text-sm bg-background ${freezePanes ? "sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>Evaluator</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm bg-background">Writer Engagement Reports</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm bg-background">Episodic Evaluations</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm bg-background">One-liner Evaluations</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm bg-background">Total Activities</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm bg-background">Time Spent (mins/day)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEvaluators.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                        No activity in this time period
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedEvaluators.map((evaluator) => (
                      <TableRow key={evaluator.id}>
                        <TableCell className={`p-2 sm:p-4 bg-white ${freezePanes ? "sticky left-0 z-[9] shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>
                          <div>
                            <p className="font-medium text-xs sm:text-sm">{evaluator.name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{evaluator.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm p-2 sm:p-4">
                          {evaluator.writerEngagementReports}
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm p-2 sm:p-4">
                          {evaluator.episodicEvals}
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm p-2 sm:p-4">
                          {evaluator.oneLinerEvaluations}
                        </TableCell>
                        <TableCell className="text-center p-2 sm:p-4">
                          <Badge variant="outline" className="font-bold text-[10px] sm:text-xs">
                            {evaluator.totalEvaluations}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm p-2 sm:p-4">
                          {evaluator.avgTimeSpent.toFixed(1)} mins/day
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
