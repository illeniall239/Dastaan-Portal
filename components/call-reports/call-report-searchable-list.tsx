"use client";

import { useState, useMemo } from "react";
import { CallReportSearchFilters, type CallReportFilters } from "./call-report-search-filters";
import { CallReportCard } from "@/components/evaluator/call-report-card";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

interface CallReportSearchableListProps {
  callReports: any[];
  portalPrefix: string;
  emptyStateHref: string;
  isTeamHead?: boolean;
  currentTeamId?: string;
}

export function CallReportSearchableList({
  callReports,
  portalPrefix,
  emptyStateHref,
  isTeamHead = false,
  currentTeamId,
}: CallReportSearchableListProps) {
  const [filters, setFilters] = useState<CallReportFilters>({
    search: "",
    sortBy: "newest",
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  const filteredReports = useMemo(() => {
    let result = [...callReports];

    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter((report) => {
        const title = (report.title || report.working_title || "").toLowerCase();
        const writerNames = (report.writer_names || []).join(", ").toLowerCase();
        const writerName = (report.writer_name || "").toLowerCase();
        const reportId = (report.call_report_id || "").toLowerCase();
        const logline = (report.logline || "").toLowerCase();
        const genre = Array.isArray(report.genre) ? report.genre.join(", ").toLowerCase() : "";

        return (
          title.includes(search) ||
          writerNames.includes(search) ||
          writerName.includes(search) ||
          reportId.includes(search) ||
          logline.includes(search) ||
          genre.includes(search)
        );
      });
    }

    // Sort
    switch (filters.sortBy) {
      case "newest":
        result.sort((a, b) => {
          const dateA = new Date(a.original_submission_date || a.meeting_date || a.created_at || 0).getTime();
          const dateB = new Date(b.original_submission_date || b.meeting_date || b.created_at || 0).getTime();
          return dateB - dateA;
        });
        break;
      case "oldest":
        result.sort((a, b) => {
          const dateA = new Date(a.original_submission_date || a.meeting_date || a.created_at || 0).getTime();
          const dateB = new Date(b.original_submission_date || b.meeting_date || b.created_at || 0).getTime();
          return dateA - dateB;
        });
        break;
      case "score_high":
        result.sort((a, b) => {
          const scoreA = a.current_average_score ?? -1;
          const scoreB = b.current_average_score ?? -1;
          return scoreB - scoreA;
        });
        break;
      case "score_low":
        result.sort((a, b) => {
          const scoreA = a.current_average_score ?? Infinity;
          const scoreB = b.current_average_score ?? Infinity;
          return scoreA - scoreB;
        });
        break;
    }

    return result;
  }, [callReports, debouncedSearch, filters.sortBy]);

  if (callReports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
          <FileTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No one-liner reports yet</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Start by logging your first one-liner report.
          </p>
          <Button asChild>
            <Link href={emptyStateHref}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Log Your First One-Liner Report
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CallReportSearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={callReports.length}
        filteredCount={filteredReports.length}
      />

      <div className="grid gap-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 px-4">
              <p className="text-sm text-muted-foreground">
                No reports match your search. Try adjusting your filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report: any) => (
            <CallReportCard
              key={report.id}
              report={report}
              portalPrefix={portalPrefix}
              isTeamHead={isTeamHead}
              currentTeamId={currentTeamId}
            />
          ))
        )}
      </div>
    </div>
  );
}
