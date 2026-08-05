"use client";

import {
  CheckCircle2,
  Layers,
  ClipboardCheck,
  TrendingDown,
  Banknote,
} from "lucide-react";
import type { DashboardInsight, InsightType } from "@/lib/management/critical-alerts";

interface CriticalAlertsCardProps {
  insights: DashboardInsight[];
}

const INSIGHT_CONFIG: Record<
  InsightType,
  { icon: React.ReactNode; label: string }
> = {
  pipeline_bottleneck: {
    icon: <Layers className="h-4 w-4" />,
    label: "Pipeline",
  },
  evaluation_backlog: {
    icon: <ClipboardCheck className="h-4 w-4" />,
    label: "Evaluations",
  },
  late_evaluators: {
    icon: <ClipboardCheck className="h-4 w-4" />,
    label: "Evaluations",
  },
  delivery_stalls: {
    icon: <TrendingDown className="h-4 w-4" />,
    label: "Deliveries",
  },
  payment_risk: {
    icon: <Banknote className="h-4 w-4" />,
    label: "Payments",
  },
};

export function CriticalAlertsCard({ insights }: CriticalAlertsCardProps) {
  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        All clear — no issues requiring attention
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {insights.map((insight) => {
        const isCritical = insight.severity === "critical";
        const config = INSIGHT_CONFIG[insight.type];

        return (
          <div
            key={insight.id}
            className={`rounded-lg border p-4 ${
              isCritical
                ? "border-red-200 bg-red-50/60"
                : "border-amber-200 bg-amber-50/60"
            }`}
          >
            {/* Header: icon + category label + count */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={isCritical ? "text-red-500" : "text-amber-500"}>
                  {config.icon}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  {config.label}
                </span>
              </div>
              <span
                className={`text-2xl font-bold ${
                  isCritical ? "text-red-600" : "text-amber-600"
                }`}
              >
                {insight.count}
              </span>
            </div>

            {/* Headline */}
            <p className="text-sm font-semibold text-gray-900 leading-snug">
              {insight.headline}
            </p>

            {/* Detail breakdown */}
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {insight.detail}
            </p>
          </div>
        );
      })}
    </div>
  );
}
