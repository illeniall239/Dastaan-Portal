"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface WaadaDetail {
  number: number;
  startDate: string;
  endDate: string | null;
  weeks: number;
  commitmentPerWeek: number;
  committedEps: number;
  receivedEps: number;
  months: number;
  ratePerMonth: number;
  deliveryRatePercent: number;
}

interface ProjectRow {
  id: string;
  commitmentId: string;
  title: string;
  writer: string;
  teamName: string | null;
  teamId: string | null;
  slot: string | null;
  totalEpisodes: number | null;
  inHandEpisodes: number;
  commitmentDate: string | null;
  deadline: string | null;
  standard: {
    commitmentPerWeek: number;
    commitmentPerMonth: number;
    scheduleLabel: string;
    firstEpDate: string | null;
    weeks: number;
    months: number;
    totalCommitted: number;
    deliveryRatePerMonth: number;
    deliveryRatePercent: number;
  };
  waadas: WaadaDetail[];
  summaryRates: {
    standard: number;
    waada1: number | null;
    waada2: number | null;
    waada3: number | null;
    waada4: number | null;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Effective rate: latest waada rate if waadas exist, otherwise standard */
function effectiveRate(p: ProjectRow): number {
  for (let i = p.waadas.length - 1; i >= 0; i--) {
    return p.waadas[i].deliveryRatePercent;
  }
  return p.summaryRates.standard;
}

function epsBehind(p: ProjectRow): number {
  return Math.max(0, Math.round(p.standard.totalCommitted) - p.inHandEpisodes);
}

function rateColor(pct: number): string {
  if (pct < 0) return "#9ca3af";
  if (pct >= 85) return "#22c55e";
  if (pct >= 80) return "#6b7280";
  if (pct >= 60) return "#f59e0b";
  return "#ef4444";
}

function rateBgClass(pct: number): string {
  if (pct < 0) return "bg-gray-50 border-gray-200";
  if (pct >= 85) return "bg-green-50 border-green-200";
  if (pct >= 80) return "bg-gray-50 border-gray-200";
  if (pct >= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function activeLabel(p: ProjectRow): string {
  const cpw = p.standard.commitmentPerWeek;
  const schedule = cpw > 0 ? `${cpw % 1 === 0 ? cpw : cpw.toFixed(1)}/wk` : "";
  if (p.waadas.length > 0) {
    return `${schedule} · Waada ${p.waadas[p.waadas.length - 1].number} active`;
  }
  return schedule ? `${schedule} · Standard` : "Standard";
}

interface TeamData {
  name: string;
  id: string;
  rate: number;
  behind: number;
  projects: number;
  green: number;
  red: number;
  projectList: ProjectRow[];
}

// ── Expandable Project Row (Drill-Down Level 2) ─────────────────────────────

function ProjectDrillRow({ p }: { p: ProjectRow }) {
  const [expanded, setExpanded] = useState(false);
  const rate = effectiveRate(p);
  const behind = epsBehind(p);

  return (
    <div className={`rounded-lg border ${rateBgClass(rate)}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-center gap-3"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
          style={{ backgroundColor: rateColor(rate) }}
        >
          {rate < 0 ? "—" : rate}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug truncate">{p.title}</p>
          <p className="text-[11px] text-gray-500">{p.writer} · {activeLabel(p)}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs">
          <div className="text-center">
            <p className="font-bold text-gray-800">{p.inHandEpisodes}/{Math.round(p.standard.totalCommitted)}</p>
            <p className="text-[9px] text-gray-400">recv/cmtd</p>
          </div>
          {behind > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200 font-semibold">
              -{behind}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2.5 border-t border-gray-200/60">
          {/* Project info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Slot</p>
              <p className="text-xs font-medium text-gray-700">{p.slot || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Total Episodes</p>
              <p className="text-xs font-medium text-gray-700">{p.totalEpisodes ?? "—"}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Contract Date</p>
              <p className="text-xs font-medium text-gray-700">{fmtDate(p.commitmentDate)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Deadline</p>
              <p className="text-xs font-medium text-gray-700">{fmtDate(p.deadline)}</p>
            </div>
          </div>

          {/* Standard rate */}
          <div className="rounded-md bg-white/60 border border-gray-200/60 p-2.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Standard Rate</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1 text-xs">
              <div><p className="text-[9px] text-gray-400">Cmit/wk</p><p className="font-medium">{p.standard.commitmentPerWeek || "—"}</p></div>
              <div><p className="text-[9px] text-gray-400">Weeks</p><p className="font-medium">{p.standard.weeks > 0 ? p.standard.weeks : "—"}</p></div>
              <div><p className="text-[9px] text-gray-400">Committed</p><p className="font-medium">{Math.round(p.standard.totalCommitted)}</p></div>
              <div><p className="text-[9px] text-gray-400">In Hand</p><p className="font-medium">{p.inHandEpisodes}</p></div>
              <div><p className="text-[9px] text-gray-400">Rate/mo</p><p className="font-medium">{p.standard.deliveryRatePerMonth > 0 ? p.standard.deliveryRatePerMonth : "—"}</p></div>
              <div>
                <p className="text-[9px] text-gray-400">Rate %</p>
                <p className="font-bold" style={{ color: rateColor(p.standard.deliveryRatePercent) }}>
                  {p.standard.deliveryRatePercent < 0 ? "N/A" : `${p.standard.deliveryRatePercent}%`}
                </p>
              </div>
            </div>
          </div>

          {/* Waada breakdowns */}
          {p.waadas.map((w) => {
            const wBehind = Math.round(w.committedEps) - w.receivedEps;
            return (
              <div key={w.number} className="rounded-md bg-white/60 border border-gray-200/60 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Waada {w.number}</p>
                  <span className="text-xs font-bold" style={{ color: rateColor(w.deliveryRatePercent) }}>{w.deliveryRatePercent}%</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-x-3 gap-y-1 text-xs">
                  <div><p className="text-[9px] text-gray-400">Period</p><p className="font-medium">{fmtDate(w.startDate)} — {fmtDate(w.endDate)}</p></div>
                  <div><p className="text-[9px] text-gray-400">Weeks</p><p className="font-medium">{w.weeks}</p></div>
                  <div><p className="text-[9px] text-gray-400">Cmit/wk</p><p className="font-medium">{w.commitmentPerWeek}</p></div>
                  <div><p className="text-[9px] text-gray-400">Committed</p><p className="font-medium">{Math.round(w.committedEps)}</p></div>
                  <div><p className="text-[9px] text-gray-400">Received</p><p className="font-medium">{w.receivedEps}</p></div>
                  <div><p className="text-[9px] text-gray-400">Rate/mo</p><p className="font-medium">{w.ratePerMonth}</p></div>
                  <div>
                    <p className="text-[9px] text-gray-400">Behind</p>
                    <p className={`font-medium ${wBehind > 0 ? "text-red-600" : "text-green-600"}`}>
                      {wBehind > 0 ? `-${wBehind} eps` : "On track"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Drill-Down Level 1 ──────────────────────────────────────────────────────

function TeamDrillDialog({ team, onClose }: { team: TeamData; onClose: () => void }) {
  const sorted = team.projectList
    .slice()
    .sort((a, b) => effectiveRate(a) - effectiveRate(b));

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{team.name}</DialogTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{team.projects} projects</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold" style={{ color: rateColor(team.rate), borderColor: rateColor(team.rate) }}>
              {team.rate}%
            </Badge>
            {team.behind > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200 font-semibold">
                -{team.behind} eps behind
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Sorted worst-first. Click a project to expand details.</p>
        </DialogHeader>

        <div className="overflow-auto flex-1 -mx-6 px-6">
          <div className="space-y-2">
            {sorted.map((p) => (
              <ProjectDrillRow key={p.id} p={p} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

// ── Progress Ring ───────────────────────────────────────────────────────────

function ProgressRing({ rate, size = 72, stroke = 6 }: { rate: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(rate, 100));
  const offset = circumference - (clamped / 100) * circumference;
  const color = rateColor(rate);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-extrabold" style={{ color }}>
          {rate < 0 ? "—" : `${rate}%`}
        </span>
      </div>
    </div>
  );
}

// ── Team Scorecard ─────────────────────────────────────────────────────────

function TeamScorecard({ team, onClick }: { team: TeamData; onClick: () => void }) {
  const borderColor = team.rate >= 85
    ? "border-green-200 hover:border-green-300"
    : team.rate >= 80
      ? "border-gray-200 hover:border-gray-300"
      : team.rate >= 60
        ? "border-amber-200 hover:border-amber-300"
        : "border-red-200 hover:border-red-300";

  const bgColor = team.rate >= 85
    ? "bg-green-50/50"
    : team.rate >= 80
      ? "bg-gray-50/50"
      : team.rate >= 60
        ? "bg-amber-50/50"
        : "bg-red-50/50";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 ${borderColor} ${bgColor} p-4 transition-all hover:shadow-md cursor-pointer group`}
    >
      <div className="flex items-center gap-4">
        {/* Progress ring */}
        <ProgressRing rate={team.rate} />

        {/* Team info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate group-hover:text-gray-700">
            {team.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {team.projects} project{team.projects !== 1 ? "s" : ""}
          </p>

          {/* Episodes behind - prominent red callout */}
          {team.behind > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-bold text-red-600">
                {team.behind} episode{team.behind !== 1 ? "s" : ""} behind
              </span>
            </div>
          )}
          {team.behind === 0 && team.rate >= 85 && (
            <div className="flex items-center gap-1 mt-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-600">On track</span>
            </div>
          )}

          {/* Project health dots */}
          <div className="flex items-center gap-2 mt-2">
            {team.green > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-gray-500">{team.green}</span>
              </div>
            )}
            {(team.projects - team.green - team.red) > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] text-gray-500">{team.projects - team.green - team.red}</span>
              </div>
            )}
            {team.red > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] text-gray-500">{team.red}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function DeliveryPerformance() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);

  useEffect(() => {
    fetch(`/api/writer-commitments/delivery-rate?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setProjects(res.projects);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { teams, stats } = useMemo(() => {
    const map = new Map<string, TeamData>();
    let totalReceived = 0;
    let totalCommitted = 0;

    for (const p of projects) {
      if (!p.teamId || !p.teamName) continue;
      const t = map.get(p.teamId) || { name: p.teamName, id: p.teamId, rate: 0, behind: 0, projects: 0, green: 0, red: 0, projectList: [] };
      t.projectList.push(p);
      t.projects++;

      const rate = effectiveRate(p);
      if (rate >= 85) t.green++;
      else if (rate >= 0 && rate < 60) t.red++;

      t.behind += epsBehind(p);
      totalReceived += p.inHandEpisodes;
      totalCommitted += p.standard.totalCommitted;
      map.set(p.teamId, t);
    }

    // Weighted team rates
    for (const t of map.values()) {
      const recv = t.projectList.reduce((s, p) => s + p.inHandEpisodes, 0);
      const cmtd = t.projectList.reduce((s, p) => s + p.standard.totalCommitted, 0);
      t.rate = cmtd > 0 ? Math.round((recv / cmtd) * 100) : -1;
    }

    const teamArr = Array.from(map.values()).sort((a, b) => a.rate - b.rate);

    // Stats
    const rated = projects.filter((p) => effectiveRate(p) >= 0);
    const greenCount = rated.filter((p) => effectiveRate(p) >= 85).length;
    const orangeCount = rated.filter((p) => effectiveRate(p) >= 60 && effectiveRate(p) < 85).length;
    const redCount = rated.filter((p) => effectiveRate(p) < 60).length;

    return {
      teams: teamArr,
      stats: {
        total: projects.length,
        green: greenCount,
        orange: orangeCount,
        red: redCount,
        overall: totalCommitted > 0 ? Math.round((totalReceived / totalCommitted) * 100) : 0,
      },
    };
  }, [projects]);

  if (loading) {
    return <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  if (projects.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No delivery rate data available.</CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Summary stat pills */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5">
              <span className="text-lg font-bold text-gray-900">{stats.total}</span>
              <span className="text-[10px] text-gray-500">projects</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5">
              <span className="text-lg font-bold text-green-600">{stats.green}</span>
              <span className="text-[10px] text-green-700">on track</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
              <span className="text-lg font-bold text-amber-600">{stats.orange}</span>
              <span className="text-[10px] text-amber-700">warning</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5">
              <span className="text-lg font-bold text-red-600">{stats.red}</span>
              <span className="text-[10px] text-red-700">critical</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5">
              <span className="text-[10px] text-gray-500">Overall</span>
              <span className="text-lg font-bold" style={{ color: rateColor(stats.overall) }}>{stats.overall}%</span>
            </div>
          </div>

          {/* Team scorecards grid - worst first */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.map((t) => (
              <TeamScorecard
                key={t.id}
                team={t}
                onClick={() => setSelectedTeam(t)}
              />
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-3">
            Sorted worst-first. Click a team to see project-level breakdown.
          </p>
        </CardContent>
      </Card>

      {selectedTeam && (
        <TeamDrillDialog team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </>
  );
}
