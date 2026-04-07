"use client";

import { useState, useEffect, useCallback } from "react";
import { AccountabilityTable } from "./accountability-table";
import { Loader2, RefreshCw } from "lucide-react";

type Range = "7d" | "30d" | "3m" | "all";

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "3m", label: "Last 3 months" },
  { key: "all", label: "All time" },
];

function fromDate(range: Range): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "7d") now.setDate(now.getDate() - 7);
  else if (range === "30d") now.setDate(now.getDate() - 30);
  else if (range === "3m") now.setMonth(now.getMonth() - 3);
  return now.toISOString();
}

export function TeamActivitySection() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: Range) => {
    setLoading(true);
    setError(null);
    try {
      const from = fromDate(r);
      const url = from
        ? `/api/management/team-activity?from=${encodeURIComponent(from)}&_t=${Date.now()}`
        : `/api/management/team-activity?_t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
      setData(json.memberActivity);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Team Accountability</h2>
          <p className="text-xs text-slate-500 mt-0.5">Activity per team and member — login and content output</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                  range === r.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchData(range)}
            disabled={loading}
            className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading team activity...
        </div>
      )}

      {data && (
        <div className={`transition-opacity ${loading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
          <AccountabilityTable data={data} />
        </div>
      )}
    </div>
  );
}
