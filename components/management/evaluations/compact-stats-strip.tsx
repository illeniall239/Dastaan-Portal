"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Clock, Loader2 } from "lucide-react";

interface CompactStatsStripProps {
  teams: any[];
  externalEvaluations: any[];
}

export function CompactStatsStrip({ teams, externalEvaluations }: CompactStatsStripProps) {
  const [stats, setStats] = useState({
    totalCallReportEvals: 0,
    totalEpisodicEvals: 0,
    activeEvaluators: 0,
    pendingEvals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, pendingRes] = await Promise.all([
          fetch("/api/management/evaluator-stats"),
          fetch("/api/management/pending-evaluations"),
        ]);

        if (!statsRes.ok || !pendingRes.ok) throw new Error("Failed to fetch");

        const { stats: evaluatorStats } = await statsRes.json();
        const { pendingCount } = await pendingRes.json();

        const totalCallReportEvals = evaluatorStats.reduce(
          (sum: number, s: any) => sum + (s.oneLinerEvaluations || 0),
          0
        );
        const totalEpisodicEvals = evaluatorStats.reduce(
          (sum: number, s: any) => sum + (s.episodicEvals || 0),
          0
        );

        setStats({
          totalCallReportEvals,
          totalEpisodicEvals,
          activeEvaluators: teams.reduce((sum, team) => sum + (team.member_count || 0), 0),
          pendingEvals: pendingCount ?? 0,
        });
      } catch {
        setStats({
          totalCallReportEvals: 0,
          totalEpisodicEvals: 0,
          activeEvaluators: teams.reduce((sum, team) => sum + (team.member_count || 0), 0),
          pendingEvals: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [teams, externalEvaluations]);

  const items = [
    { label: "One-Liner Evals", value: stats.totalCallReportEvals, icon: FileText, color: "text-blue-600" },
    { label: "Episodic Evals", value: stats.totalEpisodicEvals, icon: FileText, color: "text-purple-600" },
    { label: "Active Evaluators", value: stats.activeEvaluators, icon: Users, color: "text-green-600" },
    { label: "Pending", value: stats.pendingEvals, icon: Clock, color: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {items.map((item) => (
        <Card key={item.label} className="border border-gray-200 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <item.icon className={`h-4 w-4 ${item.color} flex-shrink-0`} />
            <div className="min-w-0">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-lg font-bold text-gray-900">{item.value}</div>
              )}
              <p className="text-[11px] text-muted-foreground truncate">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
