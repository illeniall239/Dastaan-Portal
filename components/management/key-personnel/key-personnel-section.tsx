"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

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

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface PersonData {
  user_id: string;
  name: string;
  email: string;
  role: string;
  evaluations: number;
  episodes_evaluated: number;
  last_activity: string | null;
  is_idle: boolean;
  effective_last_login: string | null;
  total_sessions: number;
  period_minutes: number;
  is_online: boolean;
  pending_evals: number;
  pending_eps_evals: number;
}

function Num({ value }: { value: number }) {
  return (
    <span className={`font-medium tabular-nums ${value === 0 ? "text-slate-300" : "text-slate-800"}`}>
      {value}
    </span>
  );
}

function PersonRow({ p }: { p: PersonData }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-teal-700">
                {p.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {p.is_online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900">{p.name}</span>
              {p.is_idle && !p.is_online && (
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Idle
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{p.role.replace(/_/g, " ")}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center"><Num value={p.evaluations} /></td>
      <td className="px-4 py-3 text-center"><Num value={p.episodes_evaluated} /></td>
      {/* Pending Eps Eval cell hidden for now */}
      <td className="px-4 py-3 text-center">
        {p.pending_evals > 0 ? (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            {p.pending_evals} pending
          </span>
        ) : (
          <span className="text-slate-300 text-sm font-medium">0</span>
        )}
      </td>
      <td className="px-4 py-3 text-right hidden md:table-cell">
        {p.effective_last_login ? (
          <div>
            <p className="text-xs text-slate-500 leading-tight">{timeAgo(p.effective_last_login)}</p>
            {p.total_sessions > 0 && (
              <p className="text-[10px] text-slate-400">{p.total_sessions} session{p.total_sessions !== 1 ? "s" : ""}</p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-amber-600 font-medium">Never logged in</p>
        )}
      </td>
      <td className="px-4 py-3 text-right hidden md:table-cell">
        <p className="text-xs text-slate-500">{formatDuration(p.period_minutes)}</p>
      </td>
    </tr>
  );
}

export function KeyPersonnelSection() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<PersonData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: Range) => {
    setLoading(true);
    setError(null);
    try {
      const from = fromDate(r);
      const url = from
        ? `/api/management/key-personnel-activity?from=${encodeURIComponent(from)}&_t=${Date.now()}`
        : `/api/management/key-personnel-activity?_t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
      setData(json.personnel);
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
    <div className="space-y-3">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Key Personnel Activity</h2>
          <p className="text-xs text-slate-500 mt-0.5">Individual activity for key decision-makers</p>
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
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      )}

      {data && (
        <div className={`transition-opacity ${loading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
          <Card className="overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b">
              <CardTitle className="text-sm font-semibold text-slate-700">Activity Overview</CardTitle>
            </div>
            <CardContent className="p-0">
              {data.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                  No data found for key personnel.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-slate-400 font-medium">Person</th>
                        <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap">Evals Done</th>
                        <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap">Eps Eval</th>
                        {/* Pending Eps Eval column hidden for now — data available via pending_eps_evals */}
                        <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap">Pending Evals</th>
                        <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wide text-slate-400 font-medium hidden md:table-cell whitespace-nowrap">Last Login</th>
                        <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wide text-slate-400 font-medium hidden md:table-cell whitespace-nowrap">Median Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(p => <PersonRow key={p.user_id} p={p} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
