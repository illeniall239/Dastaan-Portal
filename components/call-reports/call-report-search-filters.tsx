"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export interface CallReportFilters {
  search: string;
  sortBy: "newest" | "oldest" | "score_high" | "score_low";
}

interface CallReportSearchFiltersProps {
  filters: CallReportFilters;
  onFiltersChange: (filters: CallReportFilters) => void;
  totalCount: number;
  filteredCount: number;
}

export function CallReportSearchFilters({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: CallReportSearchFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, writer, ID..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-9"
          />
        </div>

        {/* Sort */}
        <Select
          value={filters.sortBy}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              sortBy: value as CallReportFilters["sortBy"],
            })
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

      {/* Results count */}
      {filters.search && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} reports
        </p>
      )}
    </div>
  );
}
