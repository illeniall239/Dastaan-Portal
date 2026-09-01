"use client";

import { useEffect, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface TrackingProject {
  id: string;
  workingTitle: string;
  writerName: string | null;
  targetSlot: string | null;
  teamName: string | null;
  avgScore: number | null;
  monthlySummary: { month: string; freshEps: number; revEps: number }[];
}

export function DeliveryTrendSection() {
  const [projects, setProjects] = useState<TrackingProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [chartProject, setChartProject] = useState("all");
  const [chartWriter, setChartWriter] = useState("all");
  const [chartSlot, setChartSlot] = useState("all");
  const [chartTeam, setChartTeam] = useState("all");
  const [chartGrade, setChartGrade] = useState("all");

  useEffect(() => {
    fetch(`/api/management/content-aging/tracking?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    const indices = Array.from(agg.keys()).map(toIdx);
    const jan26Idx = 2026 * 12 + 0;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
