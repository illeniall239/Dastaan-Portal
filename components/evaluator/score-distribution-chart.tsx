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
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ── Shared types ── */

export interface ChartProject {
  id: string;
  title: string;
  writer: string;
  genre: string[];
  contentType: string | null;
  slot: string | null;
}

function DrillDownTable({ projects, label }: { projects: ChartProject[]; label: string }) {
  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      <p className="text-sm text-gray-500">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 pr-4 font-medium">Writer</th>
            <th className="py-2 pr-4 font-medium">Genre</th>
            <th className="py-2 font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-medium text-gray-900">{p.title}</td>
              <td className="py-2 pr-4 text-gray-600">{p.writer}</td>
              <td className="py-2 pr-4 text-gray-600">{p.genre.join(", ") || "—"}</td>
              <td className="py-2 text-gray-600">{p.contentType || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Slot Distribution ── */

const SLOT_COLORS: Record<string, string> = {
  "7 PM": "#3b82f6",
  "8 PM": "#8b5cf6",
  "9 PM": "#f59e0b",
};

function normalizeSlot(s: string): string {
  const m = s.match(/^(\d{1,2})(?::00)?\s*(PM|AM)$/i);
  if (m) return `${m[1]} ${m[2].toUpperCase()}`;
  return s;
}

export function SlotDistributionChart({ projects, bare }: { projects: ChartProject[]; bare?: boolean }) {
  const [drillDown, setDrillDown] = useState<{ label: string; items: ChartProject[] } | null>(null);

  const { data, projectsBySlot } = useMemo(() => {
    const buckets: Record<string, ChartProject[]> = { "7 PM": [], "8 PM": [], "9 PM": [] };

    for (const p of projects) {
      if (!p.slot) continue;
      const norm = normalizeSlot(p.slot);
      if (buckets[norm]) buckets[norm].push(p);
    }

    return {
      data: Object.entries(buckets).map(([name, items]) => ({
        name,
        count: items.length,
        color: SLOT_COLORS[name] || "#9ca3af",
      })),
      projectsBySlot: buckets,
    };
  }, [projects]);

  const maxValue = Math.max(...data.map((d) => d.count), 1);

  return (
    <>
      {bare ? (
        <div>
          <h3 className="text-[15px] font-bold text-[#15151A] mb-1">Projects by Time Slot</h3>
          <p className="text-[11.5px] text-[#7B7B85] mb-3">Active projects in 7, 8 &amp; 9 PM slots</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: "#374151", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, maxValue * 1.3]} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [`${value} projects`, "Count"]} contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60} cursor="pointer" onClick={(d: any) => { if (projectsBySlot[d.name]?.length) setDrillDown({ label: d.name, items: projectsBySlot[d.name] }); }}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 14, fontWeight: 700, fill: "#374151" }} />
                  {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
      <Card className="p-4 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Projects by Time Slot</h3>
        <p className="text-xs text-gray-500 mb-3">Active projects in 7, 8 &amp; 9 PM slots</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: "#374151", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, maxValue * 1.3]} allowDecimals={false} />
              <Tooltip formatter={(value: number) => [`${value} projects`, "Count"]} contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60} cursor="pointer" onClick={(d: any) => { if (projectsBySlot[d.name]?.length) setDrillDown({ label: d.name, items: projectsBySlot[d.name] }); }}>
                <LabelList dataKey="count" position="top" style={{ fontSize: 14, fontWeight: 700, fill: "#374151" }} />
                {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      )}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{drillDown?.label} Slot Projects</DialogTitle>
          </DialogHeader>
          {drillDown && <DrillDownTable projects={drillDown.items} label={drillDown.label} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Genre Distribution ── */

const GENRE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e",
  "#ef4444", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

export function GenreDistributionChart({ projects, bare }: { projects: ChartProject[]; bare?: boolean }) {
  const [drillDown, setDrillDown] = useState<{ label: string; items: ChartProject[] } | null>(null);

  const { data, projectsByGenre, total } = useMemo(() => {
    const buckets: Record<string, ChartProject[]> = {};
    for (const p of projects) {
      for (const g of p.genre) {
        if (!buckets[g]) buckets[g] = [];
        buckets[g].push(p);
      }
    }
    const sorted = Object.entries(buckets).sort((a, b) => b[1].length - a[1].length);
    const totalCount = sorted.reduce((s, [, items]) => s + items.length, 0);
    return {
      data: sorted.map(([name, items], i) => ({
        name,
        count: items.length,
        color: GENRE_COLORS[i % GENRE_COLORS.length],
      })),
      projectsByGenre: Object.fromEntries(sorted),
      total: totalCount,
    };
  }, [projects]);

  return (
    <>
      {bare ? (
        <div>
          <h3 className="text-[15px] font-bold text-[#15151A] mb-1">Genre coverage</h3>
          <p className="text-[11.5px] text-[#7B7B85] mb-3">Breakdown across active projects</p>
          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="name"
                  cursor="pointer"
                  onClick={(d: any) => { if (projectsByGenre[d.name]?.length) setDrillDown({ label: d.name, items: projectsByGenre[d.name] }); }}
                >
                  {data.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} projects`, name]} contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-gray-900 leading-none">{total}</span>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Total</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-2 px-1">
            {data.map((entry) => (
              <button
                key={entry.name}
                type="button"
                onClick={() => { if (projectsByGenre[entry.name]?.length) setDrillDown({ label: entry.name, items: projectsByGenre[entry.name] }); }}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-[11px] text-gray-700 font-medium">{entry.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
      <Card className="p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Projects by Genre</h3>
          <p className="text-xs text-gray-500 mb-3">Genre breakdown across active projects</p>
          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="name"
                  cursor="pointer"
                  onClick={(d: any) => { if (projectsByGenre[d.name]?.length) setDrillDown({ label: d.name, items: projectsByGenre[d.name] }); }}
                >
                  {data.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} projects`, name]} contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-gray-900 leading-none">{total}</span>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Total</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-2 px-1">
            {data.map((entry) => (
              <button
                key={entry.name}
                type="button"
                onClick={() => { if (projectsByGenre[entry.name]?.length) setDrillDown({ label: entry.name, items: projectsByGenre[entry.name] }); }}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-[11px] text-gray-700 font-medium">{entry.name}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
      )}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{drillDown?.label} Projects</DialogTitle>
          </DialogHeader>
          {drillDown && <DrillDownTable projects={drillDown.items} label={drillDown.label} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Content Type ── */

const CT_COLORS: Record<string, string> = {
  "Serial": "#3b82f6",
  "Long Serial": "#8b5cf6",
  "Telefilm": "#f59e0b",
  "Mini-serial": "#22c55e",
  "Ramadan Serial": "#ec4899",
  "Series Sitcom": "#06b6d4",
  "Soap": "#f97316",
};

export function ContentTypeChart({ projects, bare }: { projects: ChartProject[]; bare?: boolean }) {
  const [drillDown, setDrillDown] = useState<{ label: string; items: ChartProject[] } | null>(null);

  const { data, projectsByCT } = useMemo(() => {
    const buckets: Record<string, ChartProject[]> = {};
    for (const p of projects) {
      if (!p.contentType) continue;
      if (!buckets[p.contentType]) buckets[p.contentType] = [];
      buckets[p.contentType].push(p);
    }
    const sorted = Object.entries(buckets).sort((a, b) => b[1].length - a[1].length);
    return {
      data: sorted.map(([name, items]) => ({
        name,
        count: items.length,
        color: CT_COLORS[name] || "#9ca3af",
      })),
      projectsByCT: Object.fromEntries(sorted),
    };
  }, [projects]);

  const maxValue = Math.max(...data.map((d) => d.count), 1);

  return (
    <>
      {bare ? (
        <div>
          <h3 className="text-[15px] font-bold text-[#15151A] mb-1">Content Type</h3>
          <p className="text-[11.5px] text-[#7B7B85] mb-3">Serial, Telefilm &amp; other formats</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, maxValue * 1.3]} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [`${value} projects`, "Count"]} contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56} cursor="pointer" onClick={(d: any) => { if (projectsByCT[d.name]?.length) setDrillDown({ label: d.name, items: projectsByCT[d.name] }); }}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 13, fontWeight: 700, fill: "#374151" }} />
                  {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
      <Card className="p-4 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Content Type</h3>
        <p className="text-xs text-gray-500 mb-3">Serial, Telefilm &amp; other formats</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, maxValue * 1.3]} allowDecimals={false} />
              <Tooltip formatter={(value: number) => [`${value} projects`, "Count"]} contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56} cursor="pointer" onClick={(d: any) => { if (projectsByCT[d.name]?.length) setDrillDown({ label: d.name, items: projectsByCT[d.name] }); }}>
                <LabelList dataKey="count" position="top" style={{ fontSize: 13, fontWeight: 700, fill: "#374151" }} />
                {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      )}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{drillDown?.label} Projects</DialogTitle>
          </DialogHeader>
          {drillDown && <DrillDownTable projects={drillDown.items} label={drillDown.label} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
