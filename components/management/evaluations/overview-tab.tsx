"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CheckCircle, Clock } from "lucide-react";

interface OverviewTabProps {
  teams: any[];
  currentUser: any;
  externalEvaluations: any[];
}

export function OverviewTab({ teams, currentUser, externalEvaluations }: OverviewTabProps) {
  const [stats, setStats] = useState({
    totalCallReportEvals: 0,
    totalEpisodicEvals: 0,
    totalExternalEvals: 0,
    activeEvaluators: 0,
    pendingEvals: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch aggregated evaluator stats + pending count in parallel
        const [statsRes, pendingRes] = await Promise.all([
          fetch("/api/management/evaluator-stats"),
          fetch("/api/management/pending-evaluations"),
        ]);

        if (!statsRes.ok) throw new Error("Failed to fetch stats");
        if (!pendingRes.ok) throw new Error("Failed to fetch pending evaluations");

        const { stats: evaluatorStats } = await statsRes.json();
        const { pendingCount } = await pendingRes.json();

        // Calculate totals from stats array
        const totalCallReportEvals = evaluatorStats.reduce(
          (sum: number, s: any) => sum + (s.oneLinerEvaluations || 0),
          0
        );
        const totalEpisodicEvals = evaluatorStats.reduce(
          (sum: number, s: any) => sum + (s.episodicEvals || 0),
          0
        );

        // Fetch completed evaluations for today
        const completedTodayResponse = await fetch('/api/evaluations/completed-today');
        const completedTodayData = await completedTodayResponse.json();
        const completedToday = completedTodayData.success ? completedTodayData.completedToday : 0;

        // Pending evaluations across assignments
        const pendingEvals = pendingCount ?? 0;

        setStats({
          totalCallReportEvals,
          totalEpisodicEvals,
          totalExternalEvals: externalEvaluations.length,
          activeEvaluators: teams.reduce((sum, team) => sum + (team.member_count || 0), 0),
          pendingEvals,
          completedToday,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set to 0 on error, but external evals still from props
        setStats({
          totalCallReportEvals: 0,
          totalEpisodicEvals: 0,
          totalExternalEvals: externalEvaluations.length,
          activeEvaluators: teams.reduce((sum, team) => sum + (team.member_count || 0), 0),
          pendingEvals: 0,
          completedToday: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [teams, externalEvaluations]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              One Liner Evaluations
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCallReportEvals}</div>
            <p className="text-xs text-muted-foreground">
              Total evaluations submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Episodic Evaluations
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEpisodicEvals}</div>
            <p className="text-xs text-muted-foreground">
              Episode evaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Evaluators
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEvaluators}</div>
            <p className="text-xs text-muted-foreground">
              Team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Evaluations
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingEvals}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting completion
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation Activity</CardTitle>
          <CardDescription>
            Distribution of evaluations across all types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
              <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-blue-700">{stats.totalCallReportEvals}</p>
              <p className="text-sm text-muted-foreground mt-1">One Liner Evaluations</p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
              <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-purple-700">{stats.totalEpisodicEvals}</p>
              <p className="text-sm text-muted-foreground mt-1">Episodic Evaluations</p>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-700">{stats.totalExternalEvals}</p>
              <p className="text-sm text-muted-foreground mt-1">External Evaluations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
