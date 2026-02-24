"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeIcon, FilePenLine, TrendingUp, TrendingDown, Minus, History, CheckCircle2, XCircle } from "lucide-react";
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

  // Only team heads and programmers can see management approval details
  const canSeeApprovalStatus = isTeamHead || portalPrefix === "programmer";

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
                {(portalPrefix === "programmer" || portalPrefix === "management") && report.team && (
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
                {canSeeApprovalStatus && report.approval_status?.isFullyApproved && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-300">
                    Story Approved
                  </Badge>
                )}
                {canSeeApprovalStatus && report.approval_status?.isRejected && (
                  <Badge variant="destructive" className="text-xs">
                    Story Rejected
                  </Badge>
                )}
                {canSeeApprovalStatus &&
                  report.evaluation_log?.final_decision &&
                  report.approval_status &&
                  !report.approval_status.isFullyApproved &&
                  !report.approval_status.isRejected &&
                  !report.approval_status.managementApproved && (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                    Waiting on Management&apos;s Approval
                  </Badge>
                )}
                {canSeeApprovalStatus &&
                  report.evaluation_log?.final_decision &&
                  report.approval_status &&
                  !report.approval_status.isFullyApproved &&
                  !report.approval_status.isRejected &&
                  report.approval_status.managementApproved && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                    Waiting on Final Approval ({report.approval_status.approvedCount}/3)
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Writers: {writerDisplayName}
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Logged: {formattedDateTime}</div>
              {report.logged_by && (
                <div>By: {report.logged_by}</div>
              )}
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

            {/* Management Approval Status - only visible to team heads and programmers */}
            {canSeeApprovalStatus && report.approval_status?.managementApprovals?.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 border">
                <p className="text-xs font-semibold text-slate-600 mb-2">Management Approval</p>
                <div className="space-y-1">
                  {report.approval_status.managementApprovals.map((ma: any) => (
                    <div key={ma.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {ma.decision === "approved" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                        )}
                        <span className="font-medium text-slate-700">{ma.name}</span>
                      </div>
                      <span className={ma.decision === "approved" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {ma.decision === "approved" ? "Approved" : "Rejected"}
                      </span>
                    </div>
                  ))}
                </div>
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
            {/* Additional Notes */}
            {report.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Additional Notes:</p>
                <p className="text-sm line-clamp-2">{report.notes}</p>
              </div>
            )}
            {/* Follow-up */}
            {report.next_steps && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Follow-up:</p>
                <p className="text-sm line-clamp-2">{report.next_steps}</p>
              </div>
            )}
            {/* Episodes */}
            {report.episodes && report.episodes.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 mb-2">
                  {report.episodes.length} Episode{report.episodes.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-1">
                  {report.episodes.map((ep: any) => (
                    <div key={ep.episode_number} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          EP {ep.episode_number}
                        </Badge>
                        <span className="text-purple-600">{ep.logged_by_name}</span>
                      </div>
                      {(ep.average_initial_assessment ?? ep.initial_assessment) != null && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700">
                          Initial Assessment {(ep.average_initial_assessment ?? ep.initial_assessment)}/10
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Revisions */}
            {report.revision_count > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <History className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">
                    {report.revision_count} Revision{report.revision_count !== 1 ? "s" : ""}
                  </span>
                  {report.latest_revision_date && (
                    <span className="text-xs text-blue-500">
                      &middot; Latest: {new Date(report.latest_revision_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                {report.latest_revision_comment && (
                  <p className="text-xs text-blue-600 line-clamp-1 ml-5.5">
                    {report.latest_revision_comment}
                  </p>
                )}
              </div>
            )}
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
