import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import type { FeedbackTimelineStats } from "@/types";

interface FeedbackTimelineStatsProps {
  stats: FeedbackTimelineStats;
}

/**
 * Stats cards showing key metrics for the feedback timeline
 * Displays: Total Evaluations, Pending Review, Avg Review Time, On-Time Rate
 */
export function FeedbackTimelineStatsCards({ stats }: FeedbackTimelineStatsProps) {
  const statCards = [
    {
      title: "Total Evaluations",
      value: stats.totalEvaluations,
      icon: Activity,
      description: "Evaluations in the system",
      color: "text-[#224794]",
      bgColor: "bg-blue-50",
    },
    {
      title: "Pending Review",
      value: stats.pendingReview,
      icon: Clock,
      description: "Awaiting evaluation",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Avg Review Time",
      value: `${stats.averageReviewDays} days`,
      icon: CheckCircle2,
      description: "Time to complete evaluation",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "On-Time Rate",
      value: `${stats.onTimePercentage}%`,
      icon: AlertTriangle,
      description: stats.lateCount > 0 ? `${stats.lateCount} late evaluations` : "All evaluations on time",
      color: stats.onTimePercentage >= 80 ? "text-green-600" : stats.onTimePercentage >= 60 ? "text-amber-600" : "text-red-600",
      bgColor: stats.onTimePercentage >= 80 ? "bg-green-50" : stats.onTimePercentage >= 60 ? "bg-amber-50" : "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {card.title}
              </h3>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>

            <div className="mt-auto">
              <p className={`text-4xl font-bold mb-1 ${card.color}`}>
                {card.value}
              </p>
              <p className="text-sm text-gray-500">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
