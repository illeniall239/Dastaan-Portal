"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";

interface TeamEvaluationStats {
  callReportCount: number;
  episodicCount: number;
  oneLinerCount: number;
  totalEvaluations: number;
}

interface InternalEvaluationsTabProps {
  teams: any[];
  currentUser: any;
}

export function InternalEvaluationsTab({ teams, currentUser }: InternalEvaluationsTabProps) {
  const [teamStats, setTeamStats] = useState<Map<string, TeamEvaluationStats>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvaluations() {
      try {
        // Fetch all evaluator stats
        const statsRes = await fetch('/api/management/evaluator-stats');
        if (!statsRes.ok) throw new Error('Failed to fetch stats');

        const { stats: evaluatorStats } = await statsRes.json();

        // Fetch all users to get team_id mapping
        const usersRes = await fetch('/api/users/search?q=');
        const response = await usersRes.json();
        const users = response.users || [];

        // Create a map of user_id to team_id
        const userTeamMap = new Map();
        users.forEach((user: any) => {
          if (user.team_id) {
            userTeamMap.set(user.id, user.team_id);
          }
        });

        // Group evaluator stats by team
        const teamStatsMap = new Map<string, TeamEvaluationStats>();

        // Initialize stats for all teams
        teams.forEach(team => {
          teamStatsMap.set(team.id, {
            callReportCount: 0,
            episodicCount: 0,
            oneLinerCount: 0,
            totalEvaluations: 0,
          });
        });

        // Aggregate stats by team
        evaluatorStats.forEach((stat: any) => {
          const teamId = userTeamMap.get(stat.id);
          if (teamId && teamStatsMap.has(teamId)) {
            const teamStat = teamStatsMap.get(teamId)!;
            teamStat.callReportCount += stat.callReportEvals || 0;
            teamStat.episodicCount += stat.episodicEvals || 0;
            teamStat.oneLinerCount += stat.oneLinerCount || 0;
            teamStat.totalEvaluations += stat.totalEvaluations || 0;
          }
        });

        setTeamStats(teamStatsMap);
      } catch (error) {
        console.error("Error fetching evaluations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvaluations();
  }, [teams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="call-reports" className="w-full">
        <TabsList>
          <TabsTrigger value="call-reports">One Liner Evaluations</TabsTrigger>
          <TabsTrigger value="episodic">Episodic Evaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="call-reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>One Liner Evaluations by Team</CardTitle>
              <CardDescription>
                Internal evaluator performance and activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams && teams.length > 0 ? (
                  teams.map((team) => (
                    <Card key={team.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            <CardDescription>
                              {team.type} • {team.member_count || 0} members
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {teamStats.get(team.id)?.callReportCount || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              One Liner Evaluations
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Avg per Member</p>
                            <p className="text-lg font-semibold">
                              {team.member_count > 0
                                ? ((teamStats.get(team.id)?.callReportCount || 0) / team.member_count).toFixed(1)
                                : '0.0'
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Evaluations</p>
                            <p className="text-lg font-semibold">
                              {teamStats.get(team.id)?.totalEvaluations || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No teams found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="episodic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Episodic Evaluations by Team</CardTitle>
              <CardDescription>
                Episode evaluation performance across teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams && teams.length > 0 ? (
                  teams.map((team) => (
                    <Card key={team.id} className="border-l-4 border-l-purple-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            <CardDescription>
                              {team.type} • {team.member_count || 0} members
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600">
                              {teamStats.get(team.id)?.episodicCount || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Episode Evaluations
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Avg per Member</p>
                            <p className="text-lg font-semibold">
                              {team.member_count > 0
                                ? ((teamStats.get(team.id)?.episodicCount || 0) / team.member_count).toFixed(1)
                                : '0.0'
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">One-Liners</p>
                            <p className="text-lg font-semibold">
                              {teamStats.get(team.id)?.oneLinerCount || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No teams found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
