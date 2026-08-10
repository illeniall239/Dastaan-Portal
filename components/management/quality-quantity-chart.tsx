"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Zap, AlertTriangle, Gem } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Cell,
  ReferenceArea,
} from "recharts";

interface EvalDetail {
  name: string;
  score: number;
  count: number;
  team: string | null;
}

interface ProjectPoint {
  id: string;
  title: string;
  writer: string | null;
  contentType: string | null;
  teamId: string;
  teamName: string;
  slot: string | null;
  quality: number;
  onelinerAvg: number | null;
  onelinerEvalCount: number;
  onelinerEvaluators: EvalDetail[];
  episodeAvg: number | null;
  episodicEvalCount: number;
  episodicEvaluators: EvalDetail[];
  quantity: number;
  totalEpisodes: number | null;
  quadrant: 1 | 2 | 3 | 4;
}

interface TeamOption {
  id: string;
  name: string;
}

// Team color palette (distinct, accessible colors)
const TEAM_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

const QUADRANT_CONFIG = {
  1: { label: "Stars", icon: Star, color: "text-green-700", bg: "bg-green-100 border-green-200" },
  2: { label: "Volume Focus", icon: Zap, color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  3: { label: "Needs Attention", icon: AlertTriangle, color: "text-red-700", bg: "bg-red-100 border-red-200" },
  4: { label: "Quality Gems", icon: Gem, color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
};

function scoreBadgeClass(score: number): string {
  if (score >= 7) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

export function QualityQuantityChart() {
  const [data, setData] = useState<ProjectPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState({ quality: 7, quantity: 5 });
  const [slots, setSlots] = useState<string[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [clickedProject, setClickedProject] = useState<ProjectPoint | null>(null);

  useEffect(() => {
    fetch(`/api/management/quality-quantity?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.projects || []);
        setThresholds(res.thresholds || { quality: 7, quantity: 5 });
        setSlots(res.slots || []);
        setTeams(res.teams || []);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  // Build team → color map
  const teamColorMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t, i) => map.set(t.id, TEAM_COLORS[i % TEAM_COLORS.length]));
    return map;
  }, [teams]);

  // Filter data
  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => {
      if (selectedSlot !== "all" && p.slot !== selectedSlot) return false;
      if (selectedTeam !== "all" && p.teamId !== selectedTeam) return false;
      return true;
    });
  }, [data, selectedSlot, selectedTeam]);

  // Quadrant counts
  const quadrantCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of filtered) counts[p.quadrant]++;
    return counts;
  }, [filtered]);

  // Axis domains — fit to data so quadrants look balanced
  const { minQuality, maxQty } = useMemo(() => {
    if (filtered.length === 0) return { minQuality: 0, maxQty: 20 };
    const qualities = filtered.map((p) => p.quality);
    const lowestQ = Math.min(...qualities);
    // Floor to nearest integer, with 1 unit padding, but never below 0
    const minQ = Math.max(0, Math.floor(lowestQ) - 1);
    const highest = Math.max(...filtered.map((p) => p.quantity), thresholds.quantity * 2);
    return { minQuality: minQ, maxQty: Math.ceil(highest * 1.25) };
  }, [filtered, thresholds.quantity]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No projects with evaluations found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {/* Filter row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {/* Quadrant summary badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {([1, 2, 3, 4] as const).map((q) => {
              const cfg = QUADRANT_CONFIG[q];
              const Icon = cfg.icon;
              return (
                <Badge key={q} variant="outline" className={`text-[11px] px-2 py-0.5 ${cfg.bg}`}>
                  <Icon className="h-3 w-3 mr-1 inline" />
                  {cfg.label}: {quadrantCounts[q]}
                </Badge>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Slots</option>
              {slots.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate"
            >
              <option value="all">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scatter chart */}
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 25, right: 20, bottom: 30, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />

            {/* Quadrant background areas */}
            {/* Q1: High Quality, High Quantity (top-right) — green */}
            <ReferenceArea
              x1={thresholds.quality} x2={10}
              y1={thresholds.quantity} y2={maxQty}
              fill="#22c55e" fillOpacity={0.1}
            />
            {/* Q2: Low Quality, High Quantity (top-left) — amber */}
            <ReferenceArea
              x1={minQuality} x2={thresholds.quality}
              y1={thresholds.quantity} y2={maxQty}
              fill="#f59e0b" fillOpacity={0.1}
            />
            {/* Q3: Low Quality, Low Quantity (bottom-left) — red */}
            <ReferenceArea
              x1={minQuality} x2={thresholds.quality}
              y1={0} y2={thresholds.quantity}
              fill="#ef4444" fillOpacity={0.1}
            />
            {/* Q4: High Quality, Low Quantity (bottom-right) — blue */}
            <ReferenceArea
              x1={thresholds.quality} x2={10}
              y1={0} y2={thresholds.quantity}
              fill="#6366f1" fillOpacity={0.1}
            />

            <XAxis
              type="number"
              dataKey="quality"
              domain={[minQuality, 10]}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              label={{ value: "Avg Rating \u2192", position: "insideBottomRight", offset: -5, style: { fontSize: 11, fill: "#374151", fontWeight: 600 } }}
            />
            <YAxis
              type="number"
              dataKey="quantity"
              domain={[0, maxQty]}
              width={40}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              label={{ value: "Eps", position: "top", offset: 10, style: { fontSize: 11, fill: "#374151", fontWeight: 600, textAnchor: "middle" } }}
            />

            {/* Threshold lines — no labels, clean look */}
            <ReferenceLine
              x={thresholds.quality}
              stroke="#d1d5db"
              strokeDasharray="6 3"
              strokeOpacity={0.7}
            />
            <ReferenceLine
              y={thresholds.quantity}
              stroke="#d1d5db"
              strokeDasharray="6 3"
              strokeOpacity={0.7}
            />

            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as ProjectPoint;
                return (
                  <div className="bg-white border rounded-lg shadow-lg px-4 py-3 text-sm max-w-xs">
                    <p className="font-semibold text-gray-900">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.teamName}{p.slot ? ` | ${p.slot}` : ""}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div>
                        <span className="text-xs text-gray-400">Rating</span>
                        <p className="font-bold text-lg" style={{ color: p.quality >= 7 ? "#22c55e" : p.quality >= 5 ? "#f59e0b" : "#ef4444" }}>
                          {p.quality.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Episodes</span>
                        <p className="font-bold text-lg text-gray-800">{p.quantity}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Click for details</p>
                  </div>
                );
              }}
            />

            <Scatter
              data={filtered}
              onClick={(point: any) => {
                if (point) {
                  // Recharts may strip non-axis fields; look up full object by id
                  const full = filtered.find((p) => p.id === point.id) || point;
                  setClickedProject(full as ProjectPoint);
                }
              }}
              cursor="pointer"
            >
              {filtered.map((p, i) => (
                <Cell
                  key={i}
                  fill={teamColorMap.get(p.teamId) || "#6366f1"}
                  r={7}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Team color legend */}
        {selectedTeam === "all" && teams.length > 1 && (
          <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: teamColorMap.get(t.id) || "#6366f1" }}
                />
                {t.name}
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Click any dot to see project details | Quality threshold: {thresholds.quality} | Quantity threshold: {thresholds.quantity} episodes
        </p>

        {/* Drill-down dialog */}
        <Dialog open={!!clickedProject} onOpenChange={(open) => !open && setClickedProject(null)}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{clickedProject?.title}</DialogTitle>
            </DialogHeader>
            {clickedProject && (
              <div className="space-y-4 mt-1">
                {/* Meta badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                    {clickedProject.teamName}
                  </Badge>
                  {clickedProject.slot && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-600 border-gray-200">
                      {clickedProject.slot}
                    </Badge>
                  )}
                  {clickedProject.contentType && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                      {clickedProject.contentType}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${QUADRANT_CONFIG[clickedProject.quadrant].bg}`}>
                    {QUADRANT_CONFIG[clickedProject.quadrant].label}
                  </Badge>
                </div>


                {/* Score cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center border">
                    <p className="text-[10px] text-gray-500 mb-0.5">Combined</p>
                    <p className="text-xl font-bold" style={{ color: clickedProject.quality >= 7 ? "#22c55e" : clickedProject.quality >= 5 ? "#f59e0b" : "#ef4444" }}>
                      {clickedProject.quality.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center border">
                    <p className="text-[10px] text-gray-500 mb-0.5">Eps Delivered</p>
                    <p className="text-xl font-bold text-gray-800">{clickedProject.quantity}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center border">
                    <p className="text-[10px] text-gray-500 mb-0.5">Total Eps</p>
                    <p className="text-xl font-bold text-gray-800">{clickedProject.totalEpisodes ?? "TBD"}</p>
                  </div>
                </div>

                {/* One-Liner Evaluations */}
                {clickedProject.onelinerAvg != null && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700">One-Liner Evaluations</span>
                      <Badge variant="outline" className={`text-xs font-bold ${scoreBadgeClass(clickedProject.onelinerAvg)}`}>
                        Avg: {clickedProject.onelinerAvg.toFixed(1)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {(() => {
                        const evals = clickedProject.onelinerEvaluators || [];
                        const grouped = new Map<string, EvalDetail[]>();
                        for (const ev of evals) {
                          const key = ev.team || "Other";
                          if (!grouped.has(key)) grouped.set(key, []);
                          grouped.get(key)!.push(ev);
                        }
                        return Array.from(grouped.entries()).map(([team, members]) => (
                          <div key={team}>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1 mb-0.5">{team}</p>
                            {members.map((ev, i) => (
                              <div key={i} className="flex items-center justify-between py-1 px-2.5 rounded bg-gray-50 border text-sm">
                                <span className="text-gray-700">{ev.name}</span>
                                <Badge variant="outline" className={`text-[11px] font-bold ${scoreBadgeClass(ev.score)}`}>
                                  {ev.score.toFixed(1)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Episodic Evaluations */}
                {clickedProject.episodeAvg != null && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700">
                        Episodic Evaluations
                        <span className="font-normal text-gray-400 ml-1">({clickedProject.episodicEvalCount} total)</span>
                      </span>
                      <Badge variant="outline" className={`text-xs font-bold ${scoreBadgeClass(clickedProject.episodeAvg)}`}>
                        Avg: {clickedProject.episodeAvg.toFixed(1)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {(() => {
                        const evals = clickedProject.episodicEvaluators || [];
                        const grouped = new Map<string, EvalDetail[]>();
                        for (const ev of evals) {
                          const key = ev.team || "Other";
                          if (!grouped.has(key)) grouped.set(key, []);
                          grouped.get(key)!.push(ev);
                        }
                        return Array.from(grouped.entries()).map(([team, members]) => (
                          <div key={team}>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1 mb-0.5">{team}</p>
                            {members.map((ev, i) => (
                              <div key={i} className="flex items-center justify-between py-1 px-2.5 rounded bg-gray-50 border text-sm">
                                <span className="text-gray-700">
                                  {ev.name}
                                  {ev.count > 1 && <span className="text-gray-400 text-xs ml-1">· {ev.count} eps</span>}
                                </span>
                                <Badge variant="outline" className={`text-[11px] font-bold ${scoreBadgeClass(ev.score)}`}>
                                  {ev.score.toFixed(1)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
