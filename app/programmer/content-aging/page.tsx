"use client";

import { useEffect, useState, useMemo } from "react";
import { useFreezeColumns } from "@/lib/hooks/useFreezeColumns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { BackButton } from "@/components/ui/back-button";
import { Download, Search, X, Clock, Pin } from "lucide-react";
import { toast } from "sonner";

interface EvaluatorGrade {
  id: string;
  name: string;
  email: string;
  epRange: string;
  avgScore: number | null;
}

interface Evaluator {
  id: string;
  name: string;
  email: string;
  role: string;
  group: string;
}

interface OneLinerAssessor {
  id: string;
  name: string;
  email: string;
  role: string;
  group: string;
}

const GROUPS = ["Management", "Content Development", "Programming", "Content"] as const;
type EvalGroup = typeof GROUPS[number];

const GROUP_COLORS: Record<string, string> = {
  Management: "bg-purple-100 text-purple-700 border-purple-300",
  "Content Development": "bg-orange-100 text-orange-700 border-orange-300",
  Programming: "bg-blue-100 text-blue-700 border-blue-300",
  Content: "bg-amber-100 text-amber-700 border-amber-300",
};

const GROUP_HEADER_COLORS: Record<string, string> = {
  Management: "bg-purple-50 text-purple-700",
  "Content Development": "bg-orange-50 text-orange-700",
  Programming: "bg-blue-50 text-blue-700",
  Content: "bg-amber-50 text-amber-700",
};

interface Project {
  id: string;
  workingTitle: string;
  writerName: string | null;
  slot: string | null;
  totalEps: number | null;
  epsReq: number | null;
  epsReceived: number;
  epsBehind: number | null;
  epsRemaining: number | null;
  perMonthEpsRequired: number | null;
  status: "RECEIVED" | "BEHIND" | "ON_TRACK" | null;
  deadline: string | null;
  onAirDate: string | null;
  oneLinerGrades: Record<string, number>;
  agreementDate: string | null;
  perEpAmount: number | null;
  paymentStructure: string | null;
  firstEpDate: string | null;
  lastEpDate: string | null;
  weekDelivery: Record<string, number>;
  weekRevisions: Record<string, number>;
  evaluatorGrades: EvaluatorGrade[];
  allEvaluatorGrades: Record<string, { epRange: string; avgScore: number | null }>;
  teamName: string | null;
  teamHeadName: string | null;
  teamHeadEmail: string | null;
  commitment?: {
    commitment_schedule: string;
    commitment_schedule_custom?: string | null;
    commitment_type: string;
    project_initiation_date: string;
  } | null;
}

interface Week {
  isoWeek: string;
  label: string;
}

interface MonthGroup {
  key: string;
  label: string;
  weeks: Week[];
}

type StatusFilter = "all" | "RECEIVED" | "BEHIND" | "ON_TRACK";

