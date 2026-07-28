"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { useCallback, useRef } from "react";
import { useFreezeColumns } from "@/lib/hooks/useFreezeColumns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { BackButton } from "@/components/ui/back-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, X, Clock, Pin, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
    revised_commitment_date?: string | null;
    delay_notes?: string | null;
  } | null;
}

interface TrackingRevision {
  revisionNumber: number;
  receivedDate: string | null;
  feedbackDate: string | null;
  feedbackDays: number | null;
}

interface TrackingEpisode {
  id: string;
  episodeNumber: number;
  firstCopyDate: string | null;
  firstCopyFeedbackDate: string | null;
  firstCopyFeedbackDays: number | null;
  revisions: TrackingRevision[];
  paymentRequestDate: string | null;
  paymentDate: string | null;
  trackingStatus: string | null;
}

interface TrackingProject {
  id: string;
  workingTitle: string;
  writerName: string | null;
  trackingNotes: string | null;
  targetSlot: string | null;
  teamName: string | null;
  avgScore: number | null;
  episodes: TrackingEpisode[];
  maxRevisions: number;
  monthlySummary: { month: string; freshEps: number; revEps: number }[];
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

function getProductionPhase(totalEps: number | null, epsReceived: number): string | null {
  if (!totalEps || epsReceived === 0) return null;
  const thresholds: Record<number, { preCast: number; preProduction: number; productionStart: number }> = {
    30: { preCast: 3, preProduction: 10, productionStart: 15 },
    50: { preCast: 8, preProduction: 18, productionStart: 25 },
  };
  const t = thresholds[totalEps];
  if (!t) return null;
  if (epsReceived >= t.productionStart) return "Production Start";
  if (epsReceived >= t.preProduction) return "Pre Production";
  if (epsReceived >= t.preCast) return "Pre Cast";
  return null;
}

function isWeekOnOrAfter(isoWeek: string, dateStr: string): boolean {
  const monday = getMondayFromISOWeek(isoWeek);
  return monday.toISOString().slice(0, 10) >= dateStr;
}

function getFirstActiveMonday(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  if (day === 1) return d;
  const daysToAdd = day === 0 ? 1 : (8 - day);
  return new Date(d.getTime() + daysToAdd * 86400000);
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

function getProjectAvgOneLiner(grades: Record<string, number>): number | null {
  const scores = Object.values(grades);
  return scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
}

function getProjectAvgEpisodic(grades: Record<string, { avgScore: number | null }>): number | null {
  const scores = Object.values(grades).map(g => g.avgScore).filter((s): s is number => s !== null);
  return scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
}

function matchesRatingBucket(avg: number | null, bucket: string): boolean {
  if (bucket === "all") return true;
  if (bucket === "high") return avg !== null && avg >= 8;
  if (bucket === "mid") return avg !== null && avg >= 6 && avg < 8;
  if (bucket === "low") return avg !== null && avg < 6;
  if (bucket === "unrated") return avg === null;
  return true;
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
  const [activeTab, setActiveTab] = useState<"aging" | "target" | "tracking">("aging");
  const [projects, setProjects] = useState<Project[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<Set<string>>(new Set());
  const [oneLinerAssessors, setOneLinerAssessors] = useState<OneLinerAssessor[]>([]);
  const [selectedOneLinerIds, setSelectedOneLinerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [trackingProjects, setTrackingProjects] = useState<TrackingProject[]>([]);
  const [trackingMaxRevisions, setTrackingMaxRevisions] = useState(0);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const trackingLoaded = useRef(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [teamHeadFilter, setTeamHeadFilter] = useState<string>("all");
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [writerFilter, setWriterFilter] = useState<string>("all");
  const [oneLinerRatingFilter, setOneLinerRatingFilter] = useState<string>("all");
  const [episodicRatingFilter, setEpisodicRatingFilter] = useState<string>("all");
  const [freezePanes, setFreezePanes] = useState(false);
  const freezeRef = useFreezeColumns(freezePanes, 3);
  const [deliveryPeriod, setDeliveryPeriod] = useState<"monthly" | "quarterly" | "biannual" | "annual">("monthly");
  const [deliveryRank, setDeliveryRank] = useState<"all" | "max" | "min">("all");

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

  const loadTracking = useCallback(async () => {
    if (trackingLoaded.current) return;
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/management/content-aging/tracking?_t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTrackingProjects(data.projects || []);
      setTrackingMaxRevisions(data.globalMaxRevisions || 0);
      trackingLoaded.current = true;
    } catch {
      toast.error("Failed to load tracking data");
    } finally {
      setTrackingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "tracking") loadTracking();
  }, [activeTab, loadTracking]);

  const monthGroups = useMemo(() => groupWeeksByMonth(weeks), [weeks]);
  const visibleEvaluators = useMemo(
    () => evaluators.filter((e) => selectedEvaluatorIds.has(e.id)),
    [evaluators, selectedEvaluatorIds]
  );

  const visibleOneLinerAssessors = useMemo(
    () => oneLinerAssessors.filter((a) => selectedOneLinerIds.has(a.id)),
    [oneLinerAssessors, selectedOneLinerIds]
  );

  const cumulativeData = useMemo(() => {
    const result = new Map<string, {
      weekDeltas: Record<string, number>;
      monthDeltas: Record<string, number>;
      tillDeltas: Record<string, number>;
    }>();
    const allWeeksSorted = monthGroups.flatMap((mg) => mg.weeks);
    for (const project of projects) {
      const c = project.commitment;
      if (!c) { result.set(project.id, { weekDeltas: {}, monthDeltas: {}, tillDeltas: {} }); continue; }
      const effectiveStart = c.revised_commitment_date || c.project_initiation_date;
      const expPerWeek = getExpectedPerWeek(c.commitment_schedule);
      const expPerMonth = getExpectedPerMonth(c.commitment_schedule);
      const weekDeltas: Record<string, number> = {};
      const monthDeltas: Record<string, number> = {};
      if (expPerWeek !== null && effectiveStart) {
        const firstMonday = getFirstActiveMonday(effectiveStart);
        let runningDelivered = 0;
        for (const w of allWeeksSorted) {
          if (!isWeekOnOrAfter(w.isoWeek, effectiveStart)) continue;
          runningDelivered += project.weekDelivery[w.isoWeek] ?? 0;
          const weekMonday = getMondayFromISOWeek(w.isoWeek);
          const weeksElapsed = Math.round((weekMonday.getTime() - firstMonday.getTime()) / (7 * 86400000)) + 1;
          weekDeltas[w.isoWeek] = runningDelivered - (expPerWeek * weeksElapsed);
        }
      }
      if (expPerMonth !== null && effectiveStart) {
        const startDate = new Date(effectiveStart + "T00:00:00Z");
        let runningDelivered = 0;
        for (const mg of monthGroups) {
          const firstWeek = mg.weeks[0];
          if (!firstWeek || !isWeekOnOrAfter(firstWeek.isoWeek, effectiveStart)) continue;
          const monthTotal = mg.weeks.reduce((s, w) => s + (project.weekDelivery[w.isoWeek] ?? 0), 0);
          runningDelivered += monthTotal;
          const monthMonday = getMondayFromISOWeek(firstWeek.isoWeek);
          const monthsElapsed = (monthMonday.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + (monthMonday.getUTCMonth() - startDate.getUTCMonth()) + 1;
          monthDeltas[mg.key] = runningDelivered - (expPerMonth * Math.max(1, monthsElapsed));
        }
      }
      result.set(project.id, { weekDeltas, monthDeltas, tillDeltas: {} });
    }
    return result;
    // --- NEW FORMULA (per-period delta + Till column) — commented out for future use ---
    // const result = new Map<string, { weekDeltas: Record<string, number>; monthDeltas: Record<string, number>; tillDeltas: Record<string, number>; }>();
    // for (const project of projects) {
    //   const c = project.commitment;
    //   if (!c) { result.set(project.id, { weekDeltas: {}, monthDeltas: {}, tillDeltas: {} }); continue; }
    //   const effectiveStart = c.revised_commitment_date || c.project_initiation_date;
    //   const expPerWeek = getExpectedPerWeek(c.commitment_schedule);
    //   const expPerMonth = getExpectedPerMonth(c.commitment_schedule);
    //   const weekDeltas: Record<string, number> = {};
    //   const monthDeltas: Record<string, number> = {};
    //   const tillDeltas: Record<string, number> = {};
    //   if (expPerWeek !== null && effectiveStart) {
    //     let runningTill = 0;
    //     for (const mg of monthGroups) {
    //       let monthDelta = 0; let hasActiveWeek = false;
    //       for (const w of mg.weeks) {
    //         if (!isWeekOnOrAfter(w.isoWeek, effectiveStart)) continue;
    //         hasActiveWeek = true;
    //         const delivered = project.weekDelivery[w.isoWeek] ?? 0;
    //         const delta = delivered - expPerWeek;
    //         weekDeltas[w.isoWeek] = delta;
    //         monthDelta += delta;
    //       }
    //       if (hasActiveWeek) { monthDeltas[mg.key] = monthDelta; runningTill += monthDelta; tillDeltas[mg.key] = runningTill; }
    //     }
    //   }
    //   if (expPerMonth !== null && effectiveStart) {
    //     let runningTill = 0;
    //     for (const mg of monthGroups) {
    //       const firstWeek = mg.weeks[0];
    //       if (!firstWeek || !isWeekOnOrAfter(firstWeek.isoWeek, effectiveStart)) continue;
    //       const monthDelivered = mg.weeks.reduce((s, w) => s + (project.weekDelivery[w.isoWeek] ?? 0), 0);
    //       const delta = monthDelivered - expPerMonth;
    //       monthDeltas[mg.key] = delta; runningTill += delta; tillDeltas[mg.key] = runningTill;
    //     }
    //   }
    //   result.set(project.id, { weekDeltas, monthDeltas, tillDeltas });
    // }
    // return result;
    // --- END NEW FORMULA ---
  }, [projects, monthGroups]);

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

  const allSlots = useMemo(() => Array.from(new Set(projects.map((p) => p.slot).filter(Boolean) as string[])).sort(), [projects]);
  const allTeamHeads = useMemo(() => Array.from(new Set(projects.map((p) => p.teamHeadName).filter(Boolean) as string[])).sort(), [projects]);
  const allWriters = useMemo(() => Array.from(new Set(projects.map((p) => p.writerName).filter(Boolean) as string[])).sort(), [projects]);
  const allSchedules = useMemo(() => {
    const labels = new Map<string, string>();
    for (const p of projects) {
      if (p.commitment?.commitment_schedule) {
        labels.set(p.commitment.commitment_schedule, commitmentScheduleLabel(p.commitment.commitment_schedule, p.commitment.commitment_schedule_custom));
      }
    }
    return Array.from(labels.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [projects]);

  const writerDeliveryRanking = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const quarter = Math.floor(month / 3);
    const half = month < 6 ? 0 : 1;
    function weekInPeriod(isoWeek: string): boolean {
      const monday = getMondayFromISOWeek(isoWeek);
      const wy = monday.getUTCFullYear();
      const wm = monday.getUTCMonth();
      switch (deliveryPeriod) {
        case "monthly": return wy === year && wm === month;
        case "quarterly": return wy === year && Math.floor(wm / 3) === quarter;
        case "biannual": return wy === year && (wm < 6 ? 0 : 1) === half;
        case "annual": return wy === year;
      }
    }
    const writerMap = new Map<string, number>();
    for (const p of projects) {
      if (!p.writerName) continue;
      let periodCount = 0;
      for (const [week, count] of Object.entries(p.weekDelivery)) {
        if (count > 0 && weekInPeriod(week)) periodCount += count;
      }
      writerMap.set(p.writerName, (writerMap.get(p.writerName) || 0) + periodCount);
    }
    const entries = Array.from(writerMap.entries()).filter(([, c]) => c > 0);
    if (entries.length === 0) return { maxWriter: null, minWriter: null };
    entries.sort((a, b) => b[1] - a[1]);
    return { maxWriter: entries[0][0], minWriter: entries[entries.length - 1][0] };
  }, [projects, deliveryPeriod]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (slotFilter !== "all" && p.slot !== slotFilter) return false;
      if (teamHeadFilter !== "all" && p.teamHeadName !== teamHeadFilter) return false;
      if (scheduleFilter !== "all" && p.commitment?.commitment_schedule !== scheduleFilter) return false;
      if (writerFilter !== "all" && p.writerName !== writerFilter) return false;
      if (!matchesRatingBucket(getProjectAvgOneLiner(p.oneLinerGrades), oneLinerRatingFilter)) return false;
      if (!matchesRatingBucket(getProjectAvgEpisodic(p.allEvaluatorGrades), episodicRatingFilter)) return false;
      if (deliveryRank === "max" && p.writerName !== writerDeliveryRanking.maxWriter) return false;
      if (deliveryRank === "min" && p.writerName !== writerDeliveryRanking.minWriter) return false;
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
  }, [projects, statusFilter, slotFilter, teamHeadFilter, scheduleFilter, writerFilter, oneLinerRatingFilter, episodicRatingFilter, search, deliveryRank, writerDeliveryRanking]);

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
      // `Total Till ${mg.label}`,  // --- Till column removed (old cumulative formula) ---
    ]);

    const evalHeaders = visibleEvaluators.flatMap((e) => [`${e.name} (Episodes)`, `${e.name} (Grade)`]);
    const oneLinerHeaders = visibleOneLinerAssessors.map((a) => `${a.name} (One-Liner)`);

    const headers = [
      "Sr", "Title", "Writer", "Agreement Date", "Slot",
      ...evalHeaders,
      "Total EPS", "EPS REQ", "EPS Received", "Phase",
      "Deadline", "Project On Air",
      "EPS Remaining", "Per Month EPS Required",
      "First Ep Date", "Last Ep Date", "Status",
      ...oneLinerHeaders,
      ...weekHeaders,
      "Reason for Delay",
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
      getProductionPhase(p.totalEps, p.epsReceived) ?? "",
      fmt(p.deadline),
      fmt(p.onAirDate),
      p.epsRemaining ?? "",
      p.perMonthEpsRequired ?? "",
      fmt(p.firstEpDate),
      fmt(p.lastEpDate),
      p.status ?? "",
      ...visibleOneLinerAssessors.map((a) => p.oneLinerGrades[a.id] ?? ""),
      ...(() => {
        const projCum = cumulativeData.get(p.id);
        return monthGroups.flatMap((mg) => {
          const weekCounts = mg.weeks.map((w) => p.weekDelivery[w.isoWeek] ?? 0);
          const monthSum = weekCounts.reduce((s, v) => s + v, 0);
          // const tillDelta = projCum?.tillDeltas[mg.key] ?? "";  // --- Till column removed (old cumulative formula) ---
          return [...weekCounts, monthSum];
        });
      })(),
      p.commitment?.delay_notes ?? "",
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
    const headers = ["S.NO", "Titles", "Writer", "Slot", "Team Head", "Total EPS", "Eps Req", "Eps In Hand", "Phase", "Deadline", "Project On Air", ...oneLinerHeaders, ...evalHeaders, "Reason for Delay"];
    const rows = filtered.map((p, i) => [
      i + 1,
      p.workingTitle,
      p.writerName ?? "",
      p.slot ?? "",
      p.teamHeadName ?? "",
      p.totalEps ?? "",
      p.epsReq ?? "",
      p.epsReceived,
      getProductionPhase(p.totalEps, p.epsReceived) ?? "",
      fmt(p.deadline),
      fmt(p.onAirDate),
      ...visibleOneLinerAssessors.map((a) => p.oneLinerGrades[a.id] ?? ""),
      ...visibleEvaluators.flatMap((e) => {
        const g = p.allEvaluatorGrades[e.id];
        return [g?.epRange ?? "", g?.avgScore ?? ""];
      }),
      p.commitment?.delay_notes ?? "",
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
  const exportTrackingToExcel = () => {
    if (trackingProjects.length === 0) { toast.error("No data to export"); return; }
    const revHeaders = Array.from({ length: trackingMaxRevisions }, (_, i) => [`${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} Revised`, "Feedback", "Days"]).flat();
    const headers = ["Project", "Episode #", "1st Copy Received", "Feedback", "Days", ...revHeaders, "Payment Request Date", "Payment Date", "Writer's Commitment", "Status"];
    const rows: (string | number | null)[][] = [];
    for (const p of trackingProjects) {
      for (const ep of p.episodes) {
        const revCells: (string | number | null)[] = [];
        for (let i = 0; i < trackingMaxRevisions; i++) {
          const rev = ep.revisions[i];
          revCells.push(rev?.receivedDate ?? "", rev?.feedbackDate ?? "", rev?.feedbackDays ?? "");
        }
        rows.push([
          p.workingTitle, ep.episodeNumber, ep.firstCopyDate, ep.firstCopyFeedbackDate, ep.firstCopyFeedbackDays ?? "",
          ...revCells, ep.paymentRequestDate ?? "", ep.paymentDate ?? "", p.trackingNotes ?? "", ep.trackingStatus ?? "",
        ]);
      }
    }
    const tableHTML = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tracking_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    toast.success("Exported successfully");
  };

  const dynamicCols = monthGroups.reduce((s, mg) => s + mg.weeks.length + 1, 0);
  const minWidth = STICKY_TOTAL + 1230 + visibleEvaluators.length * 160 + visibleOneLinerAssessors.length * 90 + dynamicCols * 60;

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
          {(["aging", "target", "tracking"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-t text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "aging" ? "Content Aging" : tab === "target" ? "Target Aging" : "Tracking"}
            </button>
          ))}
        </div>

        {/* Stats — hide on tracking tab */}
        {!loading && activeTab !== "tracking" && (
          <div className="flex gap-4 mt-3 flex-wrap">
            <StatPill label="Total Projects" value={stats.total} color="blue" />
            <StatPill label="Fully Received" value={stats.received} color="green" />
            <StatPill label="Behind" value={stats.behind} color="red" />
            <StatPill label="On Track" value={stats.onTrack} color="blue" />
            <StatPill label="Eps Received" value={stats.totalEpsReceived} color="purple" />
            <StatPill label="Eps Behind" value={stats.totalEpsBehind} color="red" />
          </div>
        )}

        {/* Export button — always visible */}
        <div className="flex gap-2 justify-end mt-3">
          <Button variant="outline" size="sm" onClick={activeTab === "aging" ? exportToExcel : activeTab === "target" ? exportTargetAgingToExcel : exportTrackingToExcel} disabled={activeTab === "tracking" ? trackingLoading || trackingProjects.length === 0 : loading || filtered.length === 0} className="gap-1.5 h-9 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>

        {/* Filters — hide on tracking tab */}
        <div className={`space-y-3 mt-3 ${activeTab === "tracking" ? "hidden" : ""}`}>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, writer, team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                variant={freezePanes ? "default" : "outline"}
                size="sm"
                onClick={() => setFreezePanes(f => !f)}
                className="gap-1.5 h-9 text-xs"
              >
                <Pin className="h-3.5 w-3.5" />
                {freezePanes ? "Unfreeze" : "Freeze Panes"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="BEHIND">Behind</SelectItem>
                <SelectItem value="ON_TRACK">On Track</SelectItem>
              </SelectContent>
            </Select>
            <Select value={slotFilter} onValueChange={setSlotFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Slots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                {allSlots.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamHeadFilter} onValueChange={setTeamHeadFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Team Heads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Heads</SelectItem>
                {allTeamHeads.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={writerFilter} onValueChange={setWriterFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Writers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Writers</SelectItem>
                {allWriters.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Schedules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schedules</SelectItem>
                {allSchedules.map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={oneLinerRatingFilter} onValueChange={setOneLinerRatingFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="One-liner Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All One-liner Ratings</SelectItem>
                <SelectItem value="high">High (8+)</SelectItem>
                <SelectItem value="mid">Medium (6–8)</SelectItem>
                <SelectItem value="low">Low (&lt;6)</SelectItem>
                <SelectItem value="unrated">Unrated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={episodicRatingFilter} onValueChange={setEpisodicRatingFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Episodic Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Episodic Ratings</SelectItem>
                <SelectItem value="high">High (8+)</SelectItem>
                <SelectItem value="mid">Medium (6–8)</SelectItem>
                <SelectItem value="low">Low (&lt;6)</SelectItem>
                <SelectItem value="unrated">Unrated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deliveryPeriod} onValueChange={(v) => setDeliveryPeriod(v as typeof deliveryPeriod)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Delivery Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="biannual">Bi-Annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deliveryRank} onValueChange={(v) => setDeliveryRank(v as typeof deliveryRank)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Delivery Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deliveries</SelectItem>
                <SelectItem value="max">Max Delivery Writer</SelectItem>
                <SelectItem value="min">Min Delivery Writer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden">
      <div ref={freezeRef} className="overflow-auto h-full py-4">
        {activeTab === "tracking" ? (
          trackingLoading ? (
            <div className="flex items-center justify-center h-64 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading tracking data...</span>
            </div>
          ) : trackingProjects.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">No projects with episodes found.</div>
            </div>
          ) : (
            <div className="space-y-4">
              <DeliveryTrendChart projects={trackingProjects} />
              <TrackingTable projects={trackingProjects} globalMaxRevisions={trackingMaxRevisions} onUpdate={(projects) => setTrackingProjects(projects)} />
            </div>
          )
        ) : loading ? (
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
                <th colSpan={9} rowSpan={2} className="px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-border bg-amber-50 text-amber-700 uppercase tracking-wide">
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
                <Th width={90} center>Phase</Th>
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
                  // <Th key={`${mg.key}-till`} width={70} center className="font-bold bg-amber-50 text-amber-800 !whitespace-normal leading-tight">Till {mg.label}</Th>,  // --- Till column hidden (old cumulative formula) ---
                ])}
                <Th width={160} center className="bg-red-50 text-red-700 !whitespace-normal leading-tight">Reason for Delay</Th>
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
                  <Td width={90} center>
                    {(() => {
                      const phase = getProductionPhase(project.totalEps, project.epsReceived);
                      if (!phase) return <span className="text-muted-foreground/30">·</span>;
                      const color = phase === "Production Start" ? "text-green-700 bg-green-50"
                        : phase === "Pre Production" ? "text-blue-700 bg-blue-50"
                        : "text-amber-700 bg-amber-50";
                      return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{phase}</span>;
                    })()}
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

                  {/* Month week cells — per-week deltas, month total, till date */}
                  {monthGroups.flatMap((mg) => {
                    const weekCounts = mg.weeks.map((w) => project.weekDelivery[w.isoWeek] ?? 0);
                    const monthDelivery = weekCounts.reduce((s, c) => s + c, 0);
                    const c = project.commitment;
                    const projCum = cumulativeData.get(project.id);
                    const isCustom = c?.commitment_schedule === "custom";
                    const monthDelta = projCum?.monthDeltas[mg.key] ?? null;
                    const tillDelta = projCum?.tillDeltas[mg.key] ?? null;

                    return [
                      ...mg.weeks.map((w, i) => {
                        const count = project.weekDelivery[w.isoWeek] ?? 0;
                        const weekDelta = projCum?.weekDeltas[w.isoWeek] ?? null;
                        const weekActive = weekDelta !== null;
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
                                {weekActive ? (
                                  weekDelta === 0 ? (
                                    <span className="text-gray-400">0</span>
                                  ) : (
                                    <span className={weekDelta < 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                      {weekDelta > 0 ? `+${weekDelta}` : weekDelta}
                                    </span>
                                  )
                                ) : isCustom ? (
                                  <span className="text-gray-400 cursor-help" title={c.commitment_schedule_custom || "Custom schedule"}>⬥</span>
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
                        {monthDelivery > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            {monthDelivery}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">·</span>
                        )}
                        {c && (() => {
                          let behind: number | null = null;
                          if (projCum) {
                            const lastActive = [...mg.weeks].reverse().find((w) => w.isoWeek in projCum.weekDeltas);
                            behind = lastActive ? projCum.weekDeltas[lastActive.isoWeek] : null;
                            if (behind === null) behind = projCum.monthDeltas[mg.key] ?? null;
                          }
                          if (behind === null) {
                            if (isCustom) return (
                              <div className="text-xs mt-0.5 leading-none">
                                <span className="text-gray-400 cursor-help" title={c.commitment_schedule_custom || "Custom schedule"}>⬥</span>
                              </div>
                            );
                            return null;
                          }
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
                      // --- Till column hidden (old cumulative formula) ---
                      // <Td key={`${mg.key}-till`} width={70} center className="bg-amber-50/50">
                      //   {tillDelta === null ? (
                      //     <span className="text-muted-foreground/30">·</span>
                      //   ) : (
                      //     <span className={`font-bold ${tillDelta === 0 ? "text-gray-400" : tillDelta < 0 ? "text-red-600" : "text-green-600"}`}>
                      //       {tillDelta === 0 ? "0" : tillDelta > 0 ? `+${tillDelta}` : tillDelta}
                      //     </span>
                      //   )}
                      // </Td>,
                    ];
                  })}
                  <Td width={160} className="text-xs text-muted-foreground">
                    {project.commitment?.delay_notes ? (
                      <span title={project.commitment.delay_notes} className="block truncate max-w-[150px]">{project.commitment.delay_notes}</span>
                    ) : ""}
                  </Td>
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
  const minWidth = STICKY_TOTAL + 740 + visibleOneLinerAssessors.length * 90 + visibleEvaluators.length * 2 * 80;

  return (
    <table className="w-full text-sm border-separate border-spacing-0" style={{ minWidth }}>
      <thead>
        {/* Row 1: level group headers (Management / Programming / Evaluator) */}
        <tr className="bg-muted/80">
          <Th width={W_NUM} rowSpan={3}>#</Th>
          <Th width={W_TITLE} rowSpan={3}>Title</Th>
          <Th width={W_WRITER} rowSpan={3}>Writer</Th>
          <th colSpan={8} className="px-3 py-1.5 text-xs font-semibold text-center border-b border-r border-border bg-slate-100 text-slate-600 uppercase tracking-wide" rowSpan={2}>
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
          <Th width={160} rowSpan={3} className="bg-red-50 text-red-700 !whitespace-normal leading-tight">Reason for Delay</Th>
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
          <Th width={90} center>Phase</Th>
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
            <Td width={90} center>
              {(() => {
                const phase = getProductionPhase(project.totalEps, project.epsReceived);
                if (!phase) return <span className="text-muted-foreground/30">·</span>;
                const color = phase === "Production Start" ? "text-green-700 bg-green-50"
                  : phase === "Pre Production" ? "text-blue-700 bg-blue-50"
                  : "text-amber-700 bg-amber-50";
                return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{phase}</span>;
              })()}
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
            <Td width={160} className="text-xs text-muted-foreground !whitespace-normal leading-snug">
              {project.commitment?.delay_notes ?? ""}
            </Td>
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

// ============================================================
// Editable Cell — click to edit, shows Save button, then displays saved value
// ============================================================
function EditableCell({ value, onSave, placeholder = "—" }: { value: string | null; onSave: (v: string) => Promise<void>; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saved, setSaved] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(draft);
      setEditing(false);
    } catch { /* toast handled by caller */ }
    setSaving(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          autoFocus
          className="flex-1 text-xs bg-white border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-1.5 text-center"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setDraft(saved); setEditing(false); } }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? "..." : "Save"}
        </button>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer text-center text-xs px-1 py-0.5 rounded hover:bg-muted/50 min-h-[22px] flex items-center justify-center"
      onClick={() => { setDraft(saved); setEditing(true); }}
      title="Click to edit"
    >
      {saved || <span className="text-muted-foreground/40">{placeholder}</span>}
    </div>
  );
}

// ============================================================
// Tracking Table Component
// ============================================================
function DeliveryTrendChart({ projects }: { projects: TrackingProject[] }) {
  const [chartProject, setChartProject] = useState<string>("all");
  const [chartWriter, setChartWriter] = useState<string>("all");
  const [chartSlot, setChartSlot] = useState<string>("all");
  const [chartTeam, setChartTeam] = useState<string>("all");
  const [chartGrade, setChartGrade] = useState<string>("all");

  // Derive unique filter options
  const filterOptions = useMemo(() => {
    const writers = new Set<string>();
    const slots = new Set<string>();
    const teams = new Set<string>();
    for (const p of projects) {
      if (p.writerName) writers.add(p.writerName);
      if (p.targetSlot) slots.add(p.targetSlot);
      if (p.teamName) teams.add(p.teamName);
    }
    return {
      writers: Array.from(writers).sort(),
      slots: Array.from(slots).sort(),
      teams: Array.from(teams).sort(),
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (chartProject !== "all" && p.id !== chartProject) return false;
      if (chartWriter !== "all" && p.writerName !== chartWriter) return false;
      if (chartSlot !== "all" && p.targetSlot !== chartSlot) return false;
      if (chartTeam !== "all" && p.teamName !== chartTeam) return false;
      if (chartGrade !== "all") {
        const score = p.avgScore;
        if (chartGrade === "high" && (score === null || score < 7)) return false;
        if (chartGrade === "mid" && (score === null || score < 5 || score >= 7)) return false;
        if (chartGrade === "low" && (score === null || score >= 5)) return false;
        if (chartGrade === "ungraded" && score !== null) return false;
      }
      return true;
    });
  }, [projects, chartProject, chartWriter, chartSlot, chartTeam, chartGrade]);

  const chartData = useMemo(() => {
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const toIdx = (key: string) => { const [m, y] = key.split(" "); return (2000 + parseInt(y)) * 12 + MONTHS.indexOf(m); };
    const fromIdx = (idx: number) => { const y = Math.floor(idx / 12); const m = idx % 12; return `${MONTHS[m]} ${String(y).slice(2)}`; };

    const agg = new Map<string, { freshEps: number; revEps: number }>();
    for (const p of filteredProjects) {
      for (const entry of p.monthlySummary || []) {
        const existing = agg.get(entry.month) || { freshEps: 0, revEps: 0 };
        existing.freshEps += entry.freshEps;
        existing.revEps += entry.revEps;
        agg.set(entry.month, existing);
      }
    }
    // Fill in all months from Jan 2026 to last data point
    const indices = Array.from(agg.keys()).map(toIdx);
    const jan26Idx = 2026 * 12 + 0; // Jan 2026
    const minIdx = indices.length > 0 ? Math.min(jan26Idx, ...indices) : jan26Idx;
    const maxIdx = indices.length > 0 ? Math.max(...indices) : jan26Idx;
    const result: { month: string; "Fresh Eps": number; "Rev Eps": number }[] = [];
    for (let i = minIdx; i <= maxIdx; i++) {
      const key = fromIdx(i);
      const d = agg.get(key);
      result.push({ month: key, "Fresh Eps": d?.freshEps ?? 0, "Rev Eps": d?.revEps ?? 0 });
    }
    return result;
  }, [filteredProjects]);

  const chartTitle = useMemo(() => {
    if (chartProject !== "all") {
      const p = projects.find((p) => p.id === chartProject);
      return p ? `${p.workingTitle} — Received Episodes Trend` : "Received Episodes Trend";
    }
    return "Monthly Delivery Trend";
  }, [chartProject, projects]);

  const renderLabel = (props: any) => {
    const { x, y, value } = props;
    return <text x={x} y={y - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill={props.fill || "#374151"}>{value}</text>;
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{chartTitle}</h3>
      <div className="flex gap-2 mb-3 flex-wrap">
        <Select value={chartProject} onValueChange={setChartProject}>
          <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.workingTitle}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={chartWriter} onValueChange={setChartWriter}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Writer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Writers</SelectItem>
            {filterOptions.writers.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={chartSlot} onValueChange={setChartSlot}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Slot" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Slots</SelectItem>
            {filterOptions.slots.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={chartTeam} onValueChange={setChartTeam}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Team" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {filterOptions.teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={chartGrade} onValueChange={setChartGrade}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="high">High (7+)</SelectItem>
            <SelectItem value="mid">Mid (5-6.9)</SelectItem>
            <SelectItem value="low">Low (&lt;5)</SelectItem>
            <SelectItem value="ungraded">Ungraded</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No delivery data for selected filters</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 25, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Fresh Eps" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 5 }} activeDot={{ r: 7 }} label={(p: any) => renderLabel({ ...p, fill: "#2563eb" })} />
            <Line type="monotone" dataKey="Rev Eps" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 5 }} activeDot={{ r: 7 }} label={(p: any) => renderLabel({ ...p, fill: "#d97706" })} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function TrackingTable({
  projects,
  globalMaxRevisions,
  onUpdate,
}: {
  projects: TrackingProject[];
  globalMaxRevisions: number;
  onUpdate: (projects: TrackingProject[]) => void;
}) {
  // Each revision group = received + feedback + days = 3 cols
  const revColCount = globalMaxRevisions * 3;
  // Ep# + 1st Copy + Feedback + Days + revCols + PayReq + PayDate + Commitment + Status
  const totalCols = 4 + revColCount + 4;
  const minWidth = 50 + 110 * 2 + 55 + globalMaxRevisions * (110 + 110 + 55) + 120 * 2 + 180 + 140;

  const daysColor = (d: number | null) => {
    if (d === null) return "";
    if (d <= 7) return "text-green-700 bg-green-50";
    if (d <= 14) return "text-amber-700 bg-amber-50";
    return "text-red-700 bg-red-50";
  };

  const saveEpisodeField = async (episodeId: string, field: string, value: string) => {
    const res = await fetch("/api/management/content-aging/tracking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_id: episodeId, [field]: value || null }),
    });
    if (!res.ok) { toast.error("Failed to save"); throw new Error("Failed"); }
  };

  const saveProjectNotes = async (callReportId: string, value: string) => {
    const res = await fetch("/api/management/content-aging/tracking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_report_id: callReportId, tracking_notes: value || null }),
    });
    if (!res.ok) { toast.error("Failed to save"); throw new Error("Failed"); }
    onUpdate(projects.map((p) => p.id === callReportId ? { ...p, trackingNotes: value || null } : p));
  };

  const ordinal = (n: number) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

  return (
    <table className="w-full text-xs border-separate border-spacing-0" style={{ minWidth }}>
      <thead className="sticky top-0 z-10">
        <tr className="bg-muted/80">
          <th className="px-2 py-2 text-left text-xs font-semibold border-b border-r border-border whitespace-nowrap" style={{ width: 50 }}>Ep #</th>
          <th className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-blue-50 text-blue-700" style={{ width: 110 }}>1st Copy Received</th>
          <th className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-amber-50 text-amber-700" style={{ width: 110 }}>Feedback</th>
          <th className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-slate-100 text-slate-600" style={{ width: 55 }}>Days</th>
          {Array.from({ length: globalMaxRevisions }, (_, i) => [
            <th key={`rev-${i}`} className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-blue-50 text-blue-700" style={{ width: 110 }}>
              {ordinal(i + 1)} Revised
            </th>,
            <th key={`fb-${i}`} className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-amber-50 text-amber-700" style={{ width: 110 }}>
              Feedback
            </th>,
            <th key={`days-${i}`} className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-slate-100 text-slate-600" style={{ width: 55 }}>
              Days
            </th>,
          ]).flat()}
          <th className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-green-50 text-green-700" style={{ width: 120 }}>Payment Request</th>
          <th className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-green-50 text-green-700" style={{ width: 120 }}>Payment Date</th>
          <th className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-orange-50 text-orange-700" style={{ width: 180 }}>Writer&apos;s Commitment</th>
          <th className="px-2 py-2 text-center text-xs font-semibold border-b border-r border-border whitespace-nowrap bg-purple-50 text-purple-700" style={{ width: 140 }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <Fragment key={project.id}>
            <tr className="bg-slate-100 border-b border-border">
              <td colSpan={totalCols} className="px-3 py-2 border-b border-r border-border">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">{project.workingTitle}</span>
                  {project.writerName && <span className="text-muted-foreground">— {project.writerName}</span>}
                </div>
              </td>
            </tr>
            {project.episodes.map((ep, epIdx) => (
              <tr key={ep.id} className="border-b hover:bg-muted/30">
                <td className="px-2 py-1.5 border-r border-border/60 text-center font-medium">{ep.episodeNumber}</td>
                <td className="px-2 py-1.5 border-r border-border/60 text-center text-blue-700">{ep.firstCopyDate ?? ""}</td>
                <td className="px-2 py-1.5 border-r border-border/60 text-center text-amber-700">{ep.firstCopyFeedbackDate ?? ""}</td>
                <td className={`px-2 py-1.5 border-r border-border/60 text-center font-medium ${daysColor(ep.firstCopyFeedbackDays)}`}>
                  {ep.firstCopyFeedbackDays != null ? `${ep.firstCopyFeedbackDays}d` : ""}
                </td>
                {Array.from({ length: globalMaxRevisions }, (_, i) => {
                  const rev = ep.revisions[i];
                  return [
                    <td key={`rev-${i}`} className="px-2 py-1.5 border-r border-border/60 text-center text-blue-700">{rev?.receivedDate ?? ""}</td>,
                    <td key={`fb-${i}`} className="px-2 py-1.5 border-r border-border/60 text-center text-amber-700">{rev?.feedbackDate ?? ""}</td>,
                    <td key={`days-${i}`} className={`px-2 py-1.5 border-r border-border/60 text-center font-medium ${daysColor(rev?.feedbackDays ?? null)}`}>
                      {rev?.feedbackDays != null ? `${rev.feedbackDays}d` : ""}
                    </td>,
                  ];
                }).flat()}
                <td className="px-1 py-0.5 border-r border-border/60">
                  <EditableCell value={ep.paymentRequestDate} onSave={(v) => saveEpisodeField(ep.id, "payment_request_date", v)} />
                </td>
                <td className="px-1 py-0.5 border-r border-border/60">
                  <EditableCell value={ep.paymentDate} onSave={(v) => saveEpisodeField(ep.id, "payment_date", v)} />
                </td>
                {epIdx === 0 ? (
                  <td className="px-1 py-0.5 border-r border-border/60 align-top" rowSpan={project.episodes.length}>
                    <EditableCell value={project.trackingNotes} onSave={(v) => saveProjectNotes(project.id, v)} />
                  </td>
                ) : null}
                <td className="px-1 py-0.5 border-r border-border/60">
                  <EditableCell value={ep.trackingStatus} onSave={(v) => saveEpisodeField(ep.id, "tracking_status", v)} />
                </td>
              </tr>
            ))}
            {/* Monthly delivery summary row */}
            {project.monthlySummary && project.monthlySummary.length > 0 && (
              <tr className="bg-indigo-50/50 border-b border-border">
                <td colSpan={totalCols} className="px-3 py-1.5 border-b border-r border-border">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase mr-1">Monthly:</span>
                    {project.monthlySummary.map((ms) => (
                      <span key={ms.month} className="inline-flex items-center gap-0.5 text-[10px]">
                        <span className="font-medium text-slate-600">{ms.month}:</span>
                        {ms.freshEps > 0 && <span className="bg-blue-100 text-blue-700 px-1 rounded font-medium">{ms.freshEps}F</span>}
                        {ms.revEps > 0 && <span className="bg-amber-100 text-amber-700 px-1 rounded font-medium">{ms.revEps}R</span>}
                        {ms.freshEps === 0 && ms.revEps === 0 && <span className="text-slate-400">0</span>}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
