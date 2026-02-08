"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/shared/team-badge";
import { formatDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeedbackTimelineItem } from "@/types";

interface FeedbackTimelineTableProps {
  data: FeedbackTimelineItem[];
}

type StatusFilter = "all" | "on_time" | "late";

/**
 * Get status badge styling based on late status
 */
function getStatusBadge(item: FeedbackTimelineItem) {
  if (item.isLate) {
    return { label: "Late", className: "bg-red-100 text-red-800 border-red-300" };
  }
  return { label: "On Time", className: "bg-green-100 text-green-800 border-green-300" };
}

/**
 * Get decision badge styling
 */
function getDecisionBadge(decision: string | null) {
  switch (decision) {
    case "approve":
      return { label: "Approved", className: "bg-green-100 text-green-800" };
    case "needs_improvement":
      return { label: "Needs Improvement", className: "bg-amber-100 text-amber-800" };
    case "reject":
      return { label: "Rejected", className: "bg-red-100 text-red-800" };
    default:
      return null;
  }
}

/**
 * Get row background class based on late status
 */
function getRowClass(item: FeedbackTimelineItem): string {
  if (item.isLate) {
    return "bg-red-50/50 hover:bg-red-50";
  }
  return "hover:bg-gray-50";
}

/**
 * Table component for displaying feedback timeline data
 * Features: filtering by team/status, row highlighting for late evaluations
 */
export function FeedbackTimelineTable({ data }: FeedbackTimelineTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  // Get unique team names for filter dropdown
  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    data.forEach((item) => {
      if (item.teamName) {
        teams.add(item.teamName);
      }
    });
    return Array.from(teams).sort();
  }, [data]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "late" && !item.isLate) return false;
        if (statusFilter === "on_time" && item.isLate) return false;
      }

      // Team filter
      if (teamFilter !== "all" && item.teamName !== teamFilter) {
        return false;
      }

      return true;
    });
  }, [data, statusFilter, teamFilter]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
      {/* Header with filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Evaluation Timeline</h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredData.length} of {data.length} evaluations
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="on_time">On Time</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>

            {/* Team Filter */}
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {uniqueTeams.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Team
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Logged
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Evaluated
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Days
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Evaluator
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Delay Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-medium">No evaluations found</p>
                    <p className="text-sm">
                      {data.length === 0
                        ? "No evaluations have been submitted yet."
                        : "Try adjusting your filters to see more results."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const statusBadge = getStatusBadge(item);
                const decisionBadge = getDecisionBadge(item.decision);

                return (
                  <tr
                    key={item.id}
                    className={cn("transition-colors", getRowClass(item))}
                  >
                    {/* Project */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 line-clamp-1">
                            {item.projectTitle}
                          </span>
                          {item.isCrossTeam && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 h-4 shrink-0">
                              Requested
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{item.formId}</span>
                      </div>
                    </td>

                    {/* Team */}
                    <td className="px-4 py-3">
                      {item.teamName && item.teamType ? (
                        <TeamBadge
                          team={{ name: item.teamName, team_type: item.teamType }}
                          size="sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Logged (Call Report Created) */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {item.callReportCreatedAt ? formatDate(item.callReportCreatedAt) : "-"}
                      </span>
                    </td>

                    {/* Evaluated (Submitted) */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {item.submittedAt ? formatDate(item.submittedAt) : "-"}
                      </span>
                    </td>

                    {/* Days to Review */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          item.daysToReview !== null
                            ? item.isLate
                              ? "text-red-600"
                              : "text-green-600"
                            : "text-gray-400"
                        )}
                      >
                        {item.daysToReview !== null ? item.daysToReview : "-"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={cn("text-xs w-fit", statusBadge.className)}
                        >
                          {statusBadge.label}
                        </Badge>
                        {decisionBadge && (
                          <Badge
                            variant="outline"
                            className={cn("text-xs w-fit", decisionBadge.className)}
                          >
                            {decisionBadge.label}
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Evaluator */}
                    <td className="px-4 py-3">
                      {item.evaluatorName ? (
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {item.evaluatorName}
                          </span>
                          {item.evaluatorRole && (
                            <span className="text-xs text-gray-500 capitalize">
                              {item.evaluatorRole.replace("_", " ")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 text-center">
                      {item.averageScore !== null ? (
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            item.averageScore >= 7
                              ? "text-green-600"
                              : item.averageScore >= 5
                                ? "text-amber-600"
                                : "text-red-600"
                          )}
                        >
                          {item.averageScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Delay Reason */}
                    <td className="px-4 py-3 max-w-[200px]">
                      {item.isLate ? (
                        item.delayReason ? (
                          <span className="text-sm text-gray-700 line-clamp-2" title={item.delayReason}>
                            {item.delayReason}
                          </span>
                        ) : (
                          <span className="text-sm text-red-500 italic">
                            No reason provided
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
