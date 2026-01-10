"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/shared/team-badge";
import type { Team } from "@/types";

interface OverallEvaluation {
  id: string;
  projectId: string;
  projectName: string;
  writerName: string;
  evaluatorId: string;
  evaluatorName: string;
  averageScore: number;
  createdAt: string;
  team?: Team; // Team information for the project
}

interface GroupedEvaluationData {
  [projectName: string]: {
    [writerName: string]: {
      [evaluatorName: string]: number; // average score
    };
  };
}

type SortField = 'project' | 'writer' | 'evaluator' | 'score';
type SortDirection = 'asc' | 'desc';

export function OverallEvaluationsTab() {
  const [evaluations, setEvaluations] = useState<OverallEvaluation[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedEvaluationData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [writers, setWriters] = useState<string[]>([]);
  const [evaluators, setEvaluators] = useState<string[]>([]);
  const [teamsByProject, setTeamsByProject] = useState<Record<string, Team>>({});

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('project');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    async function fetchEvaluations() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/management/overall-evaluations");
        if (!response.ok) {
          throw new Error("Failed to fetch evaluations");
        }

        const data = await response.json();
        setEvaluations(data.evaluations || []);
      } catch (err: any) {
        console.error("Error fetching overall evaluations:", err);
        setError(err.message || "Failed to load evaluations");
      } finally {
        setLoading(false);
      }
    }

    fetchEvaluations();
  }, []);

  // Process and sort data to group by project, writer, and evaluator
  useEffect(() => {
    if (evaluations.length === 0) {
      setGroupedData({});
      setWriters([]);
      setEvaluators([]);
      return;
    }

    const grouped: GroupedEvaluationData = {};
    const writerSet = new Set<string>();
    const evaluatorSet = new Set<string>();
    const teamsMap: Record<string, Team> = {};

    evaluations.forEach(evaluation => {
      // Initialize nested objects if they don't exist
      if (!grouped[evaluation.projectName]) {
        grouped[evaluation.projectName] = {};
      }

      if (!grouped[evaluation.projectName][evaluation.writerName]) {
        grouped[evaluation.projectName][evaluation.writerName] = {};
      }

      // Add the score for this evaluator
      grouped[evaluation.projectName][evaluation.writerName][evaluation.evaluatorName] = evaluation.averageScore;

      // Track team data for this project
      if (evaluation.team && !teamsMap[evaluation.projectName]) {
        teamsMap[evaluation.projectName] = evaluation.team;
      }

      // Track unique writers and evaluators
      writerSet.add(evaluation.writerName);
      evaluatorSet.add(evaluation.evaluatorName);
    });

    setGroupedData(grouped);
    setWriters(Array.from(writerSet).sort());
    setEvaluators(Array.from(evaluatorSet).sort());
    setTeamsByProject(teamsMap);
  }, [evaluations]);

  // Get sorted projects based on current sort criteria
  const getSortedProjects = () => {
    const projects = Object.keys(groupedData);

    switch (sortField) {
      case 'project':
        return sortDirection === 'asc'
          ? [...projects].sort()
          : [...projects].sort().reverse();
      case 'writer':
        // Sort by the first writer in each project
        return [...projects].sort((a, b) => {
          const writersA = Object.keys(groupedData[a] || {});
          const writersB = Object.keys(groupedData[b] || {});
          const firstWriterA = writersA.length > 0 ? writersA[0] : '';
          const firstWriterB = writersB.length > 0 ? writersB[0] : '';

          const comparison = firstWriterA.localeCompare(firstWriterB);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      case 'evaluator':
        // Sort by the first evaluator in each project's first writer
        return [...projects].sort((a, b) => {
          const writersA = groupedData[a] || {};
          const writersB = groupedData[b] || {};
          const firstWriterA = Object.keys(writersA)[0];
          const firstWriterB = Object.keys(writersB)[0];

          const evaluatorsA = firstWriterA ? writersA[firstWriterA] || {} : {};
          const evaluatorsB = firstWriterB ? writersB[firstWriterB] || {} : {};
          const firstEvaluatorA = Object.keys(evaluatorsA)[0] || '';
          const firstEvaluatorB = Object.keys(evaluatorsB)[0] || '';

          const comparison = firstEvaluatorA.localeCompare(firstEvaluatorB);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      default:
        return projects;
    }
  };

  // Get sorted writers for a specific project
  const getSortedWriters = (projectName: string) => {
    const projectWriters = Object.keys(groupedData[projectName] || {});

    switch (sortField) {
      case 'writer':
        return sortDirection === 'asc'
          ? [...projectWriters].sort()
          : [...projectWriters].sort().reverse();
      case 'project':
        // If sorting by project, keep writers in original order
        return projectWriters;
      case 'evaluator':
        // Sort by the first evaluator for each writer
        return [...projectWriters].sort((a, b) => {
          const evaluatorsA = groupedData[projectName][a] || {};
          const evaluatorsB = groupedData[projectName][b] || {};
          const firstEvaluatorA = Object.keys(evaluatorsA)[0] || '';
          const firstEvaluatorB = Object.keys(evaluatorsB)[0] || '';

          const comparison = firstEvaluatorA.localeCompare(firstEvaluatorB);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      default:
        return projectWriters;
    }
  };

  // Toggle sort direction
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;

    return sortDirection === 'asc' ?
      <ArrowUp className="ml-1 h-4 w-4 inline" /> :
      <ArrowDown className="ml-1 h-4 w-4 inline" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center text-destructive">
            <AlertCircle className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">Error loading evaluations</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Overall Evaluations - Bias Detection</CardTitle>
            <p className="text-sm text-muted-foreground">
              View evaluation scores by project, writer, and evaluator to identify potential bias patterns
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortField === 'project' ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort('project')}
            >
              Sort by Project <ArrowUpDown className="ml-1 h-4 w-4" />
              {renderSortIndicator('project')}
            </Button>
            <Button
              variant={sortField === 'writer' ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort('writer')}
            >
              Sort by Writer <ArrowUpDown className="ml-1 h-4 w-4" />
              {renderSortIndicator('writer')}
            </Button>
            <Button
              variant={sortField === 'evaluator' ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort('evaluator')}
            >
              Sort by Evaluator <ArrowUpDown className="ml-1 h-4 w-4" />
              {renderSortIndicator('evaluator')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {evaluations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No evaluations available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 w-64">
                    <button
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={() => toggleSort('project')}
                    >
                      Project {renderSortIndicator('project')}
                    </button>
                  </TableHead>
                  <TableHead className="sticky left-40 bg-background z-10 w-48">
                    <button
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={() => toggleSort('writer')}
                    >
                      Writer {renderSortIndicator('writer')}
                    </button>
                  </TableHead>
                  {evaluators.map(evaluator => (
                    <TableHead key={evaluator} className="text-center min-w-[120px]">
                      <button
                        className="inline-flex items-center gap-1 hover:text-primary transition-colors mx-auto"
                        onClick={() => toggleSort('evaluator')}
                      >
                        {evaluator} {renderSortIndicator('evaluator')}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedProjects().map((projectName, projectIdx) => {
                  const writersData = groupedData[projectName];
                  const sortedWriters = getSortedWriters(projectName);

                  return sortedWriters.map((writerName, writerIdx) => {
                    const evaluatorsData = writersData[writerName];
                    const idx = projectIdx * 1000 + writerIdx; // Create a unique index for styling

                    return (
                      <TableRow key={`${projectName}-${writerName}`} className={idx % 2 === 0 ? "bg-muted/5" : ""}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {writerIdx === 0 ? (
                            <div className="flex items-center gap-2">
                              <span>{projectName}</span>
                              {teamsByProject[projectName] && (
                                <TeamBadge team={teamsByProject[projectName]} size="sm" />
                              )}
                            </div>
                          ) : ""}
                        </TableCell>
                        <TableCell className="sticky left-40 bg-background z-10">
                          {writerName}
                        </TableCell>
                        {evaluators.map(evaluator => {
                          const score = evaluatorsData[evaluator];
                          return (
                            <TableCell key={evaluator} className="text-center">
                              {score !== undefined ? (
                                <Badge
                                  variant="secondary"
                                  className={score >= 7 ? "bg-green-100 text-green-800" :
                                    score >= 5 ? "bg-yellow-100 text-yellow-800" :
                                      "bg-red-100 text-red-800"}
                                >
                                  {score.toFixed(1)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}