"use client";

import { TeamComparisonTable } from "@/components/management/team-performance/team-comparison-table";
import type { TeamPerformance } from "@/types";

interface TeamTypeFilterClientProps {
  teams: TeamPerformance[];
}

export function TeamTypeFilterClient({ teams }: TeamTypeFilterClientProps) {
  return <TeamComparisonTable teams={teams} filteredType="all" />;
}
