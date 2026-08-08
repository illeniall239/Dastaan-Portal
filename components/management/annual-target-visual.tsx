"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";

interface TeamRow {
  teamId: string;
  teamName: string;
  target8pm: number;
  target7_9pm: number;
  achieved8pm: number;
  achieved7_9pm: number;
  achievedTotal: number;
  approved8pm: number;
  approved7_9pm: number;
  approvedTotal: number;
  diff8pm: number;
  diff7_9pm: number;
  diffTotal: number;
}

interface ApiResponse {
  success: boolean;
  year: number;
  teams: TeamRow[];
  totals: {
    target8pm: number;
    target7_9pm: number;
    targetTotal: number;
    achieved8pm: number;
    achieved7_9pm: number;
    achievedTotal: number;
    approved8pm: number;
    approved7_9pm: number;
    approvedTotal: number;
    diff8pm: number;
    diff7_9pm: number;
    diffTotal: number;
  };
}

type SlotFilter = "all" | "8pm" | "7_9pm";

export function AnnualTargetVisual() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<SlotFilter>("all");

  useEffect(() => {
    fetch(`/api/programmer/annual-targets?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { rows, target, achieved, approved, diff } = useMemo(() => {
    if (!data) return { rows: [], target: 0, achieved: 0, approved: 0, diff: 0 };

    const mapped = data.teams.map((t) => {
      const tgt =
        slot === "8pm" ? t.target8pm : slot === "7_9pm" ? t.target7_9pm : t.target8pm + t.target7_9pm;
      const ach =
        slot === "8pm" ? t.achieved8pm : slot === "7_9pm" ? t.achieved7_9pm : t.achievedTotal;
      const apr =
        slot === "8pm" ? t.approved8pm : slot === "7_9pm" ? t.approved7_9pm : t.approvedTotal;
      return {
        ...t,
        target: tgt,
        achieved: ach,
        approved: apr,
        diff: ach - tgt,
      };
    });

    // Sort: most behind first
    mapped.sort((a, b) => a.diff - b.diff);

    const tgt =
      slot === "8pm"
        ? data.totals.target8pm
        : slot === "7_9pm"
        ? data.totals.target7_9pm
        : data.totals.targetTotal;
    const ach =
      slot === "8pm"
        ? data.totals.achieved8pm
        : slot === "7_9pm"
        ? data.totals.achieved7_9pm
        : data.totals.achievedTotal;
    const apr =
      slot === "8pm"
        ? data.totals.approved8pm
        : slot === "7_9pm"
        ? data.totals.approved7_9pm
        : data.totals.approvedTotal;

    return { rows: mapped, target: tgt, achieved: ach, approved: apr, diff: ach - tgt };
  }, [data, slot]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.teams.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No annual target data available.
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(...rows.map((r) => Math.max(r.target, r.achieved)), 1);
  const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;

  const filters: { key: SlotFilter; label: string }[] = [
    { key: "all", label: "All Slots" },
    { key: "8pm", label: "8PM" },
    { key: "7_9pm", label: "7/9PM" },
  ];

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {/* Slot-wise summary with pie charts */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "8PM Slot", achieved: data.totals.achieved8pm, target: data.totals.target8pm, approved: data.totals.approved8pm, diff: data.totals.diff8pm },
            { label: "7/9PM Slot", achieved: data.totals.achieved7_9pm, target: data.totals.target7_9pm, approved: data.totals.approved7_9pm, diff: data.totals.diff7_9pm },
          ].map((s) => {
            const remaining = Math.max(s.target - s.achieved, 0);
            const over = Math.max(s.achieved - s.target, 0);
            const inWriting = s.achieved - s.approved;
            const pieData = [
              { name: "Approved", value: s.approved, color: "#22c55e" },
              { name: "In Writing", value: Math.max(inWriting, 0), color: "#60a5fa" },
              ...(remaining > 0 ? [{ name: "Remaining", value: remaining, color: "#e5e7eb" }] : []),
              ...(over > 0 ? [{ name: "Over Target", value: over, color: "#a3e635" }] : []),
            ].filter((d) => d.value > 0);
            const pctVal = s.target > 0 ? Math.round((s.achieved / s.target) * 100) : 0;

            return (
              <div key={s.label} className={`rounded-lg px-4 py-3 border ${s.diff >= 0 ? "bg-green-50/50 border-green-200" : "bg-red-50/50 border-red-200"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{s.label}</span>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${s.diff >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {s.diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {s.diff >= 0 ? "On Track" : "Behind"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={24}
                          outerRadius={36}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pieData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-900">{pctVal}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-lg font-bold text-gray-900">
                      {s.achieved}<span className="text-sm font-normal text-gray-400">/{s.target}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{s.approved} approved</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{inWriting} in writing</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter + inline total */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Overall:</span>
            <span className="font-bold text-gray-900">{achieved}/{target}</span>
            <span className={`inline-flex items-center gap-0.5 font-bold ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
              {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {diff > 0 ? `+${diff}` : diff}
              <span className="text-gray-400 font-normal ml-0.5">({pct}%)</span>
            </span>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setSlot(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  slot === f.key
                    ? "bg-white text-[#224794] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal progress bars per team */}
        <div className="space-y-3">
          {rows.map((r) => {
            const targetW = (r.target / maxVal) * 100;
            const achievedW = (r.achieved / maxVal) * 100;
            const behind = r.diff < 0;

            return (
              <div key={r.teamId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-800">
                    {r.teamName}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      behind ? "text-red-600" : r.diff > 0 ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {r.achieved}/{r.target}
                    {r.diff !== 0 && (
                      <span className="ml-1">
                        ({r.diff > 0 ? "+" : ""}{r.diff})
                      </span>
                    )}
                  </span>
                </div>
                <div className="relative h-5 w-full">
                  {/* Target bar (background) */}
                  <div
                    className="absolute top-0 left-0 h-5 rounded bg-gray-100 border border-gray-200"
                    style={{ width: `${targetW}%` }}
                  />
                  {/* Achieved bar (overlay) */}
                  <div
                    className={`absolute top-0 left-0 h-5 rounded transition-all duration-500 ${
                      behind
                        ? "bg-red-400/70 border border-red-300"
                        : "bg-green-400/70 border border-green-300"
                    }`}
                    style={{ width: `${achievedW}%` }}
                  />
                  {/* Target marker line */}
                  <div
                    className="absolute top-0 h-5 w-0.5 bg-gray-400"
                    style={{ left: `${targetW}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
            Target
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-400/70 border border-green-300" />
            On track
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400/70 border border-red-300" />
            Behind
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-3 bg-gray-400" />
            Target line
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
