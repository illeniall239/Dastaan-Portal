"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Person = "salman" | "humera" | "mir";
type Range  = "7d" | "30d" | "3m" | "all";

const RANGES: { key: Range; label: string }[] = [
  { key: "7d",  label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "3m",  label: "Last 3 months" },
  { key: "all", label: "All time" },
];

function fromDate(range: Range): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "7d")  now.setDate(now.getDate() - 7);
  else if (range === "30d") now.setDate(now.getDate() - 30);
  else if (range === "3m")  now.setMonth(now.getMonth() - 3);
  return now.toISOString();
}

const TABS: { key: Person; label: string }[] = [
  { key: "salman", label: "Salman" },
  { key: "humera", label: "Humera" },
  { key: "mir",    label: "Mir" },
];

interface TurnaroundRow {
  Type: string;
  Title: string;
  "Idea Uploaded By": string;
  "Idea/Episode Upload Date": string;
  "Evaluated On": string;
  "Days Taken to Evaluate": string;
  Score: number | string;
}

interface TurnaroundData {
  salman: TurnaroundRow[];
  humera: TurnaroundRow[];
  mir:    TurnaroundRow[];
}

function TypeBadge({ type }: { type: string }) {
  const isEpisode = type === "Episode";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isEpisode
        ? "bg-purple-100 text-purple-700"
        : "bg-blue-100 text-blue-700"
    }`}>
      {type}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | string }) {
  if (score === "—" || score === "" || score == null) {
    return <span className="text-slate-400 text-xs">—</span>;
  }
  const n = Number(score);
  const color = n >= 7 ? "text-emerald-600" : n >= 5 ? "text-amber-600" : "text-red-600";
  return <span className={`font-semibold text-sm ${color}`}>{n.toFixed(1)}</span>;
}

function TurnaroundTable({ rows }: { rows: TurnaroundRow[] }) {
  if (!rows.length) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        No evaluations found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {["Type", "Title", "Idea Uploaded By", "Upload Date", "Evaluated On", "Days Taken", "Score"].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <TypeBadge type={row.Type} />
              </td>
              <td className="px-4 py-3 text-slate-800 font-medium max-w-[220px] truncate" title={row.Title}>
                {row.Title}
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {row["Idea Uploaded By"]}
              </td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                {row["Idea/Episode Upload Date"]}
              </td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                {row["Evaluated On"]}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`text-xs font-medium ${
                  row["Days Taken to Evaluate"] === "< 1 day"
                    ? "text-emerald-600"
                    : parseInt(row["Days Taken to Evaluate"]) <= 3
                    ? "text-amber-600"
                    : "text-red-600"
                }`}>
                  {row["Days Taken to Evaluate"]}
                </span>
              </td>
              <td className="px-4 py-3">
                <ScoreBadge score={row.Score} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IdeaTurnaroundSection() {
  const [active, setActive] = useState<Person>("salman");
  const [range, setRange]   = useState<Range>("30d");
  const [data, setData]     = useState<TurnaroundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const from = fromDate(range);
        const url = from
          ? `/api/management/idea-turnaround?from=${encodeURIComponent(from)}&_t=${Date.now()}`
          : `/api/management/idea-turnaround?_t=${Date.now()}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
        setData(json);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  const activeRows = data?.[active] ?? [];

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Idea Turnaround</h2>
          <p className="text-xs text-slate-500 mt-0.5">Evaluation response time for key assessors</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter */}
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
          {/* Person tabs */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                  active === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {data && (
                  <span className="ml-1.5 text-[10px] text-slate-400">
                    ({data[tab.key].length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading turnaround data...
        </div>
      )}

      {!loading && data && (
        <Card className="overflow-hidden">
          <div className="px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">
              {TABS.find(t => t.key === active)?.label}
            </p>
            <p className="text-xs text-slate-400">{activeRows.length} evaluation{activeRows.length !== 1 ? "s" : ""}</p>
          </div>
          <CardContent className="p-0">
            <TurnaroundTable rows={activeRows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
