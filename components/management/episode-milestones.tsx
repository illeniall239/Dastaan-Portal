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

      {drillDown && <DrillDownDialog {...drillDown} onClose={() => setDrillDown(null)} />}
    </>
  );
}
