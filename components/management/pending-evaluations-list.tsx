"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Inbox,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Star,
  User,
  Search,
} from "lucide-react";
import Link from "next/link";
import { StoryApprovalPanel } from "@/components/approvals/story-approval-panel";
import { ContentRevisions } from "@/components/ui/content-revisions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingCallReport {
  id: string;
  workingTitle: string;
  callReportId: string;
  createdAt: string;
  averageScore: number | null;
  finalDecision: string | null;
  lastEvaluatedAt: string;
  evaluationCount: number;
}

interface ReviewedCallReport extends PendingCallReport {
  myDecision: 'approved' | 'rejected' | null;
  myNotes: string | null;
  decidedAt: string | null;
}

interface ReviewEvaluation {
  id: string;
  evaluator_name: string;
  evaluator_email: string;
  average_score: number | null;
  conflict_of_content_score: number | null;
  conflict_of_content_comment: string | null;
  characterization_score: number | null;
  characterization_comment: string | null;
  story_progression_score: number | null;
  story_progression_comment: string | null;
  whats_next_element_score: number | null;
  whats_next_element_comment: string | null;
  overall_oneliner_grade_score: number | null;
  overall_oneliner_grade_comment: string | null;
  decision: string | null;
  decision_notes: string | null;
  comments: string | null;
  big_idea: string | null;
  theme: string | null;
  submitted_at: string | null;
}

