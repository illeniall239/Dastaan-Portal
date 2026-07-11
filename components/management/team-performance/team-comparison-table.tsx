"use client";

import { useState, useMemo } from "react";
import { useFreezeColumns } from "@/lib/hooks/useFreezeColumns";
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
import { ArrowUpDown, ArrowUp, ArrowDown, Pin } from "lucide-react";
import type { TeamPerformance } from "@/types";

interface TeamComparisonTableProps {
  teams: TeamPerformance[];
  filteredType?: string;
}

type SortField = 'team_name' | 'call_reports_created' | 'evaluations_completed' | 'stories_approved' | 'avg_evaluation_score' | 'team_member_count';
type SortDirection = 'asc' | 'desc';


export function TeamComparisonTable({ teams, filteredType }: TeamComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('team_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [freezePanes, setFreezePanes] = useState(false);
  const freezeRef = useFreezeColumns(freezePanes);

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
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Team Performance Comparison</CardTitle>
            <CardDescription>
              Detailed metrics for all teams - Click column headers to sort
            </CardDescription>
          </div>
          <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-7 text-xs px-2 shrink-0">
            <Pin className="h-3 w-3" />
            {freezePanes ? "Unfreeze" : "Freeze Panes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <Table className="text-sm" wrapperClassName="max-h-[60vh]" wrapperRef={freezeRef}>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="text-xs bg-white">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No teams found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTeams.map((team) => (
                    <TableRow key={team.team_id} className="hover:bg-teal-50/50">
                      <TableCell className="font-medium bg-white">{team.team_name}</TableCell>
                      <TableCell className="text-center">{team.team_member_count || 0}</TableCell>
                      <TableCell className="text-center font-semibold">{team.call_reports_created || 0}</TableCell>
                      <TableCell className="text-center font-semibold">{team.evaluations_completed || 0}</TableCell>
                      <TableCell className="text-center">
                        {team.stories_approved || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {team.avg_evaluation_score ? team.avg_evaluation_score.toFixed(1) : '-'}
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
