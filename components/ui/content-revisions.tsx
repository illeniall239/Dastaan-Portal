"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EpisodeFileUpload } from "@/components/episodes/episode-file-upload";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Download,
  FileText,
  History,
  ChevronDown,
  ChevronRight,
  Star,
  ClipboardCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";
import type { EpisodeRevision, RevisionEvaluation } from "@/types";

interface ContentRevisionsProps {
  entityId: string;
  /** API base path, e.g. "/api/episodes" or "/api/detailed-one-liner" */
  apiBasePath: string;
  /** Storage bucket name, e.g. "episodes" or "attachments" */
  storageBucket?: string;
  /** Storage path prefix for uploads, e.g. the sourceId */
  sourceId?: string | null;
  canEdit: boolean;
  compact?: boolean;
  /** Current user role for showing role-appropriate actions */
  userRole?: string;
  /** Base URL for evaluation page, e.g. "/evaluator/evaluate" or "/evaluator/episodes" */
  evaluateUrl?: string;
  /** Entity type for evaluation context: "call-report" or "episode" */
  entityType?: "call-report" | "episode";
}

function RevScoreBox({ label, score, comment }: { label: string; score: number | null; comment?: string | null }) {
  return (
    <div className="bg-gray-50 rounded p-1.5">
      <p className="text-muted-foreground text-[10px] mb-0.5">{label}</p>
      <p className="font-semibold text-xs">{score !== null && score !== undefined ? `${score}/10` : "N/A"}</p>
      {comment && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{comment}</p>}
    </div>
  );
}

