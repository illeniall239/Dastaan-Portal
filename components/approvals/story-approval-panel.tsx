"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { StoryApprovalStatus } from "@/types";
import { MANDATORY_APPROVERS } from "@/lib/approvals/config";

interface StoryApprovalPanelProps {
  callReportId: string;
  evaluationCompleted: boolean; // only show after eval is done
}

export function StoryApprovalPanel({ callReportId, evaluationCompleted }: StoryApprovalPanelProps) {
  const [status, setStatus] = useState<StoryApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      const response = await fetch(`/api/story-approvals?call_report_id=${callReportId}&_t=${Date.now()}`);
      const data = await response.json();
      if (response.ok) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  }, [callReportId]);

  useEffect(() => {
    if (!evaluationCompleted) {
      setLoading(false);
      return;
    }
    fetchApprovals();
    // Poll every 30 seconds so approvals from other portals appear automatically
    const interval = setInterval(fetchApprovals, 30000);
    return () => clearInterval(interval);
  }, [evaluationCompleted, fetchApprovals]);

  const handleSubmit = async (decision: "approved" | "rejected") => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/story-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_report_id: callReportId,
          decision,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      toast.success(`Story ${decision === "approved" ? "approved" : "rejected"} successfully`);
      setNotes("");
      setShowNotes(false);
      await fetchApprovals();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit approval");
    } finally {
      setSubmitting(false);
    }
  };

  if (!evaluationCompleted) return null;
  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  if (!status) return null;

  const {
    approvals,
    isFullyApproved,
    isRejected,
    canCurrentUserApprove,
    currentUserApproval,
    isCurrentUserMandatoryApprover,
    currentUserName,
  } = status;

  // Group approvals
  const managementApprovals = approvals.filter(a => a.approver_type === "management");
  const otherApprovals = approvals.filter(a => a.approver_type !== "management");

  // Build mandatory approver status (full list for non-management viewers)
  const mandatoryStatus = MANDATORY_APPROVERS.map(ma => {
    const approval = managementApprovals.find(a => a.user?.email === ma.email);
    return { ...ma, approval };
  });

  const approvedCount = approvals.filter(a => a.decision === "approved").length;

  return (
    <Card className={
      isFullyApproved ? "border-green-300 bg-green-50/50" :
      isRejected ? "border-red-300 bg-red-50/50" :
      "border-amber-200"
    }>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-base">Story Approval Gate</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {(isFullyApproved || isRejected || !isCurrentUserMandatoryApprover) && (
              <Badge
                variant={isFullyApproved ? "default" : isRejected ? "destructive" : "secondary"}
                className="text-xs"
              >
                {isFullyApproved ? "Fully Approved" : isRejected ? "Rejected" : `${approvedCount}/3 Approvals`}
              </Badge>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={fetchApprovals}
              title="Refresh approval status"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Management (Required) */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Management (Required)
          </p>
          <div className="space-y-1.5">
            {isCurrentUserMandatoryApprover ? (
              // Mandatory approvers (Humera / Salman) only see their own row
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {currentUserApproval?.decision === "approved" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : currentUserApproval?.decision === "rejected" ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                  <span>{currentUserApproval?.user?.name || currentUserName || "You"}</span>
                </div>
                <span className={`text-xs ${
                  currentUserApproval?.decision === "approved" ? "text-green-600" :
                  currentUserApproval?.decision === "rejected" ? "text-red-600" :
                  "text-amber-500"
                }`}>
                  {currentUserApproval?.decision === "approved" ? "Approved" :
                   currentUserApproval?.decision === "rejected" ? "Rejected" :
                   "Pending"}
                  {currentUserApproval?.created_at && (
                    <span className="text-muted-foreground ml-1">
                      ({new Date(currentUserApproval.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                    </span>
                  )}
                </span>
              </div>
            ) : (
              // Other viewers (evaluator team heads, programmers) see all mandatory approver rows
              mandatoryStatus.map(ms => (
                <div key={ms.email} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {ms.approval?.decision === "approved" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : ms.approval?.decision === "rejected" ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                    <span>{ms.approval?.user?.name || ms.label}</span>
                  </div>
                  <span className={`text-xs ${
                    ms.approval?.decision === "approved" ? "text-green-600" :
                    ms.approval?.decision === "rejected" ? "text-red-600" :
                    "text-amber-500"
                  }`}>
                    {ms.approval?.decision === "approved" ? "Approved" :
                     ms.approval?.decision === "rejected" ? "Rejected" :
                     "Pending"}
                    {ms.approval?.created_at && (
                      <span className="text-muted-foreground ml-1">
                        ({new Date(ms.approval.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Additional Approvers */}
        {!isCurrentUserMandatoryApprover && <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Additional Approvers (1 needed)
          </p>
          {otherApprovals.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No additional approvals yet</p>
          ) : (
            <div className="space-y-1.5">
              {otherApprovals.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {a.decision === "approved" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{a.user?.name || "Unknown"}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {a.approver_type === "evaluator" ? "Evaluator" :
                       a.approver_type === "programmer" ? "Programmer" :
                       a.approver_type}
                    </Badge>
                  </div>
                  <span className={`text-xs ${a.decision === "approved" ? "text-green-600" : "text-red-600"}`}>
                    {a.decision === "approved" ? "Approved" : "Rejected"}
                    <span className="text-muted-foreground ml-1">
                      ({new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* Approve/Reject buttons */}
        {canCurrentUserApprove && !isFullyApproved && !isRejected && !currentUserApproval && (
          <div className="pt-3 border-t space-y-3">
            {showNotes && (
              <Textarea
                placeholder="Add notes (optional)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleSubmit("approved")}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleSubmit("rejected")}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                Reject
              </Button>
              {!showNotes && (
                <Button size="sm" variant="ghost" onClick={() => setShowNotes(true)} className="text-xs">
                  + Add Notes
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Notes display for existing approvals */}
        {approvals.some(a => a.notes) && (
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
            {approvals.filter(a => a.notes).map(a => (
              <div key={a.id} className="text-xs text-muted-foreground mb-1">
                <span className="font-medium">{a.user?.name}:</span> {a.notes}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
