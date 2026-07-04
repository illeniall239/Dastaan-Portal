"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  XCircle,
  Clock,
  Eye,
  Loader2,
  Star,
} from "lucide-react";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";
import { IndividualEvaluationProgress } from "@/components/evaluations/individual-evaluation-progress";
import { ShareCrossTeamButton } from "@/components/call-report/share-cross-team-button";
import { MANDATORY_APPROVERS } from "@/lib/approvals/config";
import { CallReportDiscussion } from "@/components/call-reports/call-report-discussion";
import { RevisionEvaluateList } from "@/components/episodes/revision-evaluate-list";

function ScoreBox({
  label,
  score,
  comment,
}: {
  label: string;
  score: number | null;
  comment?: string | null;
}) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-semibold text-sm">
        {score !== null && score !== undefined ? `${score}/10` : "N/A"}
      </p>
      {comment && <p className="text-xs text-muted-foreground mt-1 italic">{comment}</p>}
    </div>
  );
}

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
  isTeamHead?: boolean;
  currentTeamId?: string;
  approvalStatus?: {
    approvals: any[];
    isFullyApproved: boolean;
    isRejected: boolean;
    managementApproved?: boolean;
  } | null;
  currentUserId?: string;
  currentUserRole?: string;
  teamEvaluations?: Array<{
    evaluator_id: string;
    evaluator_name: string;
    average_score: number | null;
    decision: string | null;
    teamName?: string;
  }> | null;
}

