"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  ClipboardListIcon,
  FileTextIcon,
  CalendarIcon,
  UserIcon,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";
import { IndividualEvaluationProgress } from "@/components/evaluations/individual-evaluation-progress";

interface EvaluationCardProps {
  report: any;
  portalPrefix: string;
  hasEvaluated: boolean;
  myEvaluation?: {
    id: string;
    average_score?: number;
    decision?: string;
  } | null;
  draftProgress?: { percentage: number } | null;
}

export function EvaluationCard({
  report,
  portalPrefix,
  hasEvaluated,
  myEvaluation,
  draftProgress,
}: EvaluationCardProps) {
  const hasDraft = draftProgress && draftProgress.percentage > 0;

  const loggedTimestamp =
    report.logged_at ||
    report.created_at ||
    report.meeting_date ||
    report.updated_at ||
    report.inserted_at;
  const loggedDate = loggedTimestamp ? new Date(loggedTimestamp) : new Date();
  const formattedDate = loggedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = loggedDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const myScore = myEvaluation?.average_score;

  const internalCompleted = report.completed_evaluations || 0;
  const internalRequired = report.required_evaluations || 5;
  const currentAvg = report.current_average_score;
  const evalStatus = report.evaluation_status;
  const finalDecisionMadeAt = report.final_decision_made_at;

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-600";
    if (score >= 7.0) return "text-green-600";
    if (score >= 5.0) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number | null) => {
    if (score === null) return <Minus className="h-4 w-4" />;
    if (score >= 7.0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 5.0) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getMyScoreBadgeColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 6) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl">
                {report.title || report.working_title || "Untitled"}
              </CardTitle>
              {hasEvaluated && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Evaluated
                </span>
              )}
              {!hasEvaluated && hasDraft && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-300">
                  Draft ({draftProgress.percentage}%)
                </span>
              )}
            </div>
            {!hasEvaluated && hasDraft && (
              <div className="mt-3 mb-2">
                <IndividualEvaluationProgress
                  progressPercentage={draftProgress.percentage}
                />
              </div>
            )}
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                <span>
                  {report.writer_names && report.writer_names.length > 1
                    ? `Writers: ${report.writer_names.join(", ")}`
                    : `Writer: ${report.writer_name || "N/A"}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileTextIcon className="h-4 w-4" />
                <span>ID: {report.call_report_id || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {formattedDate} at {formattedTime}
                </span>
              </div>
            </div>
          </div>
          {hasEvaluated && myScore !== undefined && (
            <div className="text-right">
              <div
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold border-2 ${getMyScoreBadgeColor(myScore)}`}
              >
                {myScore.toFixed(1)}/10
              </div>
              <p className="text-xs text-muted-foreground mt-1">Your Score</p>
              {myEvaluation?.decision && (
                <div className="mt-2">
                  <Badge
                    variant={
                      myEvaluation.decision === "approve"
                        ? "default"
                        : myEvaluation.decision === "reject"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {myEvaluation.decision === "approve"
                      ? "Approved"
                      : myEvaluation.decision === "reject"
                        ? "Rejected"
                        : "Needs Improvement"}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {evalStatus &&
          ["pending", "in_progress", "completed", "completed_after_deadline"].includes(evalStatus) && (
            <div className="bg-slate-50 rounded-lg p-3 border mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold">Evaluation Progress</p>
                  <Badge variant="outline" className="text-xs font-bold">
                    {internalCompleted}/{internalRequired}
                  </Badge>
                  {finalDecisionMadeAt && (
                    <Badge className="text-xs bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Decided
                    </Badge>
                  )}
                </div>
                {currentAvg !== null && currentAvg !== undefined && (
                  <div
                    className={`flex items-center gap-1.5 text-sm font-semibold ${getScoreColor(currentAvg)}`}
                  >
                    {getScoreIcon(currentAvg)}
                    <span>{currentAvg.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <EvaluationProgressBar
                completed={internalCompleted}
                total={internalRequired}
                internalCompleted={internalCompleted}
                externalCompleted={0}
                internalRequired={internalRequired}
                externalRequired={0}
                showLabels={false}
              />
            </div>
          )}

        <div className="space-y-2 mb-4">
          {report.logline && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Logline:
              </p>
              <p className="text-sm line-clamp-2">{report.logline}</p>
            </div>
          )}
          {report.category && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Category:
              </p>
              <p className="text-sm capitalize">
                {report.category.replace("_", " ")}
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4 border-t">
          {hasEvaluated ? (
            <Button size="sm" asChild variant="outline">
              <Link href={`/${portalPrefix}/my-evaluations/${myEvaluation?.id}`}>
                <FileTextIcon className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              asChild
              className="bg-[#224794] hover:bg-[#1a3670]"
            >
              <Link href={`/${portalPrefix}/evaluate/${report.id}`}>
                <ClipboardListIcon className="h-4 w-4 mr-2" />
                {hasDraft ? "Continue Evaluation" : "Evaluate This Project"}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
