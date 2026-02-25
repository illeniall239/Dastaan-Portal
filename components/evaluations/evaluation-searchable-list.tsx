"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileTextIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { EvaluationCard } from "./evaluation-card";

export interface EnrichedReport {
  report: any;
  hasEvaluated: boolean;
  myEvaluation?: {
    id: string;
    average_score?: number;
    decision?: string;
  } | null;
  draftProgress?: { percentage: number } | null;
  approvalStatus?: {
    approvals: any[];
    isFullyApproved: boolean;
    isRejected: boolean;
  } | null;
}

interface EvaluationSearchableListProps {
  reports: EnrichedReport[];
  portalPrefix: string;
  emptyTitle: string;
  emptyDescription: string;
  showDecisionFilter?: boolean;
  isTeamHead?: boolean;
  currentTeamId?: string;
  currentUserId?: string;
  currentUserRole?: string;
}

interface Filters {
  search: string;
  sortBy: "newest" | "oldest" | "score_high" | "score_low";
  decision: string;
}

export function EvaluationSearchableList({
  reports,
  portalPrefix,
  emptyTitle,
  emptyDescription,
  showDecisionFilter = false,
  isTeamHead = false,
  currentTeamId,
  currentUserId,
  currentUserRole,
}: EvaluationSearchableListProps) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    sortBy: "newest",
    decision: "all",
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  const filteredReports = useMemo(() => {
    let result = [...reports];

    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter(({ report }) => {
        const title = (
          report.title ||
          report.working_title ||
          ""
        ).toLowerCase();
        const writerNames = (report.writer_names || [])
          .join(", ")
          .toLowerCase();
        const writerName = (report.writer_name || "").toLowerCase();
        const reportId = (report.call_report_id || "").toLowerCase();
        const logline = (report.logline || "").toLowerCase();
        const category = (report.category || "").toLowerCase();

        return (
          title.includes(search) ||
          writerNames.includes(search) ||
          writerName.includes(search) ||
          reportId.includes(search) ||
          logline.includes(search) ||
          category.includes(search)
        );
      });
    }

    // Decision filter
    if (showDecisionFilter && filters.decision !== "all") {
      result = result.filter(
        ({ myEvaluation }) => myEvaluation?.decision === filters.decision
      );
    }

    // Sort
    switch (filters.sortBy) {
      case "newest":
        result.sort((a, b) => {
          const dateA = new Date(
            a.report.meeting_date || a.report.created_at || 0
          ).getTime();
          const dateB = new Date(
            b.report.meeting_date || b.report.created_at || 0
          ).getTime();
          return dateB - dateA;
        });
        break;
      case "oldest":
        result.sort((a, b) => {
          const dateA = new Date(
            a.report.meeting_date || a.report.created_at || 0
          ).getTime();
          const dateB = new Date(
            b.report.meeting_date || b.report.created_at || 0
          ).getTime();
          return dateA - dateB;
        });
        break;
      case "score_high":
        result.sort((a, b) => {
          const scoreA = a.report.current_average_score ?? -1;
          const scoreB = b.report.current_average_score ?? -1;
          return scoreB - scoreA;
        });
        break;
      case "score_low":
        result.sort((a, b) => {
          const scoreA = a.report.current_average_score ?? Infinity;
          const scoreB = b.report.current_average_score ?? Infinity;
          return scoreA - scoreB;
        });
        break;
    }

    return result;
  }, [reports, debouncedSearch, filters.sortBy, filters.decision]);

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
          <FileTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            {emptyDescription}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Sort */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, writer, ID..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-9"
            />
          </div>
          {showDecisionFilter && (
            <Select
              value={filters.decision}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, decision: value }))
              }
            >
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Filter by decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Decisions</SelectItem>
                <SelectItem value="approve">Approved</SelectItem>
                <SelectItem value="reject">Rejected</SelectItem>
                <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select
            value={filters.sortBy}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                sortBy: value as Filters["sortBy"],
              }))
            }
          >
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="score_high">Score: High to Low</SelectItem>
              <SelectItem value="score_low">Score: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filters.search || (showDecisionFilter && filters.decision !== "all")) && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredReports.length} of {reports.length} evaluations
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 px-4">
              <p className="text-sm text-muted-foreground">
                No evaluations match your search. Try adjusting your filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map(
            ({ report, hasEvaluated, myEvaluation, draftProgress, approvalStatus }) => (
              <EvaluationCard
                key={report.id}
                report={report}
                portalPrefix={portalPrefix}
                hasEvaluated={hasEvaluated}
                myEvaluation={myEvaluation}
                draftProgress={draftProgress}
                isTeamHead={isTeamHead}
                currentTeamId={currentTeamId}
                approvalStatus={approvalStatus}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            )
          )
        )}
      </div>
    </div>
  );
}
