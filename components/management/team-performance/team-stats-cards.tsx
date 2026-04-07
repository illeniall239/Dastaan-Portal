"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  CheckCircle,
  Award,
} from "lucide-react";

interface TeamStatsCardsProps {
  stats: {
    total_teams: number;
    total_call_reports: number;
    total_evaluations: number;
    total_one_liners: number;
    total_stories_approved: number;
    avg_evaluation_score: number;
    avg_call_reports_per_team: number;
    avg_evaluations_per_team: number;
  };
}

export function TeamStatsCards({ stats }: TeamStatsCardsProps) {
  const cards = [
    {
      title: "Total Teams",
      value: stats.total_teams,
      icon: Users,
      description: "Active teams in the system",
      gradient: "from-blue-50 to-blue-100",
      border: "border-blue-200",
      iconColor: "text-blue-600",
      textColor: "text-blue-900",
    },
    {
      title: "Writer Engagement Reports",
      value: stats.total_call_reports,
      icon: FileText,
      description: "Total reports created",
      gradient: "from-green-50 to-green-100",
      border: "border-green-200",
      iconColor: "text-green-600",
      textColor: "text-green-900",
    },
    {
      title: "Evaluations",
      value: stats.total_evaluations,
      icon: CheckCircle,
      description: "Total evaluations completed",
      gradient: "from-purple-50 to-purple-100",
      border: "border-purple-200",
      iconColor: "text-purple-600",
      textColor: "text-purple-900",
    },
    {
      title: "Stories Approved",
      value: stats.total_stories_approved,
      icon: Award,
      description: "Stories approved by teams",
      gradient: "from-teal-50 to-teal-100",
      border: "border-teal-200",
      iconColor: "text-teal-600",
      textColor: "text-teal-900",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={`bg-gradient-to-br ${card.gradient} ${card.border}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${card.textColor}`}>
              {card.title}
            </CardTitle>
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${card.textColor}`}>
              {typeof card.value === 'number' && card.value >= 1000
                ? `${(card.value / 1000).toFixed(1)}k`
                : card.value}
            </div>
            <p className={`text-xs mt-1 ${card.textColor} opacity-70`}>
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