interface ReviewData {
  callReport: {
    id: string;
    call_report_id: string;
    working_title: string;
    logline: string | null;
    category: string | null;
    content_type: string | null;
    genre: string[] | null;
    target_slot: string | null;
    overall_rating: number | null;
    logged_by_name: string | null;
    short_synopsis: string | null;
    episodic_synopsis: string | null;
    writers: { writer_name: string; writer_email: string | null }[];
    theme: string | null;
    director: string | null;
    total_episodes: number | null;
    received_episodes: number | null;
    idea_by: string | null;
    developed_by: string | null;
    management_member_name: string | null;
    meeting_notes: string | null;
    next_steps: string | null;
    meeting_date: string | null;
    meeting_attendees: string[];
    duration_minutes: number | null;
    suggested_writer: string | null;
    attachments: {
      id: string;
      file_name: string;
      file_path: string;
      file_size: number | null;
      file_type: string | null;
      uploaded_at: string | null;
      uploader_name: string | null;
    }[];
    initialAssessments: {
      id: string;
      score: number;
      comment: string | null;
      assessor_name: string;
      assessor_role: string | null;
      created_at: string;
    }[];
  };
  evaluations: ReviewEvaluation[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

function ratingLabel(rating: number): { text: string; cls: string } {
  if (rating >= 9)
    return { text: "High rating potential", cls: "text-green-700 bg-green-50 border-green-300" };
  if (rating >= 7)
    return { text: "Rating potential audience appeal", cls: "text-blue-700 bg-blue-50 border-blue-300" };
  if (rating >= 5)
    return { text: "Need improvement", cls: "text-amber-700 bg-amber-50 border-amber-300" };
  return { text: "Need major re-writing", cls: "text-red-700 bg-red-50 border-red-300" };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ScoreBox({ label, score, comment }: { label: string; score: number | null; comment?: string | null }) {
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

// ── Main component ────────────────────────────────────────────────────────────

interface PendingEvaluationsListProps {
  userRole?: string;
  userId?: string;
}

export function PendingEvaluationsList({ userRole, userId }: PendingEvaluationsListProps) {
  const [callReports, setCallReports] = useState<PendingCallReport[]>([]);
  const [reviewedCallReports, setReviewedCallReports] = useState<ReviewedCallReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"all" | "approved" | "rejected">("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Derived filtered lists
  const q = search.toLowerCase();
  const filteredPending = callReports.filter(
    (cr) =>
      !q ||
      cr.workingTitle.toLowerCase().includes(q) ||
      cr.callReportId.toLowerCase().includes(q)
  );
  const filteredReviewed = reviewedCallReports.filter((cr) => {
    const matchesSearch =
      !q ||
      cr.workingTitle.toLowerCase().includes(q) ||
      cr.callReportId.toLowerCase().includes(q);
    const matchesDecision =
      decisionFilter === "all" || cr.myDecision === decisionFilter;
    return matchesSearch && matchesDecision;
  });

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/management/approval-queue?_t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFetchError(data.error || "Failed to load pending evaluations.");
        return;
      }
      setCallReports(data.callReports);
      setReviewedCallReports(data.reviewedCallReports || []);
    } catch (error) {
      console.error("Failed to fetch approval queue:", error);
      setFetchError("Failed to load pending evaluations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleReview = async (cr: PendingCallReport) => {
    setSelectedId(cr.id);
    setSelectedTitle(cr.workingTitle);
    setReviewData(null);
    setLoadingReview(true);
    try {
      const res = await fetch(`/api/management/call-report-review?id=${cr.id}`);
      const data = await res.json();
      if (res.ok) setReviewData(data);
    } catch {
      // non-fatal — approval panel still works
    } finally {
      setLoadingReview(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedId(null);
      setSelectedTitle("");
      setReviewData(null);
      fetchQueue();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Stories evaluated by the team that are awaiting your approval
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQueue} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by title or report ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 shrink-0">
          {(["all", "approved", "rejected"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={decisionFilter === f ? "default" : "outline"}
              onClick={() => setDecisionFilter(f)}
              className={
                decisionFilter !== f
                  ? ""
                  : f === "approved"
                  ? "bg-green-600 hover:bg-green-700"
                  : f === "rejected"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {f === "all" ? "All" : f === "approved" ? "Approved" : "Rejected"}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {fetchError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <p className="text-sm text-red-600">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={fetchQueue}>Retry</Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium text-slate-700">
              {callReports.length === 0 ? "All caught up!" : "No matches"}
            </p>
            <p className="text-sm">
              {callReports.length === 0
                ? "No evaluations are pending your review."
                : "No pending evaluations match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {filteredPending.length} stor{filteredPending.length !== 1 ? "ies" : "y"} awaiting your review
          </p>
          {filteredPending.map((cr) => (
            <Card key={cr.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">
                        {cr.workingTitle}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {cr.callReportId}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                      <span>{cr.evaluationCount} evaluation{cr.evaluationCount !== 1 ? "s" : ""}</span>
                      {cr.averageScore !== null && (
                        <span className={`font-semibold ${scoreColor(cr.averageScore)}`}>
                          Avg {cr.averageScore.toFixed(1)}
                        </span>
                      )}
                      <span>Evaluated {timeAgo(cr.lastEvaluatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/management/evaluate/call-report/${cr.id}`}>
                        Evaluate
                      </Link>
                    </Button>
                    <Button size="sm" onClick={() => handleReview(cr)}>
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* My Decisions — read-only view of stories already voted on */}
      {reviewedCallReports.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-semibold text-slate-700">
            My Decisions ({filteredReviewed.length}
            {filteredReviewed.length !== reviewedCallReports.length && ` of ${reviewedCallReports.length}`})
          </p>
          {filteredReviewed.length === 0 && (
            <p className="text-sm text-slate-400 italic">No decisions match your search or filter.</p>
          )}
          {filteredReviewed.map((cr) => (
            <Card
              key={cr.id}
              className={`hover:shadow-sm transition-shadow border-l-4 ${
                cr.myDecision === "approved"
                  ? "border-l-green-500"
                  : "border-l-red-500"
              }`}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">
                        {cr.workingTitle}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {cr.callReportId}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${
                          cr.myDecision === "approved"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "bg-red-100 text-red-800 border-red-300"
                        }`}
                      >
                        {cr.myDecision === "approved" ? "Approved" : "Rejected"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                      {cr.averageScore !== null && (
                        <span className={`font-semibold ${scoreColor(cr.averageScore)}`}>
                          Avg {cr.averageScore.toFixed(1)}
                        </span>
                      )}
                      {cr.decidedAt && (
                        <span>Decided {formatDate(cr.decidedAt)}</span>
                      )}
                    </div>
                    {cr.myNotes && (
                      <p className="text-xs text-slate-500 mt-1.5 italic">
                        Notes: {cr.myNotes}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReview(cr)}
                    className="shrink-0"
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedId} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedTitle}</DialogTitle>
          </DialogHeader>

          {loadingReview ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviewData ? (
            <div className="space-y-5">

              {/* ── Section 1: Call Report Info ──────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">
                    {reviewData.callReport.call_report_id}
                  </Badge>
                  {reviewData.callReport.category && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {reviewData.callReport.category.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {reviewData.callReport.content_type && (
                    <Badge variant="secondary" className="text-xs">
                      {reviewData.callReport.content_type}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  {/* Writers */}
                  {reviewData.callReport.writers.length > 0 && (
                    <div>
                      <span className="font-medium text-slate-700">
                        {reviewData.callReport.writers.length > 1 ? "Writers:" : "Writer:"}
                      </span>
                      <span className="text-slate-600 ml-1">
                        {reviewData.callReport.writers
                          .map((w) => w.writer_name + (w.writer_email ? ` (${w.writer_email})` : ""))
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Suggested Writer */}
                  {reviewData.callReport.suggested_writer && (
                    <div>
                      <span className="font-medium text-slate-700">Suggested Writer:</span>
                      <span className="text-slate-600 ml-1">{reviewData.callReport.suggested_writer}</span>
                    </div>
                  )}

                  {/* Director */}
                  {reviewData.callReport.director && (
                    <div>
                      <span className="font-medium text-slate-700">Director:</span>
                      <span className="text-slate-600 ml-1">{reviewData.callReport.director}</span>
                    </div>
                  )}

                  {/* Episodes */}
                  {(reviewData.callReport.total_episodes !== null || reviewData.callReport.received_episodes !== null) && (
                    <div className="flex gap-6">
                      {reviewData.callReport.total_episodes !== null && (
                        <div>
                          <span className="font-medium text-slate-700">Total Episodes:</span>
                          <span className="text-slate-600 ml-1">{reviewData.callReport.total_episodes}</span>
                        </div>
                      )}
                      {reviewData.callReport.received_episodes !== null && (
                        <div>
                          <span className="font-medium text-slate-700">Received Episodes:</span>
                          <span className="text-slate-600 ml-1">{reviewData.callReport.received_episodes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Logline */}
                  {reviewData.callReport.logline && (
                    <div>
                      <span className="font-medium text-slate-700">Logline:</span>
                      <p className="text-slate-600 mt-0.5">{reviewData.callReport.logline}</p>
                    </div>
                  )}

                  {/* Genre + Slot + Theme row */}
                  {(reviewData.callReport.genre?.length || reviewData.callReport.target_slot || reviewData.callReport.theme) && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      {!!reviewData.callReport.genre?.length && (
                        <div>
                          <span className="font-medium text-slate-700">Genre:</span>
                          <span className="text-slate-600 ml-1">{reviewData.callReport.genre.join(", ")}</span>
                        </div>
                      )}
                      {reviewData.callReport.target_slot && (
                        <div>
                          <span className="font-medium text-slate-700">Slot:</span>
                          <span className="text-slate-600 ml-1">{reviewData.callReport.target_slot}</span>
                        </div>
                      )}
                      {reviewData.callReport.theme && (
                        <div>
                          <span className="font-medium text-slate-700">Theme:</span>
                          <span className="text-slate-600 ml-1">{reviewData.callReport.theme}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Short Synopsis */}
                  {reviewData.callReport.short_synopsis && (
                    <div>
                      <span className="font-medium text-slate-700">Short Synopsis:</span>
                      <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{reviewData.callReport.short_synopsis}</p>
                    </div>
                  )}

                  {/* Episodic Synopsis */}
                  {reviewData.callReport.episodic_synopsis && (
                    <div>
                      <span className="font-medium text-slate-700">Episodic Synopsis:</span>
                      <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{reviewData.callReport.episodic_synopsis}</p>
                    </div>
                  )}

                  {/* Idea By / Developed By / Management Member */}
                  {(reviewData.callReport.idea_by || reviewData.callReport.developed_by || reviewData.callReport.management_member_name) && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      {reviewData.callReport.idea_by && (
                        <div>
                          <span className="font-medium text-slate-700">Idea By:</span>
                          <span className="text-slate-600 ml-1">{reviewData.callReport.idea_by}</span>
                        </div>
                      )}
                      {reviewData.callReport.developed_by && (
                        <div>
                          <span className="font-medium text-slate-700">Developed By:</span>
                          <span className="text-slate-600 ml-1">{reviewData.callReport.developed_by}</span>
                        </div>
                      )}
                      {reviewData.callReport.management_member_name && (
                        <div>
                          <span className="font-medium text-slate-700">Management Member:</span>
                          <span className="text-slate-600 ml-1">{reviewData.callReport.management_member_name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meeting Notes */}
                  {reviewData.callReport.meeting_notes && (
                    <div>
                      <span className="font-medium text-slate-700">Meeting Notes:</span>
                      <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{reviewData.callReport.meeting_notes}</p>
                    </div>
                  )}

                  {/* Next Steps */}
                  {reviewData.callReport.next_steps && (
                    <div>
                      <span className="font-medium text-slate-700">Next Steps:</span>
                      <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{reviewData.callReport.next_steps}</p>
                    </div>
                  )}

                  {/* Logged By */}
                  {reviewData.callReport.logged_by_name && (
                    <div>
                      <span className="font-medium text-slate-700">Logged By:</span>
                      <span className="text-slate-600 ml-1">{reviewData.callReport.logged_by_name}</span>
                    </div>
                  )}

                  {/* Attendees */}
                  {reviewData.callReport.meeting_attendees.length > 0 && (
                    <div>
                      <span className="font-medium text-slate-700">Attendees:</span>
                      <span className="text-slate-600 ml-1">{reviewData.callReport.meeting_attendees.join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Initial Assessments */}
                {reviewData.callReport.initialAssessments.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200 space-y-2">
                    <p className="text-xs font-semibold text-blue-800">
                      Team Initial Assessments ({reviewData.callReport.initialAssessments.length})
                    </p>
                    {reviewData.callReport.initialAssessments.map((a) => (
                      <div key={a.id} className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-medium text-blue-900">{a.assessor_name}</span>
                            {a.assessor_role && (
                              <span className="text-xs text-blue-600 ml-1 capitalize">
                                ({a.assessor_role.replace(/_/g, " ")})
                              </span>
                            )}
                            {a.comment && (
                              <p className="text-xs text-blue-700 italic mt-0.5">{a.comment}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-blue-600">{a.score}/10</span>
                          <p className={`text-[10px] ${ratingLabel(a.score).cls.split(" ")[0]}`}>
                            {ratingLabel(a.score).text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Attachments ──────────────────────────────────────────── */}
              {reviewData.callReport.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Attachments ({reviewData.callReport.attachments.length})
                    </p>
                    <div className="space-y-1.5">
                      {reviewData.callReport.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={`/api/attachments/download?path=${encodeURIComponent(att.file_path)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-700 truncate font-medium">{att.file_name}</span>
                            {att.file_size && (
                              <span className="text-xs text-slate-400 shrink-0">{formatFileSize(att.file_size)}</span>
                            )}
                          </div>
                          <span className="text-xs text-blue-600 shrink-0">Download</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* ── Section 2: Team Evaluations ──────────────────────────── */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  Team Evaluations ({reviewData.evaluations.length})
                </p>

                {reviewData.evaluations.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No evaluations submitted yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reviewData.evaluations.map((ev) => (
                      <div key={ev.id} className="border rounded-lg p-4 space-y-3">
                        {/* Evaluator header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{ev.evaluator_name}</p>
                            <p className="text-xs text-muted-foreground">{ev.evaluator_email}</p>
                            {ev.submitted_at && (
                              <p className="text-xs text-muted-foreground">{formatDate(ev.submitted_at)}</p>
                            )}
                          </div>
                          {ev.average_score !== null && (
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-base font-bold">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span>{ev.average_score.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Avg Score</p>
                            </div>
                          )}
                        </div>

                        {/* Criteria grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
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
                            label="What's Next Element"
                            score={ev.whats_next_element_score}
                            comment={ev.whats_next_element_comment}
                          />
                          <div className="col-span-2">
                            <ScoreBox
                              label="Overall Oneliner Grade"
                              score={ev.overall_oneliner_grade_score}
                              comment={ev.overall_oneliner_grade_comment}
                            />
                          </div>
                        </div>

                        {/* Big Idea / Theme */}
                        {(ev.big_idea || ev.theme) && (
                          <div className="flex gap-4 text-xs">
                            {ev.big_idea && (
                              <div>
                                <span className="font-medium text-slate-700">Big Idea:</span>
                                <span className="text-slate-600 ml-1">{ev.big_idea}</span>
                              </div>
                            )}
                            {ev.theme && (
                              <div>
                                <span className="font-medium text-slate-700">Theme:</span>
                                <span className="text-slate-600 ml-1">{ev.theme}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Comments */}
                        {ev.comments && (
                          <div className="bg-slate-50 rounded p-2 text-xs">
                            <p className="font-medium text-slate-700 mb-0.5">Comments</p>
                            <p className="text-slate-600">{ev.comments}</p>
                          </div>
                        )}

                        {/* Decision */}
                        {ev.decision && (
                          <div className="flex items-center gap-2">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Revisions ──────────────────────────────────────────── */}
              {selectedId && (
                <ContentRevisions
                  entityId={selectedId}
                  apiBasePath="/api/call-reports"
                  storageBucket="attachments"
                  canEdit={false}
                  userRole={userRole || "management"}
                  evaluateUrl="/management/evaluate/call-report"
                  entityType="call-report"
                />
              )}

              <Separator />

              {/* ── Section 3: Approval Gate ──────────────────────────────── */}
              {selectedId && (
                <StoryApprovalPanel
                  callReportId={selectedId}
                  evaluationCompleted={true}
                />
              )}
            </div>
          ) : (
            /* Fallback: show approval panel even if detail fetch failed */
            selectedId && (
              <StoryApprovalPanel
                callReportId={selectedId}
                evaluationCompleted={true}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
