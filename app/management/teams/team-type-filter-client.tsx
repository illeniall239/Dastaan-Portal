"use client";

import { useState } from "react";
import { TeamTypeFilter } from "@/components/management/team-performance/team-type-filter";
import { TeamComparisonTable } from "@/components/management/team-performance/team-comparison-table";
import type { TeamPerformance } from "@/types";

interface TeamTypeFilterClientProps {
  teams: TeamPerformance[];
}

export function TeamTypeFilterClient({ teams }: TeamTypeFilterClientProps) {
  const [selectedType, setSelectedType] = useState<string>("all");

  return (
    <>
      <div className="mb-4">
        <TeamTypeFilter value={selectedType} onChange={setSelectedType} />
      </div>
      <TeamComparisonTable teams={teams} filteredType={selectedType} />
    </>
  );
}
