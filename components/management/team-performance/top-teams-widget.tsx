"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, FileText, CheckCircle, MessageSquare } from "lucide-react";
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
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-teal-900 text-sm sm:text-base lg:text-lg">
              Team Activity Overview
            </CardTitle>
            <CardDescription className="text-teal-700 mt-1 text-xs sm:text-sm">
              Overview of team activities and contributions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        {topTeams.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-teal-700 text-sm">
            No team data available yet
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {topTeams.map((team, index) => (
              <Link
                key={team.team_id}
                href={`/management/teams/${team.team_id}`}
                className="block"
              >
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-teal-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                          {team.team_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] sm:text-xs flex-shrink-0 ${TEAM_TYPE_COLORS[team.team_type]}`}
                        >
                          {TEAM_TYPE_LABELS[team.team_type]}
                        </Badge>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                          <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                          <span className="text-gray-600">
                            {team.call_reports_created || 0} Reports
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span className="text-gray-600">
                            {team.evaluations_completed || 0} Evals
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                          <MessageSquare className="h-3 w-3 text-orange-600 flex-shrink-0" />
                          <span className="text-gray-600">
                            {team.one_liners_logged || 0} One-Liners
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                          <Users className="h-3 w-3 text-purple-600 flex-shrink-0" />
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
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-teal-200">
          <Button
            asChild
            variant="ghost"
            className="w-full text-teal-700 hover:text-teal-900 hover:bg-teal-100 text-sm"
          >
            <Link href="/management/teams">
              View All Teams
              <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
