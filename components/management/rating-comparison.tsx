"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

interface ComparisonRow {
  id: string;
  title: string;
  team: string;
  onelinerAvg: number | null;
  episodeAvg: number | null;
  diff: number | null;
  episodeCount: number;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 7) return "text-green-600";
  if (score >= 5) return "text-amber-600";
  return "text-red-600";
}

function diffBadge(diff: number | null) {
  if (diff === null) return null;
  if (diff > 0.5)
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 text-[11px] gap-1">
        <TrendingUp className="h-3 w-3" /> +{diff.toFixed(1)}
      </Badge>
    );
  if (diff < -0.5)
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 text-[11px] gap-1">
        <TrendingDown className="h-3 w-3" /> {diff.toFixed(1)}
      </Badge>
    );
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[11px] gap-1">
      <Minus className="h-3 w-3" /> {diff > 0 ? "+" : ""}{diff.toFixed(1)}
    </Badge>
  );
}

export function RatingComparison() {
  const [data, setData] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"title" | "diff">("diff");

  useEffect(() => {
    fetch(`/api/management/rating-comparison?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => setData(res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Only show projects that have at least one score
  const withBoth = data.filter((d) => d.onelinerAvg !== null || d.episodeAvg !== null);

  const sorted = [...withBoth].sort((a, b) => {
    if (sortBy === "diff") {
      const aDiff = a.diff !== null ? Math.abs(a.diff) : -1;
      const bDiff = b.diff !== null ? Math.abs(b.diff) : -1;
      return bDiff - aDiff;
    }
    return a.title.localeCompare(b.title);
  });

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No evaluation data available for comparison.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b">
          <span className="text-xs text-gray-500">Sort by:</span>
          <div className="flex rounded-md border overflow-hidden text-xs">
            <button
              className={`px-3 py-1 ${sortBy === "diff" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              onClick={() => setSortBy("diff")}
            >
              Biggest Gap
            </button>
            <button
              className={`px-3 py-1 ${sortBy === "title" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              onClick={() => setSortBy("title")}
            >
              A-Z
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs">Project</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs">Team</th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs">One-Liner</th>
                <th className="text-center py-2.5 px-1 font-medium text-gray-400 text-xs"></th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs">Episodes</th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs">Δ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="py-2 px-4">
                    <span className="font-medium text-gray-800">{row.title}</span>
                    {row.episodeCount > 0 && (
                      <span className="text-[10px] text-gray-400 ml-1.5">
                        ({row.episodeCount} ep{row.episodeCount !== 1 ? "s" : ""})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs text-gray-500">{row.team}</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`font-bold ${scoreColor(row.onelinerAvg)}`}>
                      {row.onelinerAvg !== null ? row.onelinerAvg.toFixed(1) : "—"}
                    </span>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`font-bold ${scoreColor(row.episodeAvg)}`}>
                      {row.episodeAvg !== null ? row.episodeAvg.toFixed(1) : "—"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {diffBadge(row.diff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
