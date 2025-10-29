"use client";

import { useState, useEffect } from "react";
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

interface EvaluatorStats {
  id: string;
  name: string;
  email: string;
  oneLinerCount: number;
  episodicEvals: number;
  callReportEvals: number;
  totalEvaluations: number;
  avgTimeSpent: number;
}

interface EvaluatorLeaderboardProps {
  evaluators: EvaluatorStats[];
  useSampleData?: boolean;
}

export function EvaluatorLeaderboard({ evaluators, useSampleData = false }: EvaluatorLeaderboardProps) {
  const [selectedPreset, setSelectedPreset] = useState("all");
  const [selectedLabel, setSelectedLabel] = useState("All Time");
  const [filteredStats, setFilteredStats] = useState(evaluators);
  const [loading, setLoading] = useState(false);

  // Sync state with props when evaluators change (important for sample vs real mode)
  useEffect(() => {
    setFilteredStats(evaluators);
    setSelectedPreset("all");
    setSelectedLabel("All Time");
  }, [evaluators]);

  const handleTimeRangeChange = async (range: TimeRange) => {
    setSelectedPreset(range.preset);
    setSelectedLabel(range.label);
    setLoading(true);

    try {
      if (useSampleData) {
        // For sample data, filter client-side
        const filtered = filterSampleEvaluatorStatsByTimeRange(evaluators, range.preset);
        setFilteredStats(filtered);
      } else {
        // For real data, fetch from API with date params
        const params = new URLSearchParams({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        });

        const response = await fetch(`/api/management/evaluator-stats?${params}`);
        const data = await response.json();

        if (data.success) {
          setFilteredStats(data.stats);
        } else {
          console.error("Failed to fetch filtered stats:", data.error);
          // Keep current stats on error
        }
      }
    } catch (error) {
      console.error("Error filtering evaluator stats:", error);
      // Keep current stats on error
    } finally {
      setLoading(false);
    }
  };

  // Sort by total evaluations (highest to lowest)
  const sortedEvaluators = [...filteredStats].sort((a, b) => b.totalEvaluations - a.totalEvaluations);

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
        {loading ? (
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
