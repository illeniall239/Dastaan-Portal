"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { RoadmapStats } from "@/types";

interface RoadmapStatsCardsProps {
  stats: RoadmapStats;
}

export function RoadmapStatsCards({ stats }: RoadmapStatsCardsProps) {
  const cards = [
    {
      title: "Total Ideas",
      value: stats.totalIdeas,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "In Progress",
      value: stats.totalIdeas - stats.byStage.completed,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Completed",
      value: stats.byStage.completed,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Stuck (>14 days)",
      value: stats.stuckIdeas,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
