"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

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

interface Stats {
  totalProjects: number;
  overallRate: number;
  greenCount: number;
  greyCount: number;
  orangeCount: number;
  redCount: number;
}

function projectScore(p: ProjectRow): number {
  const rates: number[] = [];
  if (p.summaryRates.standard >= 0) rates.push(p.summaryRates.standard);
  if (p.summaryRates.waada1 !== null) rates.push(p.summaryRates.waada1);
  if (p.summaryRates.waada2 !== null) rates.push(p.summaryRates.waada2);
  if (p.summaryRates.waada3 !== null) rates.push(p.summaryRates.waada3);
  if (p.summaryRates.waada4 !== null) rates.push(p.summaryRates.waada4);
  if (rates.length === 0) return -1;
  return Math.round(rates.reduce((s, v) => s + v, 0) / rates.length);
}

function rateColor(pct: number): string {
  if (pct < 0) return "#9ca3af";
  if (pct >= 85) return "#22c55e";
  if (pct >= 80) return "#6b7280";
  if (pct >= 60) return "#f59e0b";
  return "#ef4444";
}

function rateBg(pct: number): string {
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

interface TeamData {
  name: string;
  id: string;
  rate: number;
  projects: number;
  green: number;
  red: number;
  projectList: (ProjectRow & { score: number })[];
}

// ── Expandable Project Row ───────────────────────────────────────────────────

function ProjectDrillRow({ p }: { p: ProjectRow & { score: number } }) {
  const [expanded, setExpanded] = useState(false);
  const gap = p.standard.totalCommitted > 0
    ? Math.round(p.standard.totalCommitted) - p.inHandEpisodes
    : 0;

  return (
    <div className={`rounded-lg border ${rateBg(p.score)}`}>
      {/* Summary row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-center gap-3"
      >
        {/* Rate circle */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: rateColor(p.score) }}
        >
          {p.score < 0 ? "—" : p.score}
        </div>

        {/* Title + writer */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug truncate">{p.title}</p>
          <p className="text-[11px] text-gray-500">{p.writer}</p>
        </div>

        {/* Key numbers */}
        <div className="flex items-center gap-4 shrink-0 text-xs">
          <div className="text-center">
            <p className="font-bold text-gray-800">{p.inHandEpisodes}/{Math.round(p.standard.totalCommitted)}</p>
            <p className="text-[9px] text-gray-400">received/committed</p>
          </div>
          {gap > 0 && (
            <div className="text-center">
              <p className="font-bold text-red-600">-{gap}</p>
              <p className="text-[9px] text-gray-400">behind</p>
            </div>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded detail */}
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

          {/* Standard rate breakdown */}
          <div className="rounded-md bg-white/60 border border-gray-200/60 p-2.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Standard Rate</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1 text-xs">
              <div>
                <p className="text-[9px] text-gray-400">Cmit/wk</p>
                <p className="font-medium">{p.standard.commitmentPerWeek || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">Weeks</p>
                <p className="font-medium">{p.standard.weeks > 0 ? p.standard.weeks : "—"}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">Committed</p>
                <p className="font-medium">{Math.round(p.standard.totalCommitted)}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">In Hand</p>
                <p className="font-medium">{p.inHandEpisodes}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">Rate/mo</p>
                <p className="font-medium">{p.standard.deliveryRatePerMonth > 0 ? p.standard.deliveryRatePerMonth : "—"}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">Rate %</p>
                <p className="font-bold" style={{ color: rateColor(p.standard.deliveryRatePercent) }}>
                  {p.standard.deliveryRatePercent < 0 ? "N/A" : `${p.standard.deliveryRatePercent}%`}
                </p>
              </div>
            </div>
          </div>

          {/* Waada breakdowns */}
          {p.waadas.length > 0 && (
            <div className="space-y-1.5">
              {p.waadas.map((w) => {
                const behind = Math.round(w.committedEps) - w.receivedEps;
                return (
                  <div key={w.number} className="rounded-md bg-white/60 border border-gray-200/60 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Waada {w.number}</p>
                      <span
                        className="text-xs font-bold"
                        style={{ color: rateColor(w.deliveryRatePercent) }}
                      >
                        {w.deliveryRatePercent}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-x-3 gap-y-1 text-xs">
                      <div>
                        <p className="text-[9px] text-gray-400">Period</p>
                        <p className="font-medium">{fmtDate(w.startDate)} — {fmtDate(w.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400">Weeks</p>
                        <p className="font-medium">{w.weeks}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400">Cmit/wk</p>
                        <p className="font-medium">{w.commitmentPerWeek}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400">Committed</p>
                        <p className="font-medium">{Math.round(w.committedEps)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400">Received</p>
                        <p className="font-medium">{w.receivedEps}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400">Rate/mo</p>
                        <p className="font-medium">{w.ratePerMonth}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400">Behind</p>
                        <p className={`font-medium ${behind > 0 ? "text-red-600" : "text-green-600"}`}>
                          {behind > 0 ? `-${behind} eps` : "On track"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Drill-Down Dialog ────────────────────────────────────────────────────────

function TeamDrillDialog({ team, onClose }: { team: TeamData; onClose: () => void }) {
  const sorted = team.projectList.slice().sort((a, b) => a.score - b.score);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{team.name}</DialogTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {team.projects} projects
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-bold"
              style={{ color: rateColor(team.rate), borderColor: rateColor(team.rate) }}
            >
              Avg: {team.rate}%
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">Sorted by delivery rate — worst first. Click a project to expand details.</p>
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

// ── Main ─────────────────────────────────────────────────────────────────────

export function DeliveryRateOverview() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);

  useEffect(() => {
    fetch(`/api/writer-commitments/delivery-rate?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setProjects(res.projects);
          setStats(res.stats);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const teams = useMemo(() => {
    const map = new Map<string, TeamData>();

    for (const p of projects) {
      if (!p.teamId || !p.teamName) continue;
      const t = map.get(p.teamId) || { name: p.teamName, id: p.teamId, rate: 0, projects: 0, green: 0, red: 0, projectList: [] };
      const score = projectScore(p);
      t.projectList.push({ ...p, score });
      t.projects++;
      if (score >= 85) t.green++;
      else if (score >= 0 && score < 60) t.red++;
      map.set(p.teamId, t);
    }

    for (const t of map.values()) {
      const rated = t.projectList.filter((p) => p.score >= 0);
      t.rate = rated.length > 0 ? Math.round(rated.reduce((s, p) => s + p.score, 0) / rated.length) : -1;
    }

    return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
  }, [projects]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0 || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No delivery rate data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {teams.map((t) => {
              const barTotal = t.projects;
              const greenW = barTotal > 0 ? (t.green / barTotal) * 100 : 0;
              const redW = barTotal > 0 ? (t.red / barTotal) * 100 : 0;
              const midW = 100 - greenW - redW;

              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeam(t)}
                  className="text-left rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{t.name}</p>
                    <span
                      className="text-2xl font-bold tabular-nums leading-none"
                      style={{ color: rateColor(t.rate) }}
                    >
                      {t.rate < 0 ? "—" : `${t.rate}%`}
                    </span>
                  </div>

                  <div className="flex h-2 rounded-full overflow-hidden mb-2">
                    {greenW > 0 && <div className="bg-green-400" style={{ width: `${greenW}%` }} />}
                    {midW > 0 && <div className="bg-amber-300" style={{ width: `${midW}%` }} />}
                    {redW > 0 && <div className="bg-red-400" style={{ width: `${redW}%` }} />}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span>{t.projects} projects</span>
                    <span className="text-green-600 font-medium">{t.green} on track</span>
                    {t.red > 0 && <span className="text-red-600 font-medium">{t.red} critical</span>}
                  </div>

                  <p className="text-[10px] text-gray-400 mt-2">Click to see projects</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedTeam && (
        <TeamDrillDialog team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </>
  );
}
