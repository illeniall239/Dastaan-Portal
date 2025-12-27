"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import type { TeamPerformance } from "@/types";

interface TeamComparisonTableProps {
  teams: TeamPerformance[];
  filteredType?: string;
}

type SortField = 'team_name' | 'call_reports_created' | 'evaluations_completed' | 'one_liners_logged' | 'stories_approved' | 'avg_evaluation_score' | 'team_member_count';
type SortDirection = 'asc' | 'desc';

const TEAM_TYPE_COLORS: Record<string, string> = {
  production: "bg-blue-100 text-blue-800 border-blue-300",
  channel: "bg-purple-100 text-purple-800 border-purple-300",
  adaptation: "bg-green-100 text-green-800 border-green-300",
  evaluator: "bg-yellow-100 text-yellow-800 border-yellow-300",
  other: "bg-gray-100 text-gray-800 border-gray-300",
};

const TEAM_TYPE_LABELS: Record<string, string> = {
  production: "Production",
  channel: "Channel",
  adaptation: "Adaptation",
  evaluator: "Evaluator",
  other: "Other",
};

export function TeamComparisonTable({ teams, filteredType }: TeamComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('team_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTeams = useMemo(() => {
    const filtered = filteredType && filteredType !== 'all'
      ? teams.filter(t => t.team_type === filteredType)
      : teams;

    return [...filtered].sort((a, b) => {
      const aValue = a[sortField] || 0;
      const bValue = b[sortField] || 0;

      if (sortField === 'team_name') {
        return sortDirection === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      }

      return sortDirection === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  }, [teams, sortField, sortDirection, filteredType]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-teal-600" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-teal-600" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance Comparison</CardTitle>
        <CardDescription>
          Detailed metrics for all teams - Click column headers to sort
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-teal-50"
                      onClick={() => handleSort('team_name')}
                    >
                      Team
                      <SortIcon field="team_name" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center text-xs">Type</TableHead>
                  <TableHead className="text-center text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-teal-50"
                      onClick={() => handleSort('team_member_count')}
                    >
                      Members
                      <SortIcon field="team_member_count" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-teal-50"
                      onClick={() => handleSort('call_reports_created')}
                    >
                      Writer Engagement Reports
                      <SortIcon field="call_reports_created" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-teal-50"
                      onClick={() => handleSort('evaluations_completed')}
                    >
                      Evaluations
                      <SortIcon field="evaluations_completed" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-teal-50"
                      onClick={() => handleSort('one_liners_logged')}
                    >
                      One-Liners
                      <SortIcon field="one_liners_logged" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-teal-50"
                      onClick={() => handleSort('stories_approved')}
                    >
                      Approved
                      <SortIcon field="stories_approved" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 hover:bg-teal-50"
                      onClick={() => handleSort('avg_evaluation_score')}
                    >
                      Avg Score
                      <SortIcon field="avg_evaluation_score" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No teams found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTeams.map((team) => (
                    <TableRow key={team.team_id} className="hover:bg-teal-50/50">
                      <TableCell className="font-medium">{team.team_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${TEAM_TYPE_COLORS[team.team_type]}`}
                        >
                          {TEAM_TYPE_LABELS[team.team_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{team.team_member_count || 0}</TableCell>
                      <TableCell className="text-center">
                        <div>
                          <div className="font-semibold">{team.call_reports_created || 0}</div>
                          <div className="text-xs text-gray-500">
                            {team.call_reports_last_30_days || 0} last 30d
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <div className="font-semibold">{team.evaluations_completed || 0}</div>
                          <div className="text-xs text-gray-500">
                            {team.evaluations_last_30_days || 0} last 30d
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <div className="font-semibold">{team.one_liners_logged || 0}</div>
                          <div className="text-xs text-gray-500">
                            {team.one_liners_last_30_days || 0} last 30d
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {team.stories_approved || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {team.avg_evaluation_score ? team.avg_evaluation_score.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/management/teams/${team.team_id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
