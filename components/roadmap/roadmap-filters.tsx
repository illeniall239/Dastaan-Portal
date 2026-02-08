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
import type { RoadmapStage } from "@/types";
import { STAGE_CONFIG, STAGE_ORDER } from "@/lib/roadmap/constants";

export interface RoadmapFilters {
  search: string;
  stage: RoadmapStage | "all";
  sortBy: "newest" | "oldest" | "progress" | "stuck";
}

interface RoadmapFiltersProps {
  filters: RoadmapFilters;
  onFiltersChange: (filters: RoadmapFilters) => void;
}

export function RoadmapFiltersComponent({
  filters,
  onFiltersChange,
}: RoadmapFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or ID..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9"
        />
      </div>

      {/* Stage filter */}
      <Select
        value={filters.stage}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, stage: value as RoadmapStage | "all" })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          {STAGE_ORDER.map((stage) => (
            <SelectItem key={stage} value={stage}>
              {STAGE_CONFIG[stage].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={filters.sortBy}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            sortBy: value as RoadmapFilters["sortBy"],
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="progress">By Progress</SelectItem>
          <SelectItem value="stuck">Stuck First</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