// Derive the Monday date from an ISO week string
function getMondayFromISOWeek(isoWeek: string): Date {
  const [year, weekPart] = isoWeek.split("-W");
  const week = parseInt(weekPart);
  const jan4 = new Date(Date.UTC(parseInt(year), 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  return new Date(jan4.getTime() + (1 - dayOfWeek) * 86400000 + (week - 1) * 7 * 86400000);
}

function getExpectedPerWeek(schedule: string): number | null {
  if (schedule.endsWith("_per_week")) return parseInt(schedule);
  return null;
}

function getExpectedPerMonth(schedule: string): number | null {
  if (schedule.endsWith("_per_month")) return parseInt(schedule);
  return null;
}

function isWeekOnOrAfter(isoWeek: string, dateStr: string): boolean {
  const monday = getMondayFromISOWeek(isoWeek);
  return monday.toISOString().slice(0, 10) >= dateStr;
}

function commitmentScheduleLabel(schedule: string, custom?: string | null): string {
  const map: Record<string, string> = {
    "1_per_week": "1 ep/week",
    "2_per_week": "2 eps/week",
    "3_per_week": "3 eps/week",
    "4_per_week": "4 eps/week",
    "1_per_month": "1 ep/month",
    "2_per_month": "2 eps/month",
    "3_per_month": "3 eps/month",
    "custom": custom || "Custom",
  };
  return map[schedule] ?? schedule;
}

function groupWeeksByMonth(weeks: Week[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const w of weeks) {
    const monday = getMondayFromISOWeek(w.isoWeek);
    const key = `${monday.getUTCFullYear()}-${monday.getUTCMonth()}`;
    if (!groups.has(key)) {
      const label = monday.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
      groups.set(key, { key, label, weeks: [] });
    }
    groups.get(key)!.weeks.push(w);
  }
  return Array.from(groups.values());
}

function statusBadge(status: Project["status"]) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const map = {
    RECEIVED: "bg-green-100 text-green-700 border-green-300",
    BEHIND: "bg-red-100 text-red-700 border-red-300",
    ON_TRACK: "bg-blue-100 text-blue-700 border-blue-300",
  };
  const labels = { RECEIVED: "Received", BEHIND: "Behind", ON_TRACK: "On Track" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function scoreBadge(score: number | null) {
  if (score === null) return <span className="text-muted-foreground text-xs">—</span>;
  const color =
    score >= 8 ? "bg-green-100 text-green-700" :
    score >= 6 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// FIXED COLUMN WIDTHS (sticky)
const W_NUM = 40;
const W_TITLE = 200;
const W_WRITER = 140;
const STICKY_TOTAL = W_NUM + W_TITLE + W_WRITER;

export default function ContentAgingPage() {
  const [activeTab, setActiveTab] = useState<"aging" | "target">("aging");
  const [projects, setProjects] = useState<Project[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<Set<string>>(new Set());
  const [oneLinerAssessors, setOneLinerAssessors] = useState<OneLinerAssessor[]>([]);
  const [selectedOneLinerIds, setSelectedOneLinerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [freezePanes, setFreezePanes] = useState(false);
  const freezeRef = useFreezeColumns(freezePanes, 3);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/management/content-aging?_t=${Date.now()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProjects(data.projects || []);
        setWeeks(data.weeks || []);
        const evs: Evaluator[] = data.evaluators || [];
        setEvaluators(evs);
        setSelectedEvaluatorIds(new Set(evs.map((e: Evaluator) => e.id)));
        const olas: OneLinerAssessor[] = data.oneLinerAssessors || [];
        setOneLinerAssessors(olas);
        setSelectedOneLinerIds(new Set(olas.map((a: OneLinerAssessor) => a.id)));
      } catch {
        toast.error("Failed to load content aging data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthGroups = useMemo(() => groupWeeksByMonth(weeks), [weeks]);
  const visibleEvaluators = useMemo(
    () => evaluators.filter((e) => selectedEvaluatorIds.has(e.id)),
    [evaluators, selectedEvaluatorIds]
  );

  const visibleOneLinerAssessors = useMemo(
    () => oneLinerAssessors.filter((a) => selectedOneLinerIds.has(a.id)),
    [oneLinerAssessors, selectedOneLinerIds]
  );

  const toggleEvaluator = (id: string) => {
    setSelectedEvaluatorIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleProjectUpdate = async (
    callReportId: string,
    patch: Partial<Pick<Project, "deadline" | "onAirDate">>
  ) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === callReportId ? { ...p, ...patch } : p))
    );
    try {
      const res = await fetch(`/api/management/content-aging/${callReportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      toast.error("Failed to save date");
      // Re-fetch to revert to DB state
      const res = await fetch(`/api/management/content-aging?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    }
  };

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.workingTitle.toLowerCase().includes(q) ||
          (p.writerName?.toLowerCase().includes(q) ?? false) ||
          (p.teamName?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [projects, statusFilter, search]);

  const stats = useMemo(() => ({
    total: projects.length,
    received: projects.filter((p) => p.status === "RECEIVED").length,
    behind: projects.filter((p) => p.status === "BEHIND").length,
    onTrack: projects.filter((p) => p.status === "ON_TRACK").length,
    totalEpsReceived: projects.reduce((s, p) => s + p.epsReceived, 0),
    totalEpsBehind: projects.reduce((s, p) => s + (p.epsBehind ?? 0), 0),
  }), [projects]);

  const exportToExcel = () => {
    if (filtered.length === 0) { toast.error("No data to export"); return; }

    const weekHeaders = monthGroups.flatMap((mg) => [
      ...mg.weeks.map((_, i) => `${mg.label} W${i + 1}`),
      `${mg.label} Total`,
    ]);

    const evalHeaders = visibleEvaluators.flatMap((e) => [`${e.name} (Episodes)`, `${e.name} (Grade)`]);
    const oneLinerHeaders = visibleOneLinerAssessors.map((a) => `${a.name} (One-Liner)`);

    const headers = [
      "Sr", "Title", "Writer", "Agreement Date", "Slot",
      ...evalHeaders,
      "Total EPS", "EPS REQ", "EPS Received",
      "Deadline", "Project On Air",
      "EPS Remaining", "Per Month EPS Required",
      "First Ep Date", "Last Ep Date", "Status",
      ...oneLinerHeaders,
      ...weekHeaders,
    ];

    const rows = filtered.map((p, i) => [
      i + 1,
      p.workingTitle,
      p.writerName ?? "",
      fmt(p.agreementDate),
      p.slot ?? "",
      ...visibleEvaluators.flatMap((e) => {
        const g = p.allEvaluatorGrades[e.id];
        return [g?.epRange ?? "", g?.avgScore ?? ""];
      }),
      p.totalEps ?? "",
      p.epsReq ?? "",
      p.epsReceived,
      fmt(p.deadline),
      fmt(p.onAirDate),
      p.epsRemaining ?? "",
      p.perMonthEpsRequired ?? "",
      fmt(p.firstEpDate),
      fmt(p.lastEpDate),
      p.status ?? "",
      ...visibleOneLinerAssessors.map((a) => p.oneLinerGrades[a.id] ?? ""),
      ...monthGroups.flatMap((mg) => {
        const weekCounts = mg.weeks.map((w) => p.weekDelivery[w.isoWeek] ?? 0);
        return [...weekCounts, weekCounts.reduce((s, c) => s + c, 0)];
      }),
    ]);

    const tableHTML = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `content-aging_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    toast.success("Exported successfully");
  };

  const exportTargetAgingToExcel = () => {
    if (filtered.length === 0) { toast.error("No data to export"); return; }
    const evalHeaders = visibleEvaluators.flatMap((e) => [`${e.name} (Episodes)`, `${e.name} (Grade)`]);
    const oneLinerHeaders = visibleOneLinerAssessors.map((a) => `${a.name} (One-Liner)`);
    const headers = ["S.NO", "Titles", "Writer", "Slot", "Team Head", "Total EPS", "Eps Req", "Eps In Hand", "Deadline", "Project On Air", ...oneLinerHeaders, ...evalHeaders];
    const rows = filtered.map((p, i) => [
      i + 1,
      p.workingTitle,
      p.writerName ?? "",
      p.slot ?? "",
      p.teamHeadName ?? "",
      p.totalEps ?? "",
      p.epsReq ?? "",
      p.epsReceived,
      fmt(p.deadline),
      fmt(p.onAirDate),
      ...visibleOneLinerAssessors.map((a) => p.oneLinerGrades[a.id] ?? ""),
      ...visibleEvaluators.flatMap((e) => {
        const g = p.allEvaluatorGrades[e.id];
        return [g?.epRange ?? "", g?.avgScore ?? ""];
      }),
    ]);
    const tableHTML = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `target-aging_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    toast.success("Exported successfully");
  };

  // Total dynamic cols for minWidth calculation
  const dynamicCols = monthGroups.reduce((s, mg) => s + mg.weeks.length + 1, 0);
  const minWidth = STICKY_TOTAL + 1140 + visibleEvaluators.length * 160 + visibleOneLinerAssessors.length * 90 + dynamicCols * 60;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="/programmer">Dashboard</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Content Aging</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <BackButton fallbackHref="/programmer" />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Content Aging</h1>
            {!loading && (
              <span className="text-muted-foreground text-sm">({filtered.length} of {projects.length} projects)</span>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-3">
          {(["aging", "target"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-t text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "aging" ? "Content Aging" : "Target Aging"}
            </button>
          ))}
        </div>

        {/* Stats */}
        {!loading && (
          <div className="flex gap-4 mt-3 flex-wrap">
            <StatPill label="Total Projects" value={stats.total} color="blue" />
            <StatPill label="Fully Received" value={stats.received} color="green" />
            <StatPill label="Behind" value={stats.behind} color="red" />
            <StatPill label="On Track" value={stats.onTrack} color="blue" />
            <StatPill label="Eps Received" value={stats.totalEpsReceived} color="purple" />
            <StatPill label="Eps Behind" value={stats.totalEpsBehind} color="red" />
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, writer, team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-64"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1">
            {(["all", "RECEIVED", "BEHIND", "ON_TRACK"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {s === "all" ? "All" : s === "RECEIVED" ? "Received" : s === "BEHIND" ? "Behind" : "On Track"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant={freezePanes ? "default" : "outline"}
              size="sm"
              onClick={() => setFreezePanes(f => !f)}
              className="gap-1.5 h-8 text-xs"
            >
              <Pin className="h-3.5 w-3.5" />
              {freezePanes ? "Unfreeze" : "Freeze Panes"}
            </Button>
            <Button variant="outline" size="sm" onClick={activeTab === "aging" ? exportToExcel : exportTargetAgingToExcel} disabled={loading || filtered.length === 0} className="gap-1.5 h-8 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </Button>
          </div>
          {/* Evaluator filter — Target Aging tab only */}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden">
      <div ref={freezeRef} className="overflow-auto h-full py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading content aging data...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">No projects match the current filters.</div>
          </div>
        ) : activeTab === "target" ? (
          <TargetAgingTable projects={filtered} visibleEvaluators={visibleEvaluators} visibleOneLinerAssessors={visibleOneLinerAssessors} onUpdate={handleProjectUpdate} />
        ) : (
          <table className="w-full text-sm border-separate border-spacing-0" style={{ minWidth }}>
            <thead>
              {/* Row 1: group/role labels */}
              <tr className="bg-muted/80">
                <Th width={W_NUM} rowSpan={3}>#</Th>
                <Th width={W_TITLE} rowSpan={3}>Title</Th>
                <Th width={W_WRITER} rowSpan={3}>Writer</Th>
                {/* Agreement & Slot spans rows 1+2 so sub-cols land in row 3 */}
                <th colSpan={4} rowSpan={2} className="px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-border bg-slate-100 text-slate-600 uppercase tracking-wide">
                  Agreement &amp; Slot
                </th>
                {/* Evaluator role groups */}
                {GROUPS.map((group) => {
                  const groupEvals = visibleEvaluators.filter((e) => e.group === group);
                  if (groupEvals.length === 0) return null;
                  return (
                    <th key={`ev-grp-${group}`} colSpan={groupEvals.length * 2} className={`px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-border uppercase tracking-wide ${GROUP_HEADER_COLORS[group]}`}>
                      {group}
                    </th>
                  );
                })}
                {/* One-liner role groups — before Episode Tracking */}
                {GROUPS.map((group) => {
                  const groupAssessors = visibleOneLinerAssessors.filter((a) => a.group === group);
                  if (groupAssessors.length === 0) return null;
                  return (
                    <th key={`ol-grp-${group}`} colSpan={groupAssessors.length} className={`px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-border uppercase tracking-wide ${GROUP_HEADER_COLORS[group]}`}>
                      {group}
                    </th>
                  );
                })}
                {/* Episode Tracking spans rows 1+2 so sub-cols land in row 3 */}
                <th colSpan={8} rowSpan={2} className="px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-border bg-amber-50 text-amber-700 uppercase tracking-wide">
                  Episode Tracking
                </th>
                {/* Month groups span rows 1+2 so week cols land in row 3 */}
                {monthGroups.map((mg) => (
                  <th key={mg.key} colSpan={mg.weeks.length + 1} rowSpan={2} className="px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-border bg-green-50 text-green-700 uppercase tracking-wide">
                    {mg.label}
                  </th>
                ))}
              </tr>

              {/* Row 2: individual names */}
              <tr className="bg-muted/60">
                {/* Evaluator names */}
                {GROUPS.flatMap((group) =>
                  visibleEvaluators
                    .filter((e) => e.group === group)
                    .map((e) => (
                      <th key={`ev-name-${e.id}`} colSpan={2} className={`px-2 py-1.5 text-xs font-semibold text-center border-b border-r border-border whitespace-nowrap ${GROUP_HEADER_COLORS[group]}`}>
                        {e.name}
                      </th>
                    ))
                )}
                {/* One-liner assessor names */}
                {GROUPS.flatMap((group) =>
                  visibleOneLinerAssessors
                    .filter((a) => a.group === group)
                    .map((a) => (
                      <th key={`ol-name-${a.id}`} className={`px-2 py-1.5 text-xs font-semibold text-center border-b border-r border-border whitespace-nowrap ${GROUP_HEADER_COLORS[group]}`} style={{ minWidth: 90, maxWidth: 90, width: 90 }}>
                        {a.name.split(" ")[0]}
                      </th>
                    ))
                )}
              </tr>

              {/* Row 3: column sub-headers */}
              <tr className="bg-muted/60 text-left">
                {/* Agreement & Slot sub-cols */}
                <Th width={110}>Agreement Date</Th>
                <Th width={90}>Slot</Th>
                <Th width={120}>Team Head</Th>
                <Th width={100}>On Air Date</Th>
                {/* Episodes + Grade per evaluator */}
                {GROUPS.flatMap((group) =>
                  visibleEvaluators
                    .filter((e) => e.group === group)
                    .flatMap((e) => [
                      <Th key={`${e.id}-ep`} width={90} center>Episodes</Th>,
                      <Th key={`${e.id}-gr`} width={70} center>Grade</Th>,
                    ])
                )}
                {/* One-Liner Grade per assessor — before Episode Tracking */}
                {GROUPS.flatMap((group) =>
                  visibleOneLinerAssessors
                    .filter((a) => a.group === group)
                    .map((a) => (
                      <Th key={`ol-grade-${a.id}`} width={115} center className={GROUP_HEADER_COLORS[group]}>One-Liner Grade</Th>
                    ))
                )}
                {/* Episode tracking sub-cols */}
                <Th width={75} center>Total EPS</Th>
                <Th width={70} center>EPS REQ</Th>
                <Th width={75} center>Received</Th>
                <Th width={110}>Deadline</Th>
                <Th width={75} center>Remaining</Th>
                <Th width={95} center>Per Month</Th>
                <Th width={110}>First Ep</Th>
                <Th width={110}>Last Ep</Th>
                {/* Week sub-cols */}
                {monthGroups.flatMap((mg) => [
                  ...mg.weeks.map((_, i) => (
                    <Th key={`${mg.key}-w${i}`} width={55} center>{`W${i + 1}`}</Th>
                  )),
                  <Th key={`${mg.key}-total`} width={60} center className="font-bold">Total</Th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {filtered.map((project, idx) => (
                <tr key={project.id} className="border-b hover:bg-muted/30 align-middle">
                  <Td width={W_NUM} className="text-muted-foreground text-xs text-center">
                    {idx + 1}
                  </Td>
                  <Td width={W_TITLE} className="font-medium">
                    <span title={project.workingTitle} className="block truncate max-w-[190px]">{project.workingTitle}</span>
                    {project.commitment && (
                      <span className="block text-xs text-gray-400 font-normal mt-0.5 truncate max-w-[190px]">
                        {commitmentScheduleLabel(project.commitment.commitment_schedule, project.commitment.commitment_schedule_custom)} · {project.commitment.commitment_type}
                      </span>
                    )}
                  </Td>
                  <Td width={W_WRITER} className="text-muted-foreground text-xs">
                    {project.writerName ?? "—"}
                  </Td>

                  {/* Agreement & Slot */}
                  <Td width={110}>{fmt(project.agreementDate)}</Td>
                  <Td width={90}>{project.slot ?? "—"}</Td>
                  <Td width={120} className="text-xs text-muted-foreground">{project.teamHeadName ?? "—"}</Td>
                  <Td width={100}>{fmt(project.onAirDate)}</Td>

                  {/* All evaluators */}
                  {GROUPS.flatMap((group) =>
                    visibleEvaluators
                      .filter((e) => e.group === group)
                      .flatMap((e) => {
                        const g = project.allEvaluatorGrades[e.id];
                        return [
                          <Td key={`${e.id}-ep`} width={90} center className="text-xs text-muted-foreground">{g?.epRange || "—"}</Td>,
                          <Td key={`${e.id}-gr`} width={70} center>{scoreBadge(g?.avgScore ?? null)}</Td>,
                        ];
                      })
                  )}

                  {/* Per-assessor one-liner cells — before Episode Tracking */}
                  {GROUPS.flatMap((group) =>
                    visibleOneLinerAssessors
                      .filter((a) => a.group === group)
                      .map((a) => (
                        <Td key={`ol-${a.id}`} width={115} center>
                          {scoreBadge(project.oneLinerGrades[a.id] ?? null)}
                        </Td>
                      ))
                  )}

                  {/* Episode tracking */}
                  <Td width={75} center>{project.totalEps ?? "—"}</Td>
                  <Td width={70} center>{project.epsReq ?? "—"}</Td>
                  <Td width={75} center>
                    <span className={project.epsReceived > 0 ? "font-semibold text-green-700" : ""}>
                      {project.epsReceived}
                    </span>
                  </Td>
                  <Td width={110}>{fmt(project.deadline)}</Td>
                  <Td width={75} center>
                    {project.epsRemaining !== null ? (
                      <span className={project.epsRemaining > 0 ? "font-semibold text-red-600" : "text-muted-foreground"}>
                        {project.epsRemaining > 0 ? project.epsRemaining : "—"}
                      </span>
                    ) : "—"}
                  </Td>
                  <Td width={95} center>
                    {project.perMonthEpsRequired !== null ? (
                      <span className="font-semibold">{project.perMonthEpsRequired}</span>
                    ) : "—"}
                  </Td>
                  <Td width={110}>{fmt(project.firstEpDate)}</Td>
                  <Td width={110}>{fmt(project.lastEpDate)}</Td>

                  {/* Month week cells */}
                  {monthGroups.flatMap((mg) => {
                    const weekCounts = mg.weeks.map((w) => project.weekDelivery[w.isoWeek] ?? 0);
                    const monthTotal = weekCounts.reduce((s, c) => s + c, 0);
                    const c = project.commitment;
                    const expPerWeek = c ? getExpectedPerWeek(c.commitment_schedule) : null;
                    const expPerMonth = c ? getExpectedPerMonth(c.commitment_schedule) : null;

                    // Monthly behind for monthly-schedule projects
                    let monthBehind: number | null = null;
                    if (c && expPerMonth !== null) {
                      const firstWeekOfMonth = mg.weeks[0];
                      if (firstWeekOfMonth && isWeekOnOrAfter(firstWeekOfMonth.isoWeek, c.project_initiation_date)) {
                        monthBehind = monthTotal - expPerMonth;
                      }
                    }
                    // For weekly schedules, sum weekly behinds for the month total
                    let weeklyMonthBehind: number | null = null;
                    if (c && expPerWeek !== null) {
                      let sum = 0;
                      let hasAny = false;
                      mg.weeks.forEach((w) => {
                        if (isWeekOnOrAfter(w.isoWeek, c.project_initiation_date)) {
                          sum += (project.weekDelivery[w.isoWeek] ?? 0) - expPerWeek;
                          hasAny = true;
                        }
                      });
                      if (hasAny) weeklyMonthBehind = sum;
                    }

                    return [
                      ...mg.weeks.map((w, i) => {
                        const count = project.weekDelivery[w.isoWeek] ?? 0;
                        let behindValue: number | null = null;
                        let weekActive = false;
                        if (c && expPerWeek !== null && isWeekOnOrAfter(w.isoWeek, c.project_initiation_date)) {
                          behindValue = count - expPerWeek;
                          weekActive = true;
                        }
                        return (
                          <Td key={`${mg.key}-w${i}`} width={55} center>
                            {count > 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                {count}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30">·</span>
                            )}
                            {c && (
                              <div className="text-xs mt-0.5 leading-none">
                                {expPerWeek !== null ? (
                                  weekActive ? (
                                    behindValue === 0 ? (
                                      <span className="text-gray-400">0</span>
                                    ) : (
                                      <span className={behindValue! < 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                        {behindValue! > 0 ? `+${behindValue}` : behindValue}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </div>
                            )}
                            {(() => {
                              const revCount = project.weekRevisions?.[w.isoWeek] ?? 0;
                              if (revCount === 0) return null;
                              return (
                                <div className="text-xs mt-0.5 leading-none font-medium text-amber-600">
                                  {revCount}R
                                </div>
                              );
                            })()}
                          </Td>
                        );
                      }),
                      <Td key={`${mg.key}-total`} width={60} center>
                        {monthTotal > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            {monthTotal}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">·</span>
                        )}
                        {c && (() => {
                          const behind = expPerWeek !== null ? weeklyMonthBehind : monthBehind;
                          if (behind === null) return null;
                          return (
                            <div className="text-xs mt-0.5 leading-none">
                              {behind === 0 ? (
                                <span className="text-gray-400">0</span>
                              ) : (
                                <span className={behind < 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                  {behind > 0 ? `+${behind}` : behind}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {(() => {
                          const monthRevTotal = mg.weeks.reduce(
                            (s, w) => s + (project.weekRevisions?.[w.isoWeek] ?? 0), 0
                          );
                          if (monthRevTotal === 0) return null;
                          return (
                            <div className="text-xs mt-0.5 leading-none font-medium text-amber-600">
                              {monthRevTotal}R
                            </div>
                          );
                        })()}
                      </Td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  );
}

function TargetAgingTable({ projects, visibleEvaluators, visibleOneLinerAssessors, onUpdate }: { projects: Project[]; visibleEvaluators: Evaluator[]; visibleOneLinerAssessors: OneLinerAssessor[]; onUpdate?: (id: string, patch: Partial<Pick<Project, "deadline" | "onAirDate">>) => void }) {
  const minWidth = STICKY_TOTAL + 650 + visibleOneLinerAssessors.length * 90 + visibleEvaluators.length * 2 * 80;

  return (
    <table className="w-full text-sm border-separate border-spacing-0" style={{ minWidth }}>
      <thead>
        {/* Row 1: level group headers (Management / Programming / Evaluator) */}
        <tr className="bg-muted/80">
          <Th width={W_NUM} rowSpan={3}>#</Th>
          <Th width={W_TITLE} rowSpan={3}>Title</Th>
          <Th width={W_WRITER} rowSpan={3}>Writer</Th>
          <th colSpan={7} className="px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-border bg-slate-100 text-slate-600 uppercase tracking-wide" rowSpan={2}>
            Project Details
          </th>
          {/* One-liner group headers in Row 1 (names go in Row 2, label goes in Row 3) */}
          {GROUPS.map((group) => {
            const groupAssessors = visibleOneLinerAssessors.filter((a) => a.group === group);
            if (groupAssessors.length === 0) return null;
            return (
              <th key={`ol-r1-${group}`} colSpan={groupAssessors.length} className={`px-3 py-1.5 text-xs font-bold text-center border-b border-r border-border uppercase tracking-wide ${GROUP_HEADER_COLORS[group]}`}>
                {group}
              </th>
            );
          })}
          {GROUPS.map((group) => {
            const groupEvals = visibleEvaluators.filter((e) => e.group === group);
            if (groupEvals.length === 0) return null;
            return (
              <th key={group} colSpan={groupEvals.length * 2} className={`px-3 py-1.5 text-xs font-bold text-center border-b border-r border-border uppercase tracking-wide ${GROUP_HEADER_COLORS[group]}`}>
                {group}
              </th>
            );
          })}
        </tr>
        {/* Row 2: one-liner individual names + episodic evaluator names */}
        <tr className="bg-muted/60">
          {GROUPS.flatMap((group) =>
            visibleOneLinerAssessors
              .filter((a) => a.group === group)
              .map((a) => (
                <th key={`ol-name-r2-${a.id}`} className={`px-2 py-1.5 text-xs font-semibold text-center border-b border-r border-border whitespace-nowrap ${GROUP_HEADER_COLORS[group]}`} style={{ minWidth: 90, maxWidth: 90, width: 90 }}>
                  {a.name.split(" ")[0]}
                </th>
              ))
          )}
          {GROUPS.flatMap((group) =>
            visibleEvaluators
              .filter((e) => e.group === group)
              .map((e) => (
                <th key={e.id} colSpan={2} className={`px-2 py-1.5 text-xs font-semibold text-center border-b border-r border-border whitespace-nowrap ${GROUP_HEADER_COLORS[group]}`}>
                  {e.name}
                </th>
              ))
          )}
        </tr>
        {/* Row 3: Episodes / Grade sub-columns */}
        <tr className="bg-muted/60 text-left">
          <Th width={90}>Slot</Th>
          <Th width={120}>Team Head</Th>
          <Th width={80} center>Total EPS</Th>
          <Th width={75} center>Eps Req</Th>
          <Th width={80} center>Eps In Hand</Th>
          <Th width={110}>Deadline</Th>
          <Th width={110}>Project On Air</Th>
          {/* One-liner group labels in Row 3 (names are in Row 2) */}
          {GROUPS.map((group) => {
            const groupAssessors = visibleOneLinerAssessors.filter((a) => a.group === group);
            if (groupAssessors.length === 0) return null;
            return (
              <th key={`ol-grp-r3-${group}`} colSpan={groupAssessors.length} className={`px-2 py-1 text-xs font-medium text-center border-b border-r border-border ${GROUP_HEADER_COLORS[group]}`} style={{ minWidth: groupAssessors.length * 90 }}>
                One-Liner
              </th>
            );
          })}
          {GROUPS.flatMap((group) =>
            visibleEvaluators
              .filter((e) => e.group === group)
              .flatMap((e) => [
                <Th key={`${e.id}-ep`} width={80} center>Episodes</Th>,
                <Th key={`${e.id}-gr`} width={65} center>Grade</Th>,
              ])
          )}
        </tr>
      </thead>
      <tbody>
        {projects.map((project, idx) => (
          <tr key={project.id} className="border-b hover:bg-muted/30 align-middle">
            <Td width={W_NUM} className="text-muted-foreground text-xs text-center">{idx + 1}</Td>
            <Td width={W_TITLE} className="font-medium">
              <span title={project.workingTitle} className="block truncate max-w-[190px]">{project.workingTitle}</span>
            </Td>
            <Td width={W_WRITER} className="text-muted-foreground text-xs">
              {project.writerName ?? "—"}
            </Td>
            <Td width={90}>{project.slot ?? "—"}</Td>
            <Td width={120} className="text-xs text-muted-foreground">{project.teamHeadName ?? "—"}</Td>
            <Td width={80} center>{project.totalEps ?? "—"}</Td>
            <Td width={75} center>{project.epsReq ?? "—"}</Td>
            <Td width={80} center>
              <span className={project.epsReceived > 0 ? "font-semibold text-green-700" : ""}>{project.epsReceived}</span>
            </Td>
            <Td width={110}>
              {onUpdate ? (
                <input
                  type="date"
                  className="w-full text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-ring rounded px-1 cursor-pointer"
                  value={project.deadline ? project.deadline.slice(0, 10) : ""}
                  onChange={(e) => onUpdate(project.id, { deadline: e.target.value || null })}
                />
              ) : (
                fmt(project.deadline)
              )}
            </Td>
            <Td width={110}>
              {onUpdate ? (
                <input
                  type="date"
                  className="w-full text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-ring rounded px-1 cursor-pointer"
                  value={project.onAirDate ? project.onAirDate.slice(0, 10) : ""}
                  onChange={(e) => onUpdate(project.id, { onAirDate: e.target.value || null })}
                />
              ) : (
                fmt(project.onAirDate)
              )}
            </Td>
            {GROUPS.flatMap((group) =>
              visibleOneLinerAssessors
                .filter((a) => a.group === group)
                .map((a) => (
                  <Td key={`ol-${a.id}`} width={90} center>
                    {scoreBadge(project.oneLinerGrades[a.id] ?? null)}
                  </Td>
                ))
            )}
            {GROUPS.flatMap((group) =>
              visibleEvaluators
                .filter((e) => e.group === group)
                .flatMap((e) => {
                  const g = project.allEvaluatorGrades[e.id];
                  const color = group === "Management" ? "text-purple-700" : group === "Programming" ? "text-blue-700" : "text-amber-700";
                  return [
                    <Td key={`${e.id}-ep`} width={80} center className={`text-xs ${color}`}>{g?.epRange || "—"}</Td>,
                    <Td key={`${e.id}-gr`} width={65} center>{scoreBadge(g?.avgScore ?? null)}</Td>,
                  ];
                })
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${colors[color] ?? colors.blue}`}>
      <span className="font-bold text-sm">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function Th({
  children, width, center, rowSpan, className,
}: {
  children: React.ReactNode;
  width?: number;
  center?: boolean;
  rowSpan?: number;
  className?: string;
}) {
  return (
    <th
      rowSpan={rowSpan}
      className={`px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap border-b border-r border-border ${center ? "text-center" : ""} ${className ?? ""}`}
      style={{
        minWidth: width,
        maxWidth: width,
        width: width,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children, width, center, className,
}: {
  children: React.ReactNode;
  width?: number;
  center?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-2 py-2 border-r border-border/60 ${center ? "text-center" : ""} ${className ?? ""}`}
      style={{
        minWidth: width,
        maxWidth: width,
        width: width,
      }}
    >
      {children}
    </td>
  );
}
