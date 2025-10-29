import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Clock, CheckCircle2 } from "lucide-react";
import { EvaluationProgressBar } from "./evaluation-progress-bar";

interface EvaluationProgressCardProps {
  completed: number;
  total: number;
  internalCompleted: number;
  externalCompleted: number;
  internalRequired?: number; // Default 5
  externalRequired?: number; // Default 0, optional
  currentAverage: number | null;
  isComplete: boolean;
}

export function EvaluationProgressCard({
  completed,
  total,
  internalCompleted,
  externalCompleted,
  internalRequired = 5,
  externalRequired = 0,
  currentAverage,
  isComplete,
}: EvaluationProgressCardProps) {
  const remaining = internalRequired - internalCompleted;
  const percentage = (internalCompleted / internalRequired) * 100;

  // Get score color and icon
  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500 bg-gray-50 border-gray-200";
    if (score >= 7.0) return "text-green-700 bg-green-50 border-green-200";
    if (score >= 5.0) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number | null) => {
    if (score === null) return <Clock className="h-5 w-5" />;
    if (score >= 7.0) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (score >= 5.0) return <Minus className="h-5 w-5 text-yellow-600" />;
    return <TrendingDown className="h-5 w-5 text-red-600" />;
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return "Pending";
    if (score >= 7.0) return "Acceptable";
    if (score >= 5.0) return "Needs Improvement";
    return "Below Threshold";
  };

  const getStatusBadge = () => {
    if (isComplete) {
      return <Badge className="bg-green-600">Completed</Badge>;
    }
    if (completed > 0) {
      return <Badge variant="secondary">In Progress</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Evaluation Progress</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Circular Progress Visual */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Circular progress indicator */}
            <div className="relative h-32 w-32">
              <svg className="transform -rotate-90 h-32 w-32">
                {/* Background circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
                  className={
                    isComplete
                      ? "text-green-500"
                      : completed > 0
                      ? "text-blue-500"
                      : "text-gray-300"
                  }
                  strokeLinecap="round"
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-bold">{internalCompleted}</span>
                <span className="text-sm text-muted-foreground">/ {internalRequired}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold">{percentage.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Internal Complete</p>
              </div>
              {!isComplete && (
                <div>
                  <p className="text-lg font-semibold text-orange-600">{remaining}</p>
                  <p className="text-xs text-muted-foreground">
                    Required Evaluation{remaining !== 1 ? "s" : ""} Remaining
                  </p>
                </div>
              )}
              {isComplete && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Required Complete</span>
                </div>
              )}
              {externalRequired > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    External: {externalCompleted}/{externalRequired}
                  </p>
                  <p className="text-xs text-muted-foreground">Optional</p>
                </div>
              )}
            </div>
          </div>

          {/* Current Average Score */}
          <div className="text-right">
            <div
              className={`inline-flex flex-col items-center gap-2 px-6 py-4 rounded-lg border-2 ${getScoreColor(
                currentAverage
              )}`}
            >
              {getScoreIcon(currentAverage)}
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {currentAverage !== null ? currentAverage.toFixed(1) : "--"}
                </div>
                <div className="text-xs font-medium mt-1">
                  {currentAverage !== null ? "Current Avg" : "No Data"}
                </div>
              </div>
            </div>
            {currentAverage !== null && (
              <Badge
                variant={
                  currentAverage >= 7.0
                    ? "default"
                    : currentAverage >= 5.0
                    ? "secondary"
                    : "destructive"
                }
                className="mt-2"
              >
                {getScoreLabel(currentAverage)}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <p className="text-sm font-semibold mb-2">Evaluator Breakdown</p>
          <EvaluationProgressBar
            completed={completed}
            total={total}
            internalCompleted={internalCompleted}
            externalCompleted={externalCompleted}
            internalRequired={internalRequired}
            externalRequired={externalRequired}
          />
        </div>

        {/* Status Message */}
        <div className="bg-slate-50 rounded-lg p-3 border">
          <p className="text-sm">
            {isComplete ? (
              <span className="text-green-700 font-medium">
                ✓ All {internalRequired} required evaluations completed. Final decision has been made.
                {externalCompleted > 0 && (
                  <span className="text-muted-foreground ml-1">
                    (+{externalCompleted} optional external)
                  </span>
                )}
              </span>
            ) : internalCompleted > 0 ? (
              <span className="text-blue-700">
                <span className="font-semibold">{remaining} more required evaluation
                {remaining !== 1 ? "s" : ""}</span> needed before final decision.
                {externalRequired > 0 && (
                  <span className="text-muted-foreground ml-1">
                    External evaluators are optional.
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Waiting for {internalRequired} internal evaluators to submit their assessments.
                {externalRequired > 0 && " External evaluators are optional."}
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
