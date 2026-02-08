"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeIcon, FilePenLine, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";
import { TeamBadge } from "@/components/shared/team-badge";
import { ShareCrossTeamButton } from "@/components/call-report/share-cross-team-button";

interface CallReportCardProps {
  report: any;
  portalPrefix?: string; // e.g., "evaluator" or "programmer"
  isTeamHead?: boolean;
  currentTeamId?: string;
}

export function CallReportCard({ report, portalPrefix = "evaluator", isTeamHead = false, currentTeamId }: CallReportCardProps) {
  // Format timestamp

  // Format timestamp
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
  const formattedDateTime = `${formattedDate} at ${formattedTime}`;

  const writerDisplayName =
    report.writer_names && report.writer_names.length > 0
      ? report.writer_names.join(", ")
      : report.writer_name || "Unknown writer";

  // Get evaluation progress data
  const completed = report.completed_evaluations || 0;
  const total = report.required_evaluators || 5;
  const internalCompleted = report.completed_internal_evaluations || 0;
  const externalCompleted = report.completed_external_evaluations || 0;
  const internalRequired = report.required_internal_evaluators || 5;
  const externalRequired = report.required_external_evaluators || 0;
  const currentAvg = report.current_average_score;
  const evalStatus = report.evaluation_status;

  // Score color helper
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

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className="text-xl">{report.title}</CardTitle>
                {report.team && (
                  <TeamBadge team={report.team} size="sm" />
                )}
                {evalStatus && (
                  <Badge
                    variant={
                      evalStatus === "accepted"
                        ? "default"
                        : evalStatus === "rejected"
                          ? "destructive"
                          : evalStatus === "needs_improvement"
                            ? "secondary"
                            : evalStatus === "completed_after_deadline"
                              ? "secondary"
                              : "outline"
                    }
                    className="text-xs"
                  >
                    {evalStatus.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Writers: {writerDisplayName}
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Logged: {formattedDateTime}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Evaluation Progress - Show if in evaluation */}
            {evalStatus && ["pending", "in_progress", "completed", "completed_after_deadline"].includes(evalStatus) && (
              <div className="bg-slate-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Evaluation Progress</p>
                    <Badge variant="outline" className="text-xs">
                      {internalCompleted}/{internalRequired} Required
                    </Badge>
                    {externalRequired > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        +{externalCompleted}/{externalRequired} Optional
                      </Badge>
                    )}
                  </div>
                  {currentAvg !== null && currentAvg !== undefined && (
                    <div className={`flex items-center gap-1.5 text-sm font-semibold ${getScoreColor(currentAvg)}`}>
                      {getScoreIcon(currentAvg)}
                      <span>{currentAvg.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground font-normal">avg</span>
                    </div>
                  )}
                </div>
                <EvaluationProgressBar
                  completed={completed}
                  total={total}
                  internalCompleted={internalCompleted}
                  externalCompleted={externalCompleted}
                  internalRequired={internalRequired}
                  externalRequired={externalRequired}
                />
                {/* Verdict Summary */}
                {report.evaluation_log?.final_decision && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600">Final Verdict:</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            report.evaluation_log.final_decision === "approved"
                              ? "default"
                              : report.evaluation_log.final_decision === "rejected"
                                ? "destructive"
                                : report.evaluation_log.final_decision === "needs_improvement"
                                  ? "secondary"
                                  : "outline"
                          }
                          className="text-xs font-bold"
                        >
                          {report.evaluation_log.final_decision === "approved"
                            ? "Approved"
                            : report.evaluation_log.final_decision === "rejected"
                              ? "Rejected"
                              : report.evaluation_log.final_decision === "needs_improvement"
                                ? "Needs Improvement"
                                : "Pending"}
                        </Badge>
                        {(report.evaluation_log.approval_count > 0 ||
                          report.evaluation_log.rejection_count > 0 ||
                          report.evaluation_log.needs_improvement_count > 0) && (
                          <span className="text-xs text-slate-600">
                            ({report.evaluation_log.approval_count} approve,
                             {report.evaluation_log.rejection_count} reject,
                             {report.evaluation_log.needs_improvement_count} need improvement)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {report.logline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Logline:</p>
                  <p className="text-sm line-clamp-2">{report.logline}</p>
                </div>
              )}
              {report.attendees && report.attendees.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attendees:</p>
                  <p className="text-sm">{report.attendees.join(", ")}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t flex justify-end gap-2">
            {isTeamHead && (
              <ShareCrossTeamButton
                callReportId={report.id}
                currentTeamId={currentTeamId}
              />
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${portalPrefix}/call-reports/${report.id}`}>
                <EyeIcon className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href={`/${portalPrefix}/call-reports/${report.id}/detailed-one-liner`}>
                <FilePenLine className="h-4 w-4 mr-2" />
                Detailed One-Liner
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
