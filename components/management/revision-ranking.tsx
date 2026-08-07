"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Trophy, ArrowDown, ArrowUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface ProjectRevision {
  id: string;
  title: string;
  writer: string;
  episodeCount: number;
  avgRevisions: number;
  maxRevision: number;
}

interface TeamRevision {
  teamId: string;
  teamName: string;
  totalRevisions: number;
  totalEpisodes: number;
  avgRevisions: number;
  projects: ProjectRevision[];
}

function rankColor(index: number, total: number): string {
  if (index === 0) return "#22c55e"; // Best (fewest revisions)
  if (index === total - 1) return "#ef4444"; // Worst
  return "#3b82f6";
}

function rankBadge(avgRevisions: number): { text: string; className: string } {
  if (avgRevisions <= 1.0) return { text: "Excellent", className: "bg-green-100 text-green-700 border-green-200" };
  if (avgRevisions <= 1.2) return { text: "Good", className: "bg-blue-100 text-blue-700 border-blue-200" };
  if (avgRevisions <= 1.5) return { text: "Average", className: "bg-amber-100 text-amber-700 border-amber-200" };
  return { text: "Needs Improvement", className: "bg-red-100 text-red-700 border-red-200" };
}

function TeamDrillDialog({ team, onClose }: { team: TeamRevision; onClose: () => void }) {
  const badge = rankBadge(team.avgRevisions);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{team.teamName}</DialogTitle>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
              {team.avgRevisions.toFixed(2)} avg
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {team.totalEpisodes} episodes across {team.projects.length} projects
          </p>
        </DialogHeader>

        <div className="overflow-auto flex-1 -mx-6 px-6">
          <div className="space-y-2">
            {team.projects.map((p) => {
              const pBadge = rankBadge(p.avgRevisions);
              return (
                <div key={p.id} className="border rounded-lg p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{p.title}</p>
                      <p className="text-xs text-gray-500">{p.writer}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pBadge.className}`}>
                        {p.avgRevisions.toFixed(2)} avg
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {p.episodeCount} eps
                      </Badge>
                      {p.maxRevision > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200">
                          max {p.maxRevision}R
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RevisionRanking() {
  const [data, setData] = useState<TeamRevision[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamRevision | null>(null);

  useEffect(() => {
    fetch(`/api/management/revision-ranking?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => setData(res.teams || null))
      .catch(() => setData(null))
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

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No revision data available yet.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((t, i) => ({
    name: t.teamName.replace("'s Team", ""),
    avgRevisions: t.avgRevisions,
    fill: rankColor(i, data.length),
    team: t,
  }));

  return (
    <>
      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Legend / summary */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            {data.map((t, i) => {
              const badge = rankBadge(t.avgRevisions);
              return (
                <div key={t.teamId} className="flex items-center gap-1.5 text-xs text-gray-600">
                  {i === 0 && <Trophy className="h-3.5 w-3.5 text-green-500" />}
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: rankColor(i, data.length) }} />
                  {t.teamName.replace("'s Team", "")}
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
                    {t.avgRevisions.toFixed(2)}
                  </Badge>
                </div>
              );
            })}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-800">{d.team.teamName}</p>
                      <p className="text-gray-500">{d.avgRevisions.toFixed(2)} avg revisions/episode</p>
                      <p className="text-gray-400">{d.team.totalEpisodes} episodes, {d.team.projects.length} projects</p>
                      <p className="text-[10px] text-gray-400 mt-1">Click for details</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="avgRevisions"
                radius={[6, 6, 0, 0]}
                cursor="pointer"
                onClick={(d: any) => setSelectedTeam(d.team)}
                maxBarSize={80}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-[10px] text-green-600">
              <ArrowDown className="h-3 w-3" /> Fewer revisions = cleaner first drafts
            </div>
            <div className="flex items-center gap-1 text-[10px] text-red-500">
              <ArrowUp className="h-3 w-3" /> More revisions = more feedback rounds
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Click a bar to see project breakdown
          </p>
        </CardContent>
      </Card>

      {selectedTeam && (
        <TeamDrillDialog team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </>
  );
}
