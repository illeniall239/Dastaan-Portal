"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  title: string;
}

interface ScoreEntry {
  projectId: string;
  score: number;
  team: string;
  type: string;
  episodeNumber?: number;
}

interface ScoreTrendChartProps {
  projects: Project[];
  scores: ScoreEntry[];
}

const TEAM_CONFIG: Record<string, { label: string; color: string }> = {
  programming: { label: "Programming", color: "#8b5cf6" },
  content_development: { label: "Content Development", color: "#06b6d4" },
  other: { label: "Own Team", color: "#f59e0b" },
};

/* ── Shared inner chart ── */

function TeamScoreChart({
  title,
  subtitle,
  scores,
  projects,
  filterType,
}: {
  title: string;
  subtitle: string;
  scores: ScoreEntry[];
  projects: Project[];
  filterType: "oneliner" | "episodic";
}) {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [drillDown, setDrillDown] = useState<{
    label: string;
    entries: ScoreEntry[];
  } | null>(null);

  const titleMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.title);
    return m;
  }, [projects]);

  const typeScores = useMemo(
    () => scores.filter((s) => s.type === filterType),
    [scores, filterType]
  );

  const projectsWithScores = useMemo(() => {
    const ids = new Set(typeScores.map((s) => s.projectId));
    return projects.filter((p) => ids.has(p.id));
  }, [projects, typeScores]);

  const chartData = useMemo(() => {
    const filtered =
      selectedProject === "all"
        ? typeScores
        : typeScores.filter((s) => s.projectId === selectedProject);

    const teamBuckets: Record<string, ScoreEntry[]> = {};
    for (const s of filtered) {
      if (!TEAM_CONFIG[s.team]) continue;
      if (!teamBuckets[s.team]) teamBuckets[s.team] = [];
      teamBuckets[s.team].push(s);
    }

    return Object.entries(teamBuckets)
      .map(([team, entries]) => ({
        teamKey: team,
        name: TEAM_CONFIG[team]?.label || team,
        score: Number(
          (entries.reduce((a, b) => a + b.score, 0) / entries.length).toFixed(1)
        ),
        count: entries.length,
        color: TEAM_CONFIG[team]?.color || "#9ca3af",
        entries,
      }))
      .sort((a, b) => b.score - a.score);
  }, [typeScores, selectedProject]);

  const handleBarClick = (d: any) => {
    const item = chartData.find((c) => c.name === d.name);
    if (!item) return;
    setDrillDown({ label: item.name, entries: item.entries });
  };

  return (
    <>
      <Card className="p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px] truncate"
          >
            <option value="all">All Projects</option>
            {projectsWithScores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 mb-3">{subtitle}</p>

        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            No data yet
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#374151" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={25}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any, _name: any, props: any) => [
                    `${Number(value).toFixed(1)} (${props.payload.count} evals)`,
                    "Avg Score",
                  ]}
                />
                <Bar
                  dataKey="score"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  cursor="pointer"
                  onClick={handleBarClick}
                >
                  <LabelList
                    dataKey="score"
                    position="top"
                    style={{ fontSize: 14, fontWeight: 700, fill: "#374151" }}
                  />
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{drillDown?.label} — {title}</DialogTitle>
          </DialogHeader>
          {drillDown && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-500">
                {drillDown.entries.length} evaluation
                {drillDown.entries.length !== 1 ? "s" : ""}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Project</th>
                    <th className="py-2 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {drillDown.entries
                    .sort((a, b) => {
                      const tA = titleMap.get(a.projectId) || "";
                      const tB = titleMap.get(b.projectId) || "";
                      return (
                        tA.localeCompare(tB) ||
                        (a.episodeNumber ?? -1) - (b.episodeNumber ?? -1)
                      );
                    })
                    .map((e, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          {e.episodeNumber != null
                            ? `${titleMap.get(e.projectId) || "Untitled"} — Ep ${e.episodeNumber}`
                            : titleMap.get(e.projectId) || "Untitled"}
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-900">
                          {e.score.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Exported wrapper renders two charts ── */

export function ScoreTrendChart({ projects, scores }: ScoreTrendChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TeamScoreChart
        title="One-Liner Scores"
        subtitle="Team-wise average one-liner scores"
        scores={scores}
        projects={projects}
        filterType="oneliner"
      />
      <TeamScoreChart
        title="Episodic Scores"
        subtitle="Team-wise average episode scores"
        scores={scores}
        projects={projects}
        filterType="episodic"
      />
    </div>
  );
}
