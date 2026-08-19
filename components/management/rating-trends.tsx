"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ReferenceLine, CartesianGrid,
} from "recharts";

interface EvaluatorDetail {
  name: string;
  score: number;
  teamName?: string;
}

interface EpisodePoint {
  episode: number;
  avgScore: number;
  evalCount: number;
  evaluators: EvaluatorDetail[];
}

interface ProjectTrend {
  id: string;
  title: string;
  teamName: string;
  onelinerAvg: number | null;
  onelinerEvalCount: number;
  onelinerEvaluators: EvaluatorDetail[];
  episodeTrend: EpisodePoint[];
  trendDirection: "improving" | "declining" | "stable";
  latestScore: number | null;
  dataPoints: number;
}

const TREND_CONFIG = {
  improving: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100 border-green-200", label: "Improving", hex: "#22c55e" },
  declining: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-100 border-red-200", label: "Declining", hex: "#ef4444" },
  stable: { icon: Minus, color: "text-amber-600", bg: "bg-amber-100 border-amber-200", label: "Stable", hex: "#f59e0b" },
};

function scoreColor(score: number): string {
  if (score >= 7) return "#22c55e";
  if (score >= 5) return "#f59e0b";
  return "#ef4444";
}

function scoreBadgeClass(score: number): string {
  if (score >= 7) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

interface ChartPoint {
  label: string;
  score: number;
  evalCount: number;
  evaluators: EvaluatorDetail[];
}

/** Build chart data points: OL first, then Ep 1, Ep 2, ... */
function buildChartData(project: ProjectTrend): ChartPoint[] {
  const points: ChartPoint[] = [];
  if (project.onelinerAvg != null) {
    points.push({
      label: "One-Liner",
      score: project.onelinerAvg,
      evalCount: project.onelinerEvalCount,
      evaluators: project.onelinerEvaluators || [],
    });
  }
  for (const ep of project.episodeTrend) {
    points.push({
      label: `Ep ${ep.episode}`,
      score: ep.avgScore,
      evalCount: ep.evalCount,
      evaluators: ep.evaluators || [],
    });
  }
  return points;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function RatingTrends() {
  const [data, setData] = useState<ProjectTrend[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clickedPoint, setClickedPoint] = useState<ChartPoint | null>(null);

  useEffect(() => {
    fetch(`/api/management/rating-trends?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        const projects = res.projects || [];
        setData(projects);
        // Default to project with most data points
        const withTrend = projects.filter((p: ProjectTrend) => p.dataPoints >= 2);
        if (withTrend.length > 0) setSelectedId(withTrend[0].id);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const projectsWithTrend = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => p.dataPoints >= 2);
  }, [data]);

  const selectedProject = useMemo(() => {
    return projectsWithTrend.find((p) => p.id === selectedId) || null;
  }, [projectsWithTrend, selectedId]);

  const chartData = useMemo(() => {
    if (!selectedProject) return [];
    return buildChartData(selectedProject);
  }, [selectedProject]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || projectsWithTrend.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Need at least one-liner + episode ratings to show trends. No projects qualify yet.
        </CardContent>
      </Card>
    );
  }

  const improving = projectsWithTrend.filter((p) => p.trendDirection === "improving").length;
  const declining = projectsWithTrend.filter((p) => p.trendDirection === "declining").length;
  const stable = projectsWithTrend.filter((p) => p.trendDirection === "stable").length;

  const trend = selectedProject ? TREND_CONFIG[selectedProject.trendDirection] : null;
  const TrendIcon = trend ? trend.icon : Minus;
  const lineColor = trend ? trend.hex : "#6366f1";

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {/* Top row: summary counts + project dropdown */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="font-bold text-sm">{improving}</span>
              <span className="text-gray-500">improving</span>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span className="font-bold text-sm">{declining}</span>
              <span className="text-gray-500">declining</span>
            </div>
            <div className="flex items-center gap-1 text-amber-600">
              <Minus className="h-4 w-4" />
              <span className="font-bold text-sm">{stable}</span>
              <span className="text-gray-500">stable</span>
            </div>
          </div>

          {/* Project dropdown */}
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs truncate"
          >
            {(() => {
              const byTeam = new Map<string, ProjectTrend[]>();
              for (const p of projectsWithTrend) {
                const team = p.teamName || "Unknown";
                if (!byTeam.has(team)) byTeam.set(team, []);
                byTeam.get(team)!.push(p);
              }
              return Array.from(byTeam.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([team, projects]) => (
                  <optgroup key={team} label={team}>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </optgroup>
                ));
            })()}
          </select>
        </div>

        {/* Project info bar */}
        {selectedProject && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{selectedProject.title}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
              {selectedProject.teamName}
            </Badge>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${trend!.bg}`}>
              <TrendIcon className="h-3 w-3 mr-0.5 inline" />
              {trend!.label}
            </Badge>
            {selectedProject.onelinerAvg != null && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${scoreBadgeClass(selectedProject.onelinerAvg)}`}>
                OL: {selectedProject.onelinerAvg.toFixed(1)}
              </Badge>
            )}
            {selectedProject.latestScore != null && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${scoreBadgeClass(selectedProject.latestScore)}`}>
                Latest: {selectedProject.latestScore.toFixed(1)}
              </Badge>
            )}
          </div>
        )}

        {/* Big clear line chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 2, 4, 6, 8, 10]}
            />
            <ReferenceLine
              y={7}
              stroke="#22c55e"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              label={{ value: "Good (7)", position: "right", style: { fontSize: 10, fill: "#22c55e" } }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border rounded-lg shadow-lg px-4 py-3 text-sm">
                    <p className="font-semibold text-gray-800">{d.label}</p>
                    <p className="text-gray-600 mt-1">
                      Score: <span className="font-bold text-lg" style={{ color: scoreColor(d.score) }}>{d.score.toFixed(1)}</span>
                      <span className="text-gray-400">/10</span>
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">{d.evalCount} {d.evalCount === 1 ? "evaluator" : "evaluators"}</p>
                  </div>
                );
              }}
            />

            {/* Horizontal reference line at the one-liner score */}
            {selectedProject?.onelinerAvg != null && (
              <ReferenceLine
                y={selectedProject.onelinerAvg}
                stroke="#6366f1"
                strokeDasharray="6 3"
                strokeOpacity={0.35}
                label={{ value: `OL: ${selectedProject.onelinerAvg.toFixed(1)}`, position: "left", style: { fontSize: 10, fill: "#6366f1", fontWeight: 600 } }}
              />
            )}
            <Line
              type="monotone"
              dataKey="score"
              stroke={lineColor}
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isOL = payload.label === "One-Liner";
                return (
                  <g
                    key={payload.label}
                    style={{ cursor: "pointer" }}
                    onClick={() => setClickedPoint(payload)}
                  >
                    {isOL ? (
                      <rect
                        x={cx - 7}
                        y={cy - 7}
                        width={14}
                        height={14}
                        rx={2}
                        fill="#6366f1"
                        stroke="#fff"
                        strokeWidth={2.5}
                        transform={`rotate(45, ${cx}, ${cy})`}
                      />
                    ) : (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={scoreColor(payload.score)}
                        stroke="#fff"
                        strokeWidth={2.5}
                      />
                    )}
                    {/* Invisible larger hit area for easier clicking */}
                    <circle cx={cx} cy={cy} r={14} fill="transparent" />
                  </g>
                );
              }}
              activeDot={{
                r: 8,
                strokeWidth: 3,
                style: { cursor: "pointer" },
                onClick: (_: any, payload: any) => {
                  if (payload?.payload) setClickedPoint(payload.payload);
                },
              }}
            />
          </LineChart>
        </ResponsiveContainer>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Click any data point to see individual evaluator scores
        </p>

        {/* Point Drill-Down Dialog */}
        <Dialog open={!!clickedPoint} onOpenChange={(open) => !open && setClickedPoint(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span>{clickedPoint?.label}</span>
                {clickedPoint && (
                  <Badge variant="outline" className={`text-xs ${scoreBadgeClass(clickedPoint.score)}`}>
                    Avg: {clickedPoint.score.toFixed(1)}/10
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {clickedPoint && (
              <div className="space-y-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  {clickedPoint.evalCount} {clickedPoint.evalCount === 1 ? "evaluator" : "evaluators"}
                </p>
                {clickedPoint.evaluators.length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(
                      clickedPoint.evaluators.reduce((acc, ev) => {
                        const team = ev.teamName || "Other";
                        if (!acc[team]) acc[team] = [];
                        acc[team].push(ev);
                        return acc;
                      }, {} as Record<string, EvaluatorDetail[]>)
                    )
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([teamName, members]) => {
                        const teamAvg = members.reduce((s, m) => s + m.score, 0) / members.length;
                        return (
                          <div key={teamName} className="rounded-lg border overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b">
                              <span className="text-xs font-semibold text-gray-700">{teamName}</span>
                              <Badge variant="outline" className={`text-[10px] font-bold ${scoreBadgeClass(teamAvg)}`}>
                                avg {teamAvg.toFixed(1)}
                              </Badge>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {members
                                .sort((a, b) => b.score - a.score)
                                .map((ev, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between py-1.5 px-3"
                                  >
                                    <span className="text-sm text-gray-800">{ev.name}</span>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs font-bold ${scoreBadgeClass(ev.score)}`}
                                    >
                                      {ev.score.toFixed(1)}
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No evaluator details available.</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
