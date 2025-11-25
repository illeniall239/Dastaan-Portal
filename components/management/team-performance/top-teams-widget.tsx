"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight, Users, FileText, CheckCircle, MessageSquare } from "lucide-react";
import type { TeamPerformance } from "@/types";

interface TopTeamsWidgetProps {
  teams: TeamPerformance[];
}

const TEAM_TYPE_COLORS: Record<string, string> = {
  production: "bg-blue-100 text-blue-800 border-blue-300",
  channel: "bg-purple-100 text-purple-800 border-purple-300",
  adaptation: "bg-green-100 text-green-800 border-green-300",
  evaluator: "bg-yellow-100 text-yellow-800 border-yellow-300",
  other: "bg-gray-100 text-gray-800 border-gray-300",
};

const TEAM_TYPE_LABELS: Record<string, string> = {
  production: "Production",
  channel: "Channel",
  adaptation: "Adaptation",
  evaluator: "Evaluator",
  other: "Other",
};

export function TopTeamsWidget({ teams }: TopTeamsWidgetProps) {
  const topTeams = teams.slice(0, 5);

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-cyan-100 border-teal-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-teal-900">
              <Trophy className="h-5 w-5 text-teal-600" />
              Team Performance
            </CardTitle>
            <CardDescription className="text-teal-700 mt-1">
              Based on total call reports created
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {topTeams.length === 0 ? (
          <div className="text-center py-8 text-teal-700">
            No team data available yet
          </div>
        ) : (
          <div className="space-y-3">
            {topTeams.map((team, index) => (
              <Link
                key={team.team_id}
                href={`/management/teams/${team.team_id}`}
                className="block"
              >
                <div className="bg-white rounded-lg p-4 border border-teal-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-900' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-teal-100 text-teal-900'
                      }`}>
                        #{index + 1}
                      </div>
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {team.team_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs flex-shrink-0 ${TEAM_TYPE_COLORS[team.team_type]}`}
                        >
                          {TEAM_TYPE_LABELS[team.team_type]}
                        </Badge>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        <div className="flex items-center gap-1 text-xs">
                          <FileText className="h-3 w-3 text-blue-600" />
                          <span className="text-gray-600">
                            {team.call_reports_created || 0} Reports
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-gray-600">
                            {team.evaluations_completed || 0} Evals
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <MessageSquare className="h-3 w-3 text-orange-600" />
                          <span className="text-gray-600">
                            {team.one_liners_logged || 0} One-Liners
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="h-3 w-3 text-purple-600" />
                          <span className="text-gray-600">
                            {team.team_member_count || 0} Members
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="mt-4 pt-4 border-t border-teal-200">
          <Button
            asChild
            variant="ghost"
            className="w-full text-teal-700 hover:text-teal-900 hover:bg-teal-100"
          >
            <Link href="/management/teams">
              View All Teams
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