export function EvaluationCard({
  report,
  portalPrefix,
  hasEvaluated,
  myEvaluation,
  draftProgress,
  isTeamHead = false,
  currentTeamId,
  approvalStatus,
  currentUserId,
  currentUserRole,
  teamEvaluations,
}: EvaluationCardProps) {
  const hasDraft = draftProgress && draftProgress.percentage > 0;

  const isDateOnly = !!report.original_submission_date;
  const loggedTimestamp =
    report.original_submission_date ||
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
  const formattedTime = isDateOnly ? null : loggedDate.toLocaleTimeString("en-US", {
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

  // Management eval dialog state
  const [mgmtEvalDialog, setMgmtEvalDialog] = useState<{
    open: boolean;
    loading: boolean;
    approverLabel: string;
    evaluation: any | null;
  }>({ open: false, loading: false, approverLabel: "", evaluation: null });

  const handleViewMgmtEval = async (approverEmail: string, approverLabel: string) => {
    setMgmtEvalDialog({ open: true, loading: true, approverLabel, evaluation: null });
    try {
      const res = await fetch(`/api/call-reports/${report.id}/management-evaluations`);
      const data = await res.json();
      const ev =
        (data.evaluations || []).find((e: any) => e.evaluator_email === approverEmail) || null;
      setMgmtEvalDialog({ open: true, loading: false, approverLabel, evaluation: ev });
    } catch {
      setMgmtEvalDialog((prev) => ({ ...prev, loading: false }));
    }
  };

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

  const ev = mgmtEvalDialog.evaluation;

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
              {hasEvaluated && approvalStatus && (
                approvalStatus.isFullyApproved ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Fully Approved
                  </span>
                ) : approvalStatus.isRejected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 border border-red-300">
                    <XCircle className="h-3 w-3" />
                    Rejected
                  </span>
                ) : approvalStatus.managementApproved ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Management Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="h-3 w-3" />
                    Awaiting Management Approval
                  </span>
                )
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
                  {formattedTime ? `${formattedDate} at ${formattedTime}` : formattedDate}
                </span>
              </div>
            </div>
            {teamEvaluations && teamEvaluations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {teamEvaluations.map((ev) => (
                  <span
                    key={ev.evaluator_id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                      ev.teamName
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    <UserIcon className="h-3 w-3" />
                    {ev.teamName ? `${ev.evaluator_name} (${ev.teamName})` : ev.evaluator_name}
                    {ev.average_score !== null && (
                      <span className="font-semibold">&nbsp;{ev.average_score.toFixed(1)}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
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

        {/* Management approval status panel — shown on completed tab when not yet fully decided */}
        {hasEvaluated && approvalStatus && !approvalStatus.isFullyApproved && !approvalStatus.isRejected && (
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-4">
            <p className="text-xs font-semibold text-amber-800 mb-2">Management Approval Status</p>
            <div className="space-y-1.5">
              {MANDATORY_APPROVERS.map(approver => {
                const vote = approvalStatus.approvals.find(
                  (a: any) => (a.user as any)?.email === approver.email
                );
                return (
                  <div key={approver.email} className="flex items-center justify-between text-xs">
                    <span className="text-amber-700 font-medium">{approver.label}</span>
                    <div className="flex items-center gap-2">
                      {!vote ? (
                        <span className="text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      ) : vote.decision === "approved" ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Rejected
                        </span>
                      )}
                      {vote && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => handleViewMgmtEval(approver.email, approver.label)}
                        >
                          <Eye className="h-3 w-3 mr-0.5" />
                          View Eval
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Episodes */}
        {report.episodes && report.episodes.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 mb-4">
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
                  {currentUserRole && ["content_manager", "content_creator", "admin", "management"].includes(currentUserRole) && (ep.average_initial_assessment ?? ep.initial_assessment) != null && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700">
                      Initial Assessment {(ep.average_initial_assessment ?? ep.initial_assessment)}/10
                    </Badge>
                  )}
                </div>
              ))}
            </div>
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

        {/* Revision Evaluate List */}
        <div className="pt-4 border-t space-y-3">
          <RevisionEvaluateList
            entityId={report.id}
            entityType="call-report"
            revisionCount={report.revision_count || 0}
            portalPrefix={portalPrefix}
            originalFileName={report.working_title}
            originalDate={report.original_submission_date || report.logged_at || report.created_at}
          />
          {isTeamHead && (
            <div className="flex justify-end">
              <ShareCrossTeamButton
                callReportId={report.id}
                currentTeamId={currentTeamId}
              />
            </div>
          )}
        </div>

        {/* Discussion thread — visible on completed evaluations for logged-in users */}
        {hasEvaluated && currentUserId && (
          <div className="mt-4">
            <CallReportDiscussion
              callReportId={report.id}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              compact={true}
              defaultExpanded={true}
            />
          </div>
        )}
      </CardContent>

      {/* Management evaluation viewer dialog */}
      <Dialog
        open={mgmtEvalDialog.open}
        onOpenChange={(open) =>
          !open && setMgmtEvalDialog((prev) => ({ ...prev, open: false }))
        }
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mgmtEvalDialog.approverLabel}&apos;s Evaluation</DialogTitle>
          </DialogHeader>

          {mgmtEvalDialog.loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : ev ? (
            <div className="space-y-4 text-sm">
              {/* Average score */}
              {ev.average_score !== null && ev.average_score !== undefined && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-base">{Number(ev.average_score).toFixed(1)}</span>
                  <span className="text-muted-foreground text-xs">Average Score</span>
                </div>
              )}

              {/* Criteria grid */}
              <div className="grid grid-cols-2 gap-2">
                <ScoreBox
                  label="Conflict of Content"
                  score={ev.conflict_of_content_score}
                  comment={ev.conflict_of_content_comment}
                />
                <ScoreBox
                  label="Characterization"
                  score={ev.characterization_score}
                  comment={ev.characterization_comment}
                />
                <ScoreBox
                  label="Story Progression"
                  score={ev.story_progression_score}
                  comment={ev.story_progression_comment}
                />
                <ScoreBox
                  label="What&apos;s Next Element"
                  score={ev.whats_next_element_score}
                  comment={ev.whats_next_element_comment}
                />
              </div>

              {ev.overall_oneliner_grade_score !== null &&
                ev.overall_oneliner_grade_score !== undefined && (
                  <ScoreBox
                    label="Overall Oneliner Grade"
                    score={ev.overall_oneliner_grade_score}
                    comment={ev.overall_oneliner_grade_comment}
                  />
                )}

              {/* Decision */}
              {ev.decision && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-muted-foreground">Decision:</span>
                  <Badge
                    variant={
                      ev.decision === "approve"
                        ? "default"
                        : ev.decision === "reject"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {ev.decision === "approve"
                      ? "Approved"
                      : ev.decision === "reject"
                      ? "Rejected"
                      : "Needs Improvement"}
                  </Badge>
                  {ev.decision_notes && (
                    <span className="text-xs text-muted-foreground">{ev.decision_notes}</span>
                  )}
                </div>
              )}

              {/* Comments */}
              {ev.comments && (
                <div className="bg-slate-50 rounded p-2">
                  <p className="font-medium text-slate-700 text-xs mb-0.5">Comments</p>
                  <p className="text-slate-600 text-xs">{ev.comments}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No evaluation submitted yet.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
