"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getScoreColorClasses } from "@/lib/validations/episodic-evaluations";
import { CheckCircle2, XCircle, Minus } from "lucide-react";

interface AutoCalculatedScoreProps {
  type: "pages" | "scenes";
  value: number;
  score: number;
}

export function AutoCalculatedScore({ type, value, score }: AutoCalculatedScoreProps) {
  const standard = type === "pages" ? 45 : 22;
  const colorClasses = getScoreColorClasses(score);
  const label = type === "pages" ? "Pages" : "Scenes";

  // Determine status based on score
  const isAboveStandard = score > 0;
  const isMeetsStandard = score === 0;
  const isBelowStandard = score < 0;

  // Format score display
  const scoreDisplay = score > 0 ? `+${score}` : score.toString();

  // Determine status text and color
  let statusText = "";
  let statusColor = "";
  if (isAboveStandard) {
    statusText = "Above standard";
    statusColor = "text-green-600";
  } else if (isMeetsStandard) {
    statusText = "Meets standard";
    statusColor = "text-blue-600";
  } else {
    statusText = "Below standard";
    statusColor = "text-red-600";
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">
            Number of {label}
          </h4>
          <p className="text-2xl font-bold text-gray-900">
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Standard: {standard} {type}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge
            className={`${colorClasses} border font-bold text-lg px-4 py-2 flex items-center gap-1`}
          >
            {isAboveStandard && <CheckCircle2 className="h-5 w-5" />}
            {isMeetsStandard && <Minus className="h-5 w-5" />}
            {isBelowStandard && <XCircle className="h-5 w-5" />}
            {scoreDisplay}
          </Badge>

          <span className={`text-xs font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>
      </div>
    </Card>
  );
}
