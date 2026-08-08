"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface ProjectDelay {
  id: string;
  title: string;
  writer: string;
  teamName: string | null;
  teamId: string | null;
  slot: string | null;
  totalEpisodes: number | null;
  commitmentSchedule: string;
  scheduleLabel: string;
  initiationDate: string;
  daysSinceInitiation: number;
  expectedEpisodes: number;
  actualEpisodes: number;
  delayEpisodes: number;
  delayWeeks: number;
  actualPaceDays: number | null;
  expectedPaceDays: number;
  isOnTrack: boolean;
  delayNotes: string | null;
  revisedDate: string | null;
  revisionReason: string | null;
}

interface TeamSummary {
  teamId: string;
  teamName: string;
  projectCount: number;
  totalDelayEps: number;
  totalExpected: number;
  totalActual: number;
  avgDelayWeeks: number;
  onTrackCount: number;
  delayPercent: number;
}

interface Stats {
  totalProjects: number;
  totalExpected: number;
  totalActual: number;
  totalDelay: number;
  onTrack: number;
  delayed: number;
  overallDelayPercent: number;
  uncappedCount: number;
}

interface DelayData {
  projects: ProjectDelay[];
  teamSummary: TeamSummary[];
  stats: Stats;
}

function delaySeverity(delayEps: number): { label: string; color: string; bg: string } {
  if (delayEps <= 1) return { label: "On Track", color: "text-green-700", bg: "bg-green-100 border-green-200" };
  if (delayEps <= 3) return { label: "Slight Delay", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" };
  if (delayEps <= 6) return { label: "Moderate Delay", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" };
  return { label: "Severe Delay", color: "text-red-700", bg: "bg-red-100 border-red-200" };
}

function teamBarColor(delayPercent: number): string {
  if (delayPercent <= 10) return "#22c55e";
  if (delayPercent <= 30) return "#f59e0b";
  if (delayPercent <= 50) return "#f97316";
  return "#ef4444";
}

// ── Team Drill-Down ────────────────────────────────────────────────────────

function TeamDrillDialog({ team, projects, onClose }: {
  team: TeamSummary;
  projects: ProjectDelay[];
  onClose: () => void;
}) {
  const teamProjects = projects
    .filter((p) => p.teamId === team.teamId)
    .sort((a, b) => b.delayEpisodes - a.delayEpisodes);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{team.teamName}</DialogTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {team.projectCount} projects
            </Badge>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${team.delayPercent > 30 ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
              {team.totalDelayEps} eps behind
            </Badge>
          </div>
        </DialogHeader>

        <div className="overflow-auto flex-1 -mx-6 px-6">
          <div className="space-y-3">
            {teamProjects.map((p) => {
              const sev = delaySeverity(p.delayEpisodes);
              const pct = p.expectedEpisodes > 0 ? Math.round((p.actualEpisodes / p.expectedEpisodes) * 100) : 0;
              return (
                <div key={p.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{p.title}</p>
                      <p className="text-xs text-gray-500">{p.writer}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${sev.bg}`}>
                        {sev.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {p.scheduleLabel}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress bar: actual vs expected */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                      {/* Expected marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-gray-400 z-10"
                        style={{ left: `${Math.min(100, pct > 0 ? 100 : 0)}%` }}
                        title={`Expected: ${p.expectedEpisodes}`}
                      />
                      <div
                        className={`h-full rounded-full transition-all ${p.isOnTrack ? "bg-green-500" : p.delayEpisodes <= 3 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 w-20 text-right">
                      {p.actualEpisodes}/{p.expectedEpisodes} eps
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span>Started {new Date(p.initiationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
                    <span>{p.daysSinceInitiation} days ago</span>
                    {p.actualPaceDays != null && (
                      <span className={p.actualPaceDays > p.expectedPaceDays * 1.2 ? "text-red-500 font-medium" : "text-green-600"}>
                        Actual: {p.actualPaceDays}d/ep (expected {p.expectedPaceDays}d)
                      </span>
                    )}
                    {p.delayEpisodes > 0 && (
                      <span className="text-red-500 font-medium">
                        -{p.delayEpisodes} eps ({p.delayWeeks}w behind)
                      </span>
                    )}
                  </div>

                  {p.delayNotes && (
                    <p className="text-[10px] text-gray-400 mt-1.5 italic border-l-2 border-gray-200 pl-2">
                      {p.delayNotes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function DelayTracker() {
  const [data, setData] = useState<DelayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamSummary | null>(null);
  const [view, setView] = useState<"teams" | "projects">("teams");

  useEffect(() => {
    fetch(`/api/management/delay-tracker?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => setData(res.stats ? res : null))
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

  if (!data || data.projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No writer commitments tracked yet.
        </CardContent>
      </Card>
    );
  }

  const { projects, teamSummary, stats } = data;

  const teamChartData = teamSummary.map((t) => ({
    name: t.teamName.replace("'s Team", ""),
    delayEps: t.totalDelayEps,
    delayPercent: t.delayPercent,
    fill: teamBarColor(t.delayPercent),
    team: t,
  }));

  return (
    <>
      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border p-2.5 text-center">
              <p className="text-lg font-bold text-gray-900">{stats.totalProjects}</p>
              <p className="text-[10px] text-gray-500">Tracked Projects</p>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-lg font-bold text-green-600">{stats.onTrack}</p>
              </div>
              <p className="text-[10px] text-gray-500">On Track</p>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-lg font-bold text-red-600">{stats.delayed}</p>
              </div>
              <p className="text-[10px] text-gray-500">Delayed</p>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <p className="text-lg font-bold text-amber-600">{stats.totalDelay}</p>
              </div>
              <p className="text-[10px] text-gray-500">Total Eps Behind</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex rounded-md border overflow-hidden text-xs">
              {(["teams", "projects"] as const).map((v) => (
                <button
                  key={v}
                  className={`px-3 py-1.5 transition-colors ${
                    view === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                  onClick={() => setView(v)}
                >
                  {v === "teams" ? "By Team" : "All Projects"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">
              Expected: {stats.totalExpected} | Actual: {stats.totalActual} eps
              {stats.uncappedCount > 0 && (
                <span className="ml-1">({stats.uncappedCount} projects missing total eps)</span>
              )}
            </p>
          </div>

          {view === "teams" ? (
            /* Team bar chart */
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={teamChartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
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
                    label={{ value: "Episodes Behind", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#9ca3af" } }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-xs">
                          <p className="font-semibold text-gray-800">{d.team.teamName}</p>
                          <p className="text-gray-500">{d.delayEps} episodes behind schedule</p>
                          <p className="text-gray-400">{d.team.projectCount} projects, {d.team.onTrackCount} on track</p>
                          <p className="text-[10px] text-gray-400 mt-1">Click to view projects</p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="delayEps"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(d: any) => setSelectedTeam(d.team)}
                    maxBarSize={80}
                  >
                    {teamChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Click a bar to see delayed projects in that team
              </p>
            </>
          ) : (
            /* All projects list */
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {projects.map((p) => {
                const sev = delaySeverity(p.delayEpisodes);
                const pct = p.expectedEpisodes > 0 ? Math.round((p.actualEpisodes / p.expectedEpisodes) * 100) : 0;
                return (
                  <div key={p.id} className="border rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 leading-snug">{p.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-gray-500">{p.writer}</p>
                          {p.teamName && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                              {p.teamName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${sev.bg}`}>
                          {p.isOnTrack ? "On Track" : `-${p.delayEpisodes} eps`}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {p.scheduleLabel}
                        </Badge>
                        {!p.totalEpisodes && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-500 border-gray-200">
                            Total TBD
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.isOnTrack ? "bg-green-500" : p.delayEpisodes <= 3 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 w-16 text-right">
                        {p.actualEpisodes}/{p.expectedEpisodes}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTeam && (
        <TeamDrillDialog
          team={selectedTeam}
          projects={projects}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </>
  );
}
