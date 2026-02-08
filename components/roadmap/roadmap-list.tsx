"use client";

import { useState, useMemo } from "react";
import { RoadmapFiltersComponent, type RoadmapFilters } from "./roadmap-filters";
import { RoadmapListItemCard } from "./roadmap-list-item";
import { RoadmapDetailModal } from "./roadmap-detail-modal";
import { useDebounce } from "@/lib/hooks/useDebounce";
import type { RoadmapListItem } from "@/types";

interface RoadmapListProps {
  items: RoadmapListItem[];
}

export function RoadmapList({ items }: RoadmapListProps) {
  const [filters, setFilters] = useState<RoadmapFilters>({
    search: "",
    stage: "all",
    sortBy: "newest",
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Debounce search input to prevent lag on every keystroke
  const debouncedSearch = useDebounce(filters.search, 300);

  // Filter and sort items using debounced search
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search filter (use debounced value for smooth typing)
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter(
        (item) =>
          item.workingTitle.toLowerCase().includes(search) ||
          item.callReportId.toLowerCase().includes(search) ||
          item.teamName?.toLowerCase().includes(search)
      );
    }

    // Stage filter
    if (filters.stage !== "all") {
      result = result.filter((item) => item.currentStage === filters.stage);
    }

    // Sort
    switch (filters.sortBy) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
        );
        break;
      case "progress":
        result.sort((a, b) => b.overallProgress - a.overallProgress);
        break;
      case "stuck":
        result.sort((a, b) => {
          const aStuck = a.totalDays > 14 && a.currentStage !== "completed";
          const bStuck = b.totalDays > 14 && b.currentStage !== "completed";
          if (aStuck && !bStuck) return -1;
          if (!aStuck && bStuck) return 1;
          return b.totalDays - a.totalDays;
        });
        break;
    }

    return result;
  }, [items, debouncedSearch, filters.stage, filters.sortBy]);

  function handleItemClick(item: RoadmapListItem) {
    setSelectedId(item.id);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <RoadmapFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredItems.length} of {items.length} ideas
      </p>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No ideas found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <RoadmapListItemCard
              key={item.id}
              item={item}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <RoadmapDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        callReportId={selectedId}
      />
    </div>
  );
}
