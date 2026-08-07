"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowUpDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface ProjectEntry {
  id: string;
  title: string;
  writer: string;
  epsReceived: number;
  totalEps: number;
  slot: string | null;
  teamName: string | null;
  avgScore: number | null;
}

interface Bucket {
  count: number;
  projects: ProjectEntry[];
}

interface BucketsData {
  preCast: Bucket;
  preProduction: Bucket;
  productionStart: Bucket;
}

const PHASE_CONFIG = [
  { key: "preCast" as const, label: "Pre Cast", fill: "#f59e0b" },
  { key: "preProduction" as const, label: "Pre Production", fill: "#3b82f6" },
  { key: "productionStart" as const, label: "Production Start", fill: "#22c55e" },
];

const PHASE_BADGE: Record<string, string> = {
  "Pre Cast": "bg-amber-100 text-amber-700 border-amber-200",
  "Pre Production": "bg-blue-100 text-blue-700 border-blue-200",
  "Production Start": "bg-green-100 text-green-700 border-green-200",
};

const PHASE_PROGRESS: Record<string, string> = {
  "Pre Cast": "bg-amber-500",
  "Pre Production": "bg-blue-500",
  "Production Start": "bg-green-500",
};

function progressPercent(received: number, total: number): number {
  return total === 0 ? 0 : Math.round((received / total) * 100);
}

function scoreColor(score: number): string {
  if (score >= 7) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

// ── Drill-Down Dialog ───────────────────────────────────────────────────────

function PhaseDialog({ phase, projects, onClose }: {
  phase: string;
  projects: ProjectEntry[];
  onClose: () => void;
}) {
  const [sort, setSort] = useState<"default" | "highest" | "lowest">("default");
  const badgeClass = PHASE_BADGE[phase] || "";
  const progressClass = PHASE_PROGRESS[phase] || "bg-gray-500";

  const sorted = (() => {
    if (sort === "default") return projects;
    if (sort === "highest") return projects.filter((p) => p.avgScore != null && p.avgScore >= 7).sort((a, b) => b.avgScore! - a.avgScore!);
    return projects.filter((p) => p.avgScore != null && p.avgScore < 5).sort((a, b) => a.avgScore! - b.avgScore!);
  })();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{phase}</DialogTitle>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badgeClass}`}>
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex rounded-md border overflow-hidden text-[10px] shrink-0 w-fit">
          {(["default", "highest", "lowest"] as const).map((s) => (
            <button
              key={s}
              className={`px-2.5 py-1.5 transition-colors ${
                sort === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
              onClick={() => setSort(s)}
            >
              {s === "default" ? "Default" : s === "highest" ? "Highest Rated" : "Lowest Rated"}
            </button>
          ))}
        </div>

        <div className="overflow-auto flex-1 -mx-6 px-6">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No projects in this phase</div>
          ) : (
            <div className="space-y-3">
              {sorted.map((project) => {
                const pct = progressPercent(project.epsReceived, project.totalEps);
                return (
                  <div key={project.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-snug">
                          {project.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-gray-500">{project.writer}</p>
                          {project.teamName && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                              {project.teamName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {project.avgScore != null && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${scoreColor(project.avgScore)}`}>
                            {project.avgScore.toFixed(1)}/10
                          </Badge>
                        )}
                        {project.slot && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50">
                            {project.slot.replace(":00 ", "")}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {project.epsReceived}/{project.totalEps} eps
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressClass} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-gray-500 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ProductionPhases() {
  const [data, setData] = useState<BucketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<{ phase: string; projects: ProjectEntry[] } | null>(null);
  const [slotFilter, setSlotFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`/api/management/production-phases?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => setData(res.buckets || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No production phase data available.
        </CardContent>
      </Card>
    );
  }

  const totalProjects = data.preCast.count + data.preProduction.count + data.productionStart.count;

  if (totalProjects === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No projects have reached a production phase yet.
        </CardContent>
      </Card>
    );
  }

  const filterProjects = (projects: ProjectEntry[]) =>
    slotFilter === "all" ? projects : projects.filter((p) => p.slot === slotFilter);

  const chartData = PHASE_CONFIG.map((p) => {
    const filtered = filterProjects(data[p.key].projects);
    return {
      name: p.label,
      count: filtered.length,
      fill: p.fill,
      projects: filtered,
    };
  });

  const handleBarClick = (barData: any) => {
    if (barData && barData.count > 0) {
      setSelectedPhase({ phase: barData.name, projects: barData.projects });
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-4">
              {PHASE_CONFIG.map((p) => {
                const filtered = filterProjects(data[p.key].projects);
                return (
                  <div key={p.key} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.fill }} />
                    {p.label}
                    <span className="font-semibold text-gray-800">({filtered.length})</span>
                  </div>
                );
              })}
            </div>
            <div className="flex rounded-md border overflow-hidden text-xs">
              {["all", "7:00 PM", "8:00 PM", "9:00 PM"].map((s) => (
                <button
                  key={s}
                  className={`px-2.5 py-1 transition-colors ${
                    slotFilter === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                  onClick={() => setSlotFilter(s)}
                >
                  {s === "all" ? "All" : s.replace(":00 ", "")}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 5, left: -10 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-800">{d.name}</p>
                      <p className="text-gray-500">{d.count} {d.count === 1 ? "project" : "projects"}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Click to view details</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                cursor="pointer"
                onClick={handleBarClick}
                maxBarSize={80}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Click a bar to see projects in that phase
          </p>
        </CardContent>
      </Card>

      {selectedPhase && (
        <PhaseDialog
          phase={selectedPhase.phase}
          projects={selectedPhase.projects}
          onClose={() => setSelectedPhase(null)}
        />
      )}
    </>
  );
}
