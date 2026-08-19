import { FileText, Film, FolderOpen, Calendar } from "lucide-react";
import { BsStatCard } from "./bs-stat-card";

interface BsRowStatsProps {
  callReportsCount: number;
  episodesCount: number;
  pipelineCount: number;
  meetingsCount: number;
}

export function BsRowStats({
  callReportsCount,
  episodesCount,
  pipelineCount,
  meetingsCount,
}: BsRowStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <BsStatCard
        label="Projects logged"
        value={callReportsCount}
        icon={FolderOpen}
        iconColor="#5B4BFF"
        href="/content-department/call-reports"
      />
      <BsStatCard
        label="Episodes logged"
        value={episodesCount}
        icon={Film}
        iconColor="#8B5CF6"
        href="/content-department/episodes"
      />
      <BsStatCard
        label="In pipeline"
        value={pipelineCount}
        icon={FileText}
        iconColor="#FF6B4A"
      />
      <BsStatCard
        label="Upcoming meetings"
        value={meetingsCount}
        icon={Calendar}
        iconColor="#12B886"
        href="/content-department/calendar"
      />
    </div>
  );
}