function RevisionEvalCard({ ev }: { ev: RevisionEvaluation }) {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-white text-xs">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">{ev.evaluator_name}</p>
          <p className="text-muted-foreground">{ev.evaluator_email}</p>
          {ev.submitted_at && <p className="text-muted-foreground">{formatDate(ev.submitted_at)}</p>}
        </div>
        {ev.average_score != null && (
          <div className="text-right">
            <div className="flex items-center gap-1 font-bold text-sm">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              {ev.average_score.toFixed(1)}
            </div>
            <p className="text-muted-foreground">Avg Score</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <RevScoreBox label="Conflict of Content" score={ev.conflict_of_content_score} comment={ev.conflict_of_content_comment} />
        <RevScoreBox label="Characterization" score={ev.characterization_score} comment={ev.characterization_comment} />
        <RevScoreBox label="Story Progression" score={ev.story_progression_score} comment={ev.story_progression_comment} />
        <RevScoreBox label="What's Next Element" score={ev.whats_next_element_score} comment={ev.whats_next_element_comment} />
        <div className="col-span-2">
          <RevScoreBox label="Overall Oneliner Grade" score={ev.overall_oneliner_grade_score} comment={ev.overall_oneliner_grade_comment} />
        </div>
      </div>
      {ev.comments && (
        <div className="bg-slate-50 rounded p-2">
          <p className="font-medium text-slate-700 mb-0.5">Comments</p>
          <p className="text-slate-600">{ev.comments}</p>
        </div>
      )}
      {ev.decision && (
        <div className="flex items-center gap-2">
          <Badge
            variant={ev.decision === "approve" ? "default" : ev.decision === "reject" ? "destructive" : "secondary"}
            className="text-xs"
          >
            {ev.decision === "approve" ? "Approved" : ev.decision === "reject" ? "Rejected" : "Needs Improvement"}
          </Badge>
          {ev.decision_notes && <span className="text-muted-foreground">{ev.decision_notes}</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Inline score selector for initial assessment (1-10)
 */
function InlineScoreSelector({
  score,
  onChange,
  saving,
  disabled,
}: {
  score: number | null | undefined;
  onChange: (score: number) => void;
  saving?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Assessment:</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => !disabled && !saving && onChange(value)}
            disabled={disabled || saving}
            className={`
              w-6 h-6 text-[10px] font-medium rounded transition-colors
              ${score === value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }
              ${disabled || saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            title={`Score: ${value}`}
          >
            {value}
          </button>
        ))}
      </div>
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function ContentRevisions({
  entityId,
  apiBasePath,
  storageBucket = "attachments",
  sourceId,
  canEdit,
  compact = false,
  userRole,
  evaluateUrl,
  entityType,
}: ContentRevisionsProps) {
  const supabase = createClient();

  const [revisions, setRevisions] = useState<EpisodeRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [savingAssessmentId, setSavingAssessmentId] = useState<string | null>(null);

  const [expandedEvalRevisionId, setExpandedEvalRevisionId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");

  const revisionsUrl = `${apiBasePath}/${entityId}/revisions`;

  // Determine if user can view/set initial assessment
  // Only content dept, management, and admin can see assessments
  const canViewAssessment = userRole && [
    "content_manager", "content_creator", "admin", "management"
  ].includes(userRole);
  const canAssess = canViewAssessment;

  // Determine if user can evaluate revisions
  const canEvaluate = evaluateUrl && userRole && [
    "evaluator", "programmer", "admin", "management", "executive", "content_manager"
  ].includes(userRole);

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${revisionsUrl}?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch revisions");
      }
      setRevisions(data.revisions || []);
    } catch (error: any) {
      console.error("Error fetching revisions:", error);
    } finally {
      setLoading(false);
    }
  }, [revisionsUrl]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const handleAddRevision = async () => {
    if (!file && !comment.trim()) {
      toast.error("Please upload a file or add a comment");
      return;
    }

    setSubmitting(true);
    try {
      let attachment_url: string | null = null;
      let attachment_name: string | null = null;
      let attachment_type: string | null = null;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${sourceId || entityId}/revisions/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(storageBucket)
          .upload(storagePath, file);

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(storagePath);

        attachment_url = urlData.publicUrl;
        attachment_name = file.name;
        attachment_type = file.type;
      }

      const response = await fetch(revisionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachment_url,
          attachment_name,
          attachment_type,
          comment: comment.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create revision");
      }

      toast.success(`Revision ${data.revision.revision_number} added`);
      setFile(null);
      setComment("");
      setShowAddForm(false);
      fetchRevisions();
    } catch (error: any) {
      console.error("Error adding revision:", error);
      toast.error(error.message || "Failed to add revision");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRevision = async (revision: EpisodeRevision) => {
    setDeletingId(revision.id);
    try {
      const response = await fetch(`${revisionsUrl}/${revision.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete revision");
      }

      toast.success(`Revision ${revision.revision_number} deleted`);
      fetchRevisions();
    } catch (error: any) {
      console.error("Error deleting revision:", error);
      toast.error(error.message || "Failed to delete revision");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (revision: EpisodeRevision) => {
    if (revision.attachment_url) {
      window.open(revision.attachment_url, "_blank");
    }
  };

  const handleAssessmentChange = async (revision: EpisodeRevision, score: number) => {
    setSavingAssessmentId(revision.id);
    try {
      const response = await fetch(`${revisionsUrl}/${revision.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initial_assessment: score }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save assessment");
      }

      // Update local state
      setRevisions((prev) =>
        prev.map((r) =>
          r.id === revision.id ? { ...r, initial_assessment: score } : r
        )
      );
      toast.success(`Assessment saved: ${score}/10`);
    } catch (error: any) {
      console.error("Error saving assessment:", error);
      toast.error(error.message || "Failed to save assessment");
    } finally {
      setSavingAssessmentId(null);
    }
  };

  // Find the latest evaluated revision (highest revision_number with evaluation_count > 0)
  const latestEvaluatedRevision = [...revisions]
    .filter((r) => (r.evaluation_count || 0) > 0)
    .sort((a, b) => b.revision_number - a.revision_number)[0] || null;

  const renderAddForm = (size: "sm" | "default" = "default") => (
    <div
      className={
        size === "sm"
          ? "space-y-3 p-3 border rounded-md bg-white"
          : "space-y-4 p-4 border-2 border-dashed rounded-lg"
      }
    >
      {size === "default" && (
        <h4 className="text-sm font-medium">
          New Revision{" "}
          <span className="text-muted-foreground font-normal">
            (#{revisions.length + 1})
          </span>
        </h4>
      )}

      <div className={size === "default" ? "space-y-2" : ""}>
        {size === "default" && <Label>Upload Revised File</Label>}
        <EpisodeFileUpload
          file={file}
          onFileSelect={setFile}
          onFileRemove={() => setFile(null)}
          disabled={submitting}
        />
      </div>

      <div className={size === "default" ? "space-y-2" : ""}>
        {size === "default" && (
          <Label htmlFor="revision-comment">Revision Comments</Label>
        )}
        <Textarea
          id={size === "default" ? "revision-comment" : undefined}
          placeholder="Describe what was revised in this version..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={size === "sm" ? 2 : 3}
          maxLength={5000}
          disabled={submitting}
          className={size === "sm" ? "text-sm" : "resize-none"}
        />
        {size === "default" && (
          <p className="text-xs text-muted-foreground">
            {comment.length}/5000 characters
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size={size}
          onClick={handleAddRevision}
          disabled={submitting || (!file && !comment.trim())}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              {size === "default" ? "Uploading..." : ""}
            </>
          ) : (
            <>
              {size === "default" && <Plus className="h-4 w-4 mr-2" />}
              {size === "default" ? "Submit Revision" : "Submit"}
            </>
          )}
        </Button>
        <Button
          size={size}
          variant={size === "sm" ? "ghost" : "outline"}
          onClick={() => {
            setShowAddForm(false);
            setFile(null);
            setComment("");
          }}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderRevisionRow = (revision: EpisodeRevision, isCompact: boolean) => {
    const isLatestEvaluated = latestEvaluatedRevision?.id === revision.id;
    const hasEvaluations = (revision.evaluation_count || 0) > 0;

    return (
      <div
        key={revision.id}
        className={`
          ${isCompact
            ? "flex flex-col gap-2 p-2 rounded-md text-sm"
            : "flex flex-col gap-3 p-4 border rounded-lg"
          }
          ${isLatestEvaluated
            ? "border-green-300 bg-green-50/50"
            : isCompact
              ? "bg-slate-50"
              : "bg-slate-50/50"
          }
        `}
      >
        {/* Row 1: Revision info */}
        <div className="flex items-start gap-3">
          <Badge
            variant={isLatestEvaluated ? "default" : "secondary"}
            className={`flex-shrink-0 ${isCompact ? "text-xs" : "mt-0.5"} ${
              isLatestEvaluated ? "bg-green-600" : ""
            }`}
          >
            {isCompact ? "Rev" : "Revision"} {revision.revision_number}
          </Badge>

          <div className="flex-1 min-w-0 space-y-1">
            {revision.attachment_name && (
              <button
                onClick={() => handleDownload(revision)}
                className={`text-blue-600 hover:underline flex items-center gap-1 ${
                  isCompact ? "text-xs" : "text-sm"
                }`}
              >
                <FileText className={isCompact ? "h-3 w-3" : "h-4 w-4 flex-shrink-0"} />
                <span className="truncate">{revision.attachment_name}</span>
              </button>
            )}
            {revision.comment && (
              <p className={`text-muted-foreground ${isCompact ? "text-xs line-clamp-2" : "text-sm"}`}>
                {revision.comment}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {isCompact ? "" : "Uploaded by "}
              {revision.uploaded_by_user?.name || "Unknown"} &middot;{" "}
              {formatDate(revision.created_at)}
            </p>
          </div>

          {/* Badges and actions on right */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isLatestEvaluated && (
              <Badge variant="outline" className="text-[10px] border-green-400 text-green-700 whitespace-nowrap">
                <Star className="h-3 w-3 mr-0.5" />
                Latest Evaluated
              </Badge>
            )}
            {hasEvaluations && (
              <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                {revision.evaluation_count} eval{revision.evaluation_count !== 1 ? "s" : ""}
                {revision.average_evaluation_score != null && ` · ${revision.average_evaluation_score}/10`}
              </Badge>
            )}
            {!isCompact && revision.attachment_url && (
              <Button size="sm" variant="ghost" onClick={() => handleDownload(revision)}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            {!isCompact && canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteRevision(revision)}
                disabled={deletingId === revision.id}
              >
                {deletingId === revision.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Initial Assessment (content dept) */}
        {canAssess && (
          <div className={isCompact ? "ml-0" : "ml-0"}>
            <InlineScoreSelector
              score={revision.initial_assessment}
              onChange={(score) => handleAssessmentChange(revision, score)}
              saving={savingAssessmentId === revision.id}
              disabled={false}
            />
          </div>
        )}

        {/* Show read-only assessment badge for users who can view but not set */}
        {!canAssess && canViewAssessment && revision.initial_assessment && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Assessment:</span>
            <Badge variant="outline" className="text-xs">
              {revision.initial_assessment}/10
            </Badge>
          </div>
        )}

        {/* Row 3: Evaluate Revision button (evaluators) */}
        {canEvaluate && evaluateUrl && (
          <div className="flex items-center gap-2">
            {hasEvaluations ? (
              <Badge variant="outline" className="text-xs text-green-700 border-green-400">
                <ClipboardCheck className="h-3 w-3 mr-1" />
                Evaluated
              </Badge>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => {
                window.location.href = `${evaluateUrl}/${entityId}?revision_id=${revision.id}`;
              }}
            >
              <ClipboardCheck className="h-3 w-3 mr-1" />
              {hasEvaluations ? "Re-evaluate Revision" : "Evaluate Revision"}
            </Button>
          </div>
        )}

        {/* Row 4: Collapsible evaluations for this revision */}
        {!isCompact && revision.evaluations && revision.evaluations.length > 0 && (
          <div className="border-t pt-2 mt-1">
            <button
              type="button"
              onClick={() =>
                setExpandedEvalRevisionId(
                  expandedEvalRevisionId === revision.id ? null : revision.id
                )
              }
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
            >
              {expandedEvalRevisionId === revision.id ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <span className="font-medium">
                {revision.evaluations.length} Evaluation{revision.evaluations.length !== 1 ? "s" : ""}
              </span>
              {revision.average_evaluation_score != null && (
                <span className="text-slate-400">
                  &middot; Avg {revision.average_evaluation_score}/10
                </span>
              )}
            </button>
            {expandedEvalRevisionId === revision.id && (
              <div className="mt-2 space-y-2">
                {revision.evaluations.map((ev: RevisionEvaluation) => (
                  <RevisionEvalCard key={ev.id} ev={ev} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Compact mode
  if (compact) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <History className="h-4 w-4" />
          <span>
            {loading
              ? "Loading revisions..."
              : `${revisions.length} Revision${revisions.length !== 1 ? "s" : ""}`}
          </span>
        </button>

        {expanded && !loading && revisions.length > 0 && (
          <div className="ml-6 space-y-2">
            {revisions.map((revision) => renderRevisionRow(revision, true))}
            {canEdit && !showAddForm && (
              <Button
                size="sm"
                variant="outline"
                className="ml-0 mt-1"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Revision
              </Button>
            )}
            {showAddForm && canEdit && renderAddForm("sm")}
          </div>
        )}

        {expanded && !loading && revisions.length === 0 && canEdit && (
          <div className="ml-6">
            {!showAddForm ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add First Revision
              </Button>
            ) : (
              renderAddForm("sm")
            )}
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5" />
            Revisions
            {!loading && (
              <Badge variant="secondary" className="ml-1">
                {revisions.length}
              </Badge>
            )}
          </CardTitle>
          {canEdit && !showAddForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Revision
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest evaluated revision summary */}
        {latestEvaluatedRevision && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50/50">
            <Star className="h-4 w-4 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">
                Latest Evaluated: Revision #{latestEvaluatedRevision.revision_number}
              </p>
            </div>
            {latestEvaluatedRevision.average_evaluation_score != null && (
              <Badge className="bg-green-600 text-white">
                Avg: {latestEvaluatedRevision.average_evaluation_score}/10
              </Badge>
            )}
            {canViewAssessment && latestEvaluatedRevision.initial_assessment != null && (
              <Badge variant="outline" className="border-green-400 text-green-700">
                Assessment: {latestEvaluatedRevision.initial_assessment}/10
              </Badge>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading revisions...
          </div>
        ) : revisions.length === 0 && !showAddForm ? (
          <div className="text-center py-6">
            <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No revisions yet
            </p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Revision
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {revisions.map((revision) => renderRevisionRow(revision, false))}
          </div>
        )}

        {showAddForm && canEdit && renderAddForm("default")}
      </CardContent>
    </Card>
  );
}
