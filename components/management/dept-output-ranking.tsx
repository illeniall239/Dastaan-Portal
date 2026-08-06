"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Film, FileText } from "lucide-react";

interface MonthData {
  month: string;
  episodes: number;
  oneLiners: number;
}

interface TeamOutput {
  teamId: string;
  teamName: string;
  totalEpisodes: number;
  totalOneLiners: number;
  avgEpisodesPerMonth: number;
  monthly: MonthData[];
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(mo) - 1]} '${y.slice(2)}`;
}

function rankBadge(index: number) {
  if (index === 0) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (index === 1) return <Trophy className="h-4 w-4 text-gray-400" />;
  if (index === 2) return <Trophy className="h-4 w-4 text-amber-700" />;
  return <span className="text-xs text-gray-400 font-mono w-4 text-center">#{index + 1}</span>;
}

export function DeptOutputRanking() {
  const [data, setData] = useState<TeamOutput[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/management/dept-output?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.data || []);
        setMonths(res.months || []);
      })
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

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No output data available.
        </CardContent>
      </Card>
    );
  }

  const maxEps = Math.max(...data.map((d) => d.totalEpisodes), 1);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs w-8">#</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs">Content Dept</th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs">
                  <span className="flex items-center justify-center gap-1"><Film className="h-3 w-3" /> Episodes</span>
                </th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs">
                  <span className="flex items-center justify-center gap-1"><FileText className="h-3 w-3" /> One-Liners</span>
                </th>
                <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs">Avg/Mo</th>
                {months.map((m) => (
                  <th key={m} className="text-center py-2.5 px-2 font-medium text-gray-500 text-[10px] whitespace-nowrap">
                    {formatMonth(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((team, i) => (
                <tr key={team.teamId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="py-2.5 px-4">{rankBadge(i)}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-gray-800 text-sm">{team.teamName}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="font-bold text-teal-700">{team.totalEpisodes}</span>
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${(team.totalEpisodes / maxEps) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-blue-700">
                    {team.totalOneLiners}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant="outline" className="text-[11px] font-semibold">
                      {team.avgEpisodesPerMonth}/mo
                    </Badge>
                  </td>
                  {team.monthly.map((md) => (
                    <td key={md.month} className="py-2.5 px-2 text-center text-xs">
                      {md.episodes > 0 ? (
                        <span className="font-semibold text-teal-700">{md.episodes}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
