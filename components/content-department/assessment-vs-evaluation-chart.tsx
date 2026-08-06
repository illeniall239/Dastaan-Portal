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

interface ComparisonProject {
  id: string;
  title: string;
  initialAssessment: number | null;
  evaluationScore: number | null;
  type: "oneliner" | "episodic";
  episodeNumber?: number;
}

interface AssessmentVsEvaluationChartProps {
  data: ComparisonProject[];
}

export function AssessmentVsEvaluationChart({ data }: AssessmentVsEvaluationChartProps) {
  const oneLiners = useMemo(() => data.filter((d) => d.type === "oneliner"), [data]);
  const episodics = useMemo(() => data.filter((d) => d.type === "episodic"), [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ComparisonChart
        title="One-Liner: Assessment vs Evaluation"
        subtitle="Your initial assessment vs content head's score"
        items={oneLiners}
      />
      <ComparisonChart
        title="Episodic: Assessment vs Evaluation"
        subtitle="Your initial assessment vs content head's score"
        items={episodics}
      />
    </div>
  );
}

function ComparisonChart({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ComparisonProject[];
}) {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [drillDown, setDrillDown] = useState<{
    label: string;
    entries: ComparisonProject[];
  } | null>(null);

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!seen.has(item.title)) seen.set(item.title, item.title);
    }
    return Array.from(seen.values());
  }, [items]);

  const chartData = useMemo(() => {
    const scored = items.filter(
      (i) => i.initialAssessment !== null || i.evaluationScore !== null
    );
    const filtered =
      selectedProject === "all"
        ? scored
        : scored.filter((i) => i.title === selectedProject);

    const initials = filtered
      .map((e) => e.initialAssessment)
      .filter((v): v is number => v !== null);
    const evals = filtered
      .map((e) => e.evaluationScore)
      .filter((v): v is number => v !== null);

    const avgInitial =
      initials.length > 0
        ? Number((initials.reduce((a, b) => a + b, 0) / initials.length).toFixed(1))
        : null;
    const avgEval =
      evals.length > 0
        ? Number((evals.reduce((a, b) => a + b, 0) / evals.length).toFixed(1))
        : null;

    if (avgInitial === null && avgEval === null) return [];

    return [
      {
        name: "Initial Assessment",
        score: avgInitial,
        color: "#f59e0b",
        count: initials.length,
        entries: filtered,
      },
      {
        name: "Content Head Evaluation",
        score: avgEval,
        color: "#3b82f6",
        count: evals.length,
        entries: filtered,
      },
    ];
  }, [items, selectedProject]);

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
            {projectOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 mb-3">{subtitle}</p>

        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No data yet</p>
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
                    value != null
                      ? `${Number(value).toFixed(1)} (${props.payload.count} evals)`
                      : "—",
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
                    formatter={(v: any) => (v != null ? Number(v).toFixed(1) : "")}
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
                {drillDown.entries.length} item
                {drillDown.entries.length !== 1 ? "s" : ""}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Project</th>
                    <th className="py-2 pr-4 font-medium text-right">Initial</th>
                    <th className="py-2 font-medium text-right">Evaluation</th>
                    <th className="py-2 pl-4 font-medium text-right">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {drillDown.entries
                    .filter(
                      (i) =>
                        i.initialAssessment !== null || i.evaluationScore !== null
                    )
                    .sort((a, b) =>
                      a.title.localeCompare(b.title) ||
                      (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
                    )
                    .map((item, i) => {
                      const diff =
                        item.initialAssessment != null &&
                        item.evaluationScore != null
                          ? item.evaluationScore - item.initialAssessment
                          : null;
                      return (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium text-gray-900">
                            {item.episodeNumber != null
                              ? `${item.title} — Ep ${item.episodeNumber}`
                              : item.title}
                          </td>
                          <td className="py-2 pr-4 text-right text-amber-600 font-semibold">
                            {item.initialAssessment?.toFixed(1) ?? "—"}
                          </td>
                          <td className="py-2 text-right text-blue-600 font-semibold">
                            {item.evaluationScore?.toFixed(1) ?? "—"}
                          </td>
                          <td
                            className={`py-2 pl-4 text-right font-semibold ${
                              diff !== null
                                ? diff >= 0
                                  ? "text-green-600"
                                  : "text-red-500"
                                : "text-gray-400"
                            }`}
                          >
                            {diff !== null
                              ? diff >= 0
                                ? `+${diff.toFixed(1)}`
                                : diff.toFixed(1)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
