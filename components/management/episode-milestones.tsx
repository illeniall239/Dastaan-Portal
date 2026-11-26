"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type Slot = "8PM" | "7/9PM" | "No slot";

interface TrackerProject {
  id: string;
  title: string;
  writer: string;
  head: string;
  slot: Slot;
  contentType: string | null;
  episodes: number;
}

interface DrillDown {
  title: string;
  projects: TrackerProject[];
}

// Milestones (as before): [min, max)
const SERIAL_BUCKETS = [
  { min: 20, max: Infinity, label: "20+" },
  { min: 15, max: 20, label: "15–19" },
  { min: 10, max: 15, label: "10–14" },
  { min: 5, max: 10, label: "5–9" },
];
const LONG_SERIAL_BUCKETS = [
  { min: 40, max: Infinity, label: "40+" },
  { min: 30, max: 40, label: "30–39" },
  { min: 20, max: 30, label: "20–29" },
  { min: 10, max: 20, label: "10–19" },
];

// Episodes in hand, per content head
const HAND_BUCKETS = [
  { label: "One-liner only", test: (n: number) => n === 0, color: "bg-slate-300" },
  { label: "1–10 eps", test: (n: number) => n >= 1 && n <= 10, color: "bg-sky-300" },
  { label: "11–15 eps", test: (n: number) => n >= 11 && n <= 15, color: "bg-sky-500" },
  { label: "16–20 eps", test: (n: number) => n >= 16 && n <= 20, color: "bg-blue-600" },
  { label: "21+ eps", test: (n: number) => n >= 21, color: "bg-indigo-800" },
];

const SLOTS: Slot[] = ["8PM", "7/9PM", "No slot"];

function DrillDownDialog({ title, projects, onClose }: DrillDown & { onClose: () => void }) {
  const rows = [...projects].sort((a, b) => b.episodes - a.episodes);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No projects found</div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200">
                  {["Title", "Writer", "Content Head", "Slot", "Episodes"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-800 font-medium">{p.title}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{p.writer}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{p.head}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{p.slot}</td>
                    <td className="px-3 py-2 text-gray-700 tabular-nums">{p.episodes === 0 ? "One-liner only" : p.episodes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-muted-foreground text-right py-2 pr-3">
              {rows.length} project{rows.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MilestoneRow({
  label, buckets, color, projects, onOpen,
}: {
  label: string;
  buckets: { min: number; max: number; label: string }[];
  color: string;
  projects: TrackerProject[];
  onOpen: (d: DrillDown) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{label}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => {
          const inBucket = projects.filter((p) => p.episodes >= b.min && p.episodes < b.max);
          return (
            <button
              key={b.min}
              type="button"
              onClick={() => onOpen({ title: `${label} — ${b.label} Episodes`, projects: inBucket })}
              className={`rounded-lg border p-3 text-center ${color} transition-shadow hover:shadow-md hover:ring-1 hover:ring-gray-300 cursor-pointer`}
            >
              <div className="text-2xl font-bold tabular-nums">{inBucket.length}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.label} eps</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One bar per content head: their scripts split by episodes in hand, plus their 8PM / 7/9PM split */
function ByContentHead({
  projects, onOpen, onPickHead,
}: {
  projects: TrackerProject[];
  onOpen: (d: DrillDown) => void;
  onPickHead: (head: string) => void;
}) {
  const heads = useMemo(() => {
    const byHead = new Map<string, TrackerProject[]>();
    for (const p of projects) byHead.set(p.head, [...(byHead.get(p.head) ?? []), p]);
    return [...byHead].sort((a, b) => (a[0] === "(no team)" ? 1 : 0) - (b[0] === "(no team)" ? 1 : 0) || b[1].length - a[1].length);
  }, [projects]);
  const max = Math.max(1, ...heads.map(([, ps]) => ps.length));

  if (heads.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No projects match these filters</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">By content head — episodes in hand</h3>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {HAND_BUCKETS.map((b) => (
            <span key={b.label} className="inline-flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${b.color}`} />{b.label}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {heads.map(([head, ps]) => {
          const slots = SLOTS.map((s) => [s, ps.filter((p) => p.slot === s).length] as const).filter(([, n]) => n > 0);
          return (
            <div key={head} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3">
              <button
                type="button"
                onClick={() => onPickHead(head)}
                className="text-left text-sm font-medium text-gray-800 truncate hover:underline"
                title={`Show only ${head}`}
              >
                {head}
              </button>
              <div className="h-6 flex rounded overflow-hidden bg-gray-50" style={{ width: `${Math.max(8, (ps.length / max) * 100)}%` }}>
                {HAND_BUCKETS.map((b) => {
                  const inBucket = ps.filter((p) => b.test(p.episodes));
                  if (inBucket.length === 0) return null;
                  return (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => onOpen({ title: `${head} — ${b.label}`, projects: inBucket })}
                      className={`${b.color} h-full text-[10px] font-semibold text-white/90 hover:brightness-110 transition`}
                      style={{ width: `${(inBucket.length / ps.length) * 100}%` }}
                      title={`${b.label}: ${inBucket.length}`}
                    >
                      {inBucket.length / ps.length >= 0.08 ? inBucket.length : ""}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                <span className="font-semibold text-gray-800">{ps.length}</span>
                {" · "}
                {slots.map(([s, n], i) => (
                  <span key={s}>{i > 0 && " · "}{s} {n}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EpisodeMilestones() {
  const [projects, setProjects] = useState<TrackerProject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [head, setHead] = useState("all");
  const [slot, setSlot] = useState("all");
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  useEffect(() => {
    fetch("/api/management/episode-milestones")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const heads = useMemo(() => [...new Set((projects ?? []).map((p) => p.head))].sort(), [projects]);
  const filtered = useMemo(
    () => (projects ?? []).filter((p) => (head === "all" || p.head === head) && (slot === "all" || p.slot === slot)),
    [projects, head, slot]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!projects) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">Failed to load milestone data</CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Select value={head} onValueChange={setHead}>
          <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue placeholder="Content head" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All content heads</SelectItem>
            {heads.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={slot} onValueChange={setSlot}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Slot" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All slots</SelectItem>
            {SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {(head !== "all" || slot !== "all") && (
          <button type="button" onClick={() => { setHead("all"); setSlot("all"); }} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} project{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <MilestoneRow label="Serials" buckets={SERIAL_BUCKETS} color="bg-blue-50 border-blue-200"
              projects={filtered.filter((p) => p.contentType === "Serial")} onOpen={setDrillDown} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <MilestoneRow label="Long Serials" buckets={LONG_SERIAL_BUCKETS} color="bg-amber-50 border-amber-200"
              projects={filtered.filter((p) => p.contentType === "Long Serial")} onOpen={setDrillDown} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-5">
          <ByContentHead projects={filtered} onOpen={setDrillDown} onPickHead={setHead} />
        </CardContent>
      </Card>

      {drillDown && <DrillDownDialog {...drillDown} onClose={() => setDrillDown(null)} />}
    </>
  );
}
