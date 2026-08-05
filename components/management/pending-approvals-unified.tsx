"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Loader2,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Star,
  User,
  CheckCircle2,
  FileText,
  FileVideo,
  Paperclip,
} from "lucide-react";
import { ContentRevisions } from "@/components/ui/content-revisions";
import { CallReportDiscussion, DiscussionThread } from "@/components/call-reports/call-report-discussion";
import { ShareCrossTeamButton } from "@/components/call-report/share-cross-team-button";
import { RevisionEvaluateList } from "@/components/episodes/revision-evaluate-list";
import { formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttachmentItem {
  id: string;
  fileName: string;
  filePath: string;
}

interface PendingCallReport {
  id: string;
  workingTitle: string;
  callReportId: string;
  createdAt: string;
  averageScore: number | null;
  finalDecision: string | null;
  lastEvaluatedAt: string;
  evaluationCount: number;
  discussionCount: number;
  revisionCount: number;
  originalSubmissionDate: string | null;
  attachments: AttachmentItem[];
}

interface ReviewedCallReport extends PendingCallReport {
  myDecision: "approved" | "rejected" | null;
  myNotes: string | null;
  decidedAt: string | null;
}

interface EpisodeQueueItem {
  id: string;
  episodeNumber: number;
  title: string | null;
  callReportId: string | null;
  callReportTitle: string;
  callReportDisplayId: string;
  evaluationCount: number;
  averageScore: number | null;
  lastEvaluatedAt: string;
  discussionCount: number;
  approvalStatus: "approved" | "rejected" | "needs_revision" | null;
  approvedAt: string | null;
  attachmentName: string | null;
  originalSubmissionDate: string | null;
  revisionCount: number;
}

interface UnifiedProject {
  callReportId: string;
  callReportDisplayId: string;
  title: string;
  oneLiner: PendingCallReport | null;
  reviewedOneLiner: ReviewedCallReport | null;
  pendingEpisodes: EpisodeQueueItem[];
  reviewedEpisodes: EpisodeQueueItem[];
}

// One-liner review data
interface OLReviewEvaluation {
  id: string;
  evaluator_name: string;
  evaluator_email: string;
  evaluator_role: string | null;
  evaluator_team: string | null;
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

interface OLReviewData {
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
  evaluations: OLReviewEvaluation[];
}

// Episode review data
interface EpReviewEvaluation {
  id: string;
  evaluator_name: string;
  evaluator_email: string;
  evaluator_role: string | null;
  evaluator_team: string | null;
  overall_average: number | null;
  created_at: string | null;
  no_of_pages: number | null;
  no_of_scenes: number | null;
  events: string[];
  freeze_ending_scene: string | null;
  summary_analysis: string | null;
  remarks: string | null;
  scenes_remarks: string | null;
  characterization_remarks: string | null;
  conflict_of_content_score: number | null;
  conflict_of_content_comment: string | null;
  characterization_score: number | null;
  characterization_comment: string | null;
  story_progression_score: number | null;
  story_progression_comment: string | null;
  main_event_score: number | null;
  main_event_comment: string | null;
  small_event_score: number | null;
  small_event_comment: string | null;
  dragness_score: number | null;
  dragness_comment: string | null;
  freezes_score: number | null;
  freezes_comment: string | null;
  whats_next_element_score: number | null;
  whats_next_element_comment: string | null;
  overall_assessment_score: number | null;
  overall_assessment_comment: string | null;
}

interface EpReviewData {
  episode: {
    id: string;
    episode_number: number;
    title: string | null;
    approval_status: string | null;
    approved_at: string | null;
    call_report_id: string | null;
    call_report_title: string | null;
    logged_by_name: string | null;
  };
  evaluations: EpReviewEvaluation[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string; borderLeft: string }> = {
  approved: { label: "Approved", className: "bg-green-100 text-green-800 border-green-300", borderLeft: "border-l-green-500" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-300", borderLeft: "border-l-red-500" },
  needs_revision: { label: "Needs Revision", className: "bg-amber-100 text-amber-800 border-amber-300", borderLeft: "border-l-amber-500" },
};

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

function ratingLabel(rating: number): { text: string; cls: string } {
  if (rating >= 9) return { text: "High rating potential", cls: "text-green-700 bg-green-50 border-green-300" };
  if (rating >= 7) return { text: "Rating potential audience appeal", cls: "text-blue-700 bg-blue-50 border-blue-300" };
  if (rating >= 5) return { text: "Need improvement", cls: "text-amber-700 bg-amber-50 border-amber-300" };
  return { text: "Need major re-writing", cls: "text-red-700 bg-red-50 border-red-300" };
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
      <p className="font-semibold text-sm">{score !== null && score !== undefined ? `${score}/10` : "N/A"}</p>
      {comment && <p className="text-xs text-muted-foreground mt-1 italic">{comment}</p>}
    </div>
  );
}

// ── Merge logic ──────────────────────────────────────────────────────────────

function mergeProjects(
  callReports: PendingCallReport[],
  reviewedCallReports: ReviewedCallReport[],
  episodes: EpisodeQueueItem[],
  reviewedEpisodes: EpisodeQueueItem[],
): UnifiedProject[] {
  const map = new Map<string, UnifiedProject>();

  const getOrCreate = (id: string, displayId: string, title: string): UnifiedProject => {
    if (!map.has(id)) {
      map.set(id, {
        callReportId: id,
        callReportDisplayId: displayId,
        title,
        oneLiner: null,
        reviewedOneLiner: null,
        pendingEpisodes: [],
        reviewedEpisodes: [],
      });
    }
    return map.get(id)!;
  };

  for (const cr of callReports) {
    const p = getOrCreate(cr.id, cr.callReportId, cr.workingTitle);
    p.oneLiner = cr;
  }
  for (const cr of reviewedCallReports) {
    const p = getOrCreate(cr.id, cr.callReportId, cr.workingTitle);
    p.reviewedOneLiner = cr;
  }
  for (const ep of episodes) {
    if (!ep.callReportId) continue;
    const p = getOrCreate(ep.callReportId, ep.callReportDisplayId, ep.callReportTitle);
    p.pendingEpisodes.push(ep);
  }
  for (const ep of reviewedEpisodes) {
    if (!ep.callReportId) continue;
    const p = getOrCreate(ep.callReportId, ep.callReportDisplayId, ep.callReportTitle);
    p.reviewedEpisodes.push(ep);
  }

  // Sort episodes by number within each project
  for (const proj of map.values()) {
    proj.pendingEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    proj.reviewedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  // Sort projects: pending items first, then by count
  return Array.from(map.values()).sort((a, b) => {
    const aPending = (a.oneLiner ? 1 : 0) + a.pendingEpisodes.length;
    const bPending = (b.oneLiner ? 1 : 0) + b.pendingEpisodes.length;
    if (aPending > 0 && bPending === 0) return -1;
    if (bPending > 0 && aPending === 0) return 1;
    return bPending - aPending;
  });
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  userId: string;
  userRole: string;
}

export function PendingApprovalsUnified({ userId, userRole }: Props) {
  const [projects, setProjects] = useState<UnifiedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // One-liner review dialog
  const [olReviewId, setOlReviewId] = useState<string | null>(null);
  const [olReviewTitle, setOlReviewTitle] = useState("");
  const [olReviewData, setOlReviewData] = useState<OLReviewData | null>(null);
  const [olReviewLoading, setOlReviewLoading] = useState(false);

  // Episode review dialog
  const [epReviewItem, setEpReviewItem] = useState<EpisodeQueueItem | null>(null);
  const [epReviewData, setEpReviewData] = useState<EpReviewData | null>(null);
  const [epReviewLoading, setEpReviewLoading] = useState(false);

  // Caches so reopening the same dialog doesn't refetch
  const olCache = useRef<Map<string, OLReviewData>>(new Map());
  const epCache = useRef<Map<string, EpReviewData>>(new Map());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [olRes, epRes] = await Promise.all([
        fetch(`/api/management/approval-queue?_t=${Date.now()}`),
        fetch(`/api/management/episode-approval-queue?_t=${Date.now()}`),
      ]);
      const [olData, epData] = await Promise.all([olRes.json(), epRes.json()]);
      if (!olRes.ok) throw new Error(olData.error || "Failed to load one-liners");
      if (!epRes.ok) throw new Error(epData.error || "Failed to load episodes");

      setProjects(
        mergeProjects(
          olData.callReports || [],
          olData.reviewedCallReports || [],
          epData.episodes || [],
          epData.reviewedEpisodes || [],
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // One-liner review
  const openOlReview = async (cr: PendingCallReport | ReviewedCallReport) => {
    setOlReviewId(cr.id);
    setOlReviewTitle(cr.workingTitle);
    const cached = olCache.current.get(cr.id);
    if (cached) { setOlReviewData(cached); return; }
    setOlReviewData(null);
    setOlReviewLoading(true);
    try {
      const res = await fetch(`/api/management/call-report-review?id=${cr.id}`);
      const data = await res.json();
      if (res.ok) { olCache.current.set(cr.id, data); setOlReviewData(data); }
    } catch { /* non-fatal */ } finally {
      setOlReviewLoading(false);
    }
  };

  // Episode review
  const openEpReview = async (ep: EpisodeQueueItem) => {
    setEpReviewItem(ep);
    const cached = epCache.current.get(ep.id);
    if (cached) { setEpReviewData(cached); return; }
    setEpReviewData(null);
    setEpReviewLoading(true);
    try {
      const res = await fetch(`/api/management/episode-review?id=${ep.id}`);
      const data = await res.json();
      if (res.ok) { epCache.current.set(ep.id, data); setEpReviewData(data); }
    } catch { /* non-fatal */ } finally {
      setEpReviewLoading(false);
    }
  };

  // Filter
  const q = search.toLowerCase();
  const filtered = q
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.callReportDisplayId.toLowerCase().includes(q) ||
          p.pendingEpisodes.some((ep) => `ep${ep.episodeNumber}`.includes(q) || (ep.title || "").toLowerCase().includes(q)) ||
          p.reviewedEpisodes.some((ep) => `ep${ep.episodeNumber}`.includes(q) || (ep.title || "").toLowerCase().includes(q))
      )
    : projects;

  const totalPending = filtered.reduce(
    (sum, p) => sum + (p.oneLiner ? 1 : 0) + p.pendingEpisodes.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by title, report ID, or episode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAll}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!error && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium text-slate-700">
              {projects.length === 0 ? "All caught up!" : "No matches"}
            </p>
            <p className="text-sm">
              {projects.length === 0
                ? "No evaluations are pending your review."
                : "No projects match your search."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Project cards */}
      {!error && filtered.length > 0 && (
        <>
          <p className="text-sm text-slate-500">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
            {totalPending > 0 && ` · ${totalPending} pending`}
          </p>
          <div className="space-y-3">
            {filtered.map((proj) => (
              <UnifiedProjectCard
                key={proj.callReportId}
                project={proj}
                userId={userId}
                userRole={userRole}
                onOlReview={openOlReview}
                onEpReview={openEpReview}
              />
            ))}
          </div>
        </>
      )}

      {/* ── One-Liner Review Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!olReviewId} onOpenChange={(open) => { if (!open) setOlReviewId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{olReviewTitle}</DialogTitle>
          </DialogHeader>
          {olReviewLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : olReviewData ? (
            <OLReviewContent data={olReviewData} userId={userId} userRole={userRole} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Episode Review Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!epReviewItem} onOpenChange={(open) => { if (!open) setEpReviewItem(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {epReviewItem ? `EP${epReviewItem.episodeNumber}${epReviewItem.title ? ` — ${epReviewItem.title}` : ""}` : ""}
            </DialogTitle>
          </DialogHeader>
          {epReviewLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : epReviewData ? (
            <EpReviewContent data={epReviewData} userId={userId} userRole={userRole} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Unified Project Card ─────────────────────────────────────────────────────

function UnifiedProjectCard({
  project: p,
  userId,
  userRole,
  onOlReview,
  onEpReview,
}: {
  project: UnifiedProject;
  userId: string;
  userRole: string;
  onOlReview: (cr: PendingCallReport | ReviewedCallReport) => void;
  onEpReview: (ep: EpisodeQueueItem) => void;
}) {
  const hasPending = p.oneLiner !== null || p.pendingEpisodes.length > 0;
  const hasReviewed = p.reviewedOneLiner !== null || p.reviewedEpisodes.length > 0;
  const [expanded, setExpanded] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);

  const pendingOlCount = p.oneLiner ? 1 : 0;
  const pendingEpCount = p.pendingEpisodes.length;

  return (
    <Card className="overflow-hidden">
      {/* Project header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 border-b bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
        <h2 className="text-base font-semibold text-slate-900 flex-1 min-w-0 truncate">
          {p.title}
        </h2>
        {p.callReportDisplayId && (
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            {p.callReportDisplayId}
          </Badge>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {pendingOlCount > 0 && (
            <Badge className="text-xs bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-100">
              <FileText className="h-3 w-3 mr-1" />
              One-Liner
            </Badge>
          )}
          {pendingEpCount > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
              <FileVideo className="h-3 w-3 mr-1" />
              {pendingEpCount} ep{pendingEpCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {!hasPending && hasReviewed && (
            <Badge variant="secondary" className="text-xs">Reviewed</Badge>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="p-4 space-y-4">
          {/* ── One-Liner Section ─────────────────────────────────── */}
          {p.oneLiner && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> One-Liner Evaluation
              </p>
              <div className="rounded-lg border bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{p.oneLiner.evaluationCount} evaluation{p.oneLiner.evaluationCount !== 1 ? "s" : ""}</span>
                      {p.oneLiner.averageScore !== null && (
                        <span className={`font-semibold ${scoreColor(p.oneLiner.averageScore)}`}>
                          Avg {p.oneLiner.averageScore.toFixed(1)}
                        </span>
                      )}
                      <span>Evaluated {timeAgo(p.oneLiner.lastEvaluatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ShareCrossTeamButton callReportId={p.callReportId} />
                    <Button size="sm" onClick={() => onOlReview(p.oneLiner!)}>Review</Button>
                  </div>
                </div>
                {/* Attachments */}
                {p.oneLiner.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {p.oneLiner.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={`/api/attachments/download?path=${encodeURIComponent(att.filePath)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-xs"
                      >
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[200px]">{att.fileName}</span>
                      </a>
                    ))}
                  </div>
                )}
                <RevisionEvaluateList
                  entityId={p.callReportId}
                  entityType="call-report"
                  revisionCount={p.oneLiner.revisionCount}
                  portalPrefix="management"
                  originalFileName={p.oneLiner.workingTitle}
                  originalDate={p.oneLiner.originalSubmissionDate}
                  evaluateBasePath="/management/evaluate/call-report"
                />
                <CallReportDiscussion
                  callReportId={p.callReportId}
                  currentUserId={userId}
                  currentUserRole={userRole}
                  compact={true}
                  defaultExpanded={true}
                />
              </div>
            </div>
          )}

          {/* ── Pending Episodes Section ──────────────────────────── */}
          {p.pendingEpisodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileVideo className="h-3.5 w-3.5" /> Episodes ({p.pendingEpisodes.length} pending)
              </p>
              <div className="space-y-2">
                {p.pendingEpisodes.map((ep) => (
                  <EpisodeSubCard
                    key={ep.id}
                    ep={ep}
                    userId={userId}
                    userRole={userRole}
                    onReview={onEpReview}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── My Decisions (collapsed by default) ───────────────── */}
          {hasReviewed && (
            <div className="border-t pt-3">
              <button
                type="button"
                onClick={() => setShowDecisions((v) => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showDecisions ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span className="font-medium">My Decisions</span>
                <span className="text-xs text-slate-400">
                  ({(p.reviewedOneLiner ? 1 : 0) + p.reviewedEpisodes.length})
                </span>
              </button>
              {showDecisions && (
                <div className="mt-3 space-y-2">
                  {/* Reviewed one-liner */}
                  {p.reviewedOneLiner && (
                    <div className={`rounded-lg border bg-white p-3 border-l-4 ${
                      p.reviewedOneLiner.myDecision === "approved" ? "border-l-green-500" : "border-l-red-500"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm text-slate-700">One-Liner</span>
                            <Badge variant="outline" className={`text-xs ${
                              p.reviewedOneLiner.myDecision === "approved"
                                ? "bg-green-100 text-green-800 border-green-300"
                                : "bg-red-100 text-red-800 border-red-300"
                            }`}>
                              {p.reviewedOneLiner.myDecision === "approved" ? "Approved" : "Rejected"}
                            </Badge>
                          </div>
                          {p.reviewedOneLiner.decidedAt && (
                            <p className="text-xs text-slate-400 mt-0.5">Decided {formatDate(p.reviewedOneLiner.decidedAt)}</p>
                          )}
                          {p.reviewedOneLiner.myNotes && (
                            <p className="text-xs text-slate-500 mt-1 italic">Notes: {p.reviewedOneLiner.myNotes}</p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onOlReview(p.reviewedOneLiner!)}>View</Button>
                      </div>
                    </div>
                  )}

                  {/* Reviewed episodes */}
                  {p.reviewedEpisodes.map((ep) => (
                    <EpisodeSubCard key={ep.id} ep={ep} userId={userId} userRole={userRole} onReview={onEpReview} reviewed />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Episode Sub-Card ─────────────────────────────────────────────────────────

function EpisodeSubCard({
  ep,
  userId,
  userRole,
  onReview,
  reviewed = false,
}: {
  ep: EpisodeQueueItem;
  userId: string;
  userRole: string;
  onReview: (ep: EpisodeQueueItem) => void;
  reviewed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = ep.approvalStatus ? STATUS_BADGE[ep.approvalStatus] : null;
  const epLabel = `EP${ep.episodeNumber}${ep.title ? ` — ${ep.title}` : ""}`;

  return (
    <div className={`rounded-lg border bg-white transition-all ${reviewed && statusInfo ? `border-l-4 ${statusInfo.borderLeft}` : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => setExpanded((v) => !v)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-800">{epLabel}</span>
            {statusInfo && (
              <Badge variant="outline" className={`text-xs shrink-0 ${statusInfo.className}`}>{statusInfo.label}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
            {ep.evaluationCount > 0 && <span>{ep.evaluationCount} eval{ep.evaluationCount !== 1 ? "s" : ""}</span>}
            {ep.averageScore !== null && (
              <span className={`font-semibold ${scoreColor(ep.averageScore)}`}>Avg {ep.averageScore.toFixed(1)}</span>
            )}
            {ep.lastEvaluatedAt && !reviewed && <span>Evaluated {timeAgo(ep.lastEvaluatedAt)}</span>}
            {reviewed && ep.approvedAt && (
              <span>Decided {formatDistanceToNow(new Date(ep.approvedAt), { addSuffix: true })}</span>
            )}
          </div>
        </button>
        {ep.attachmentName && (
          <a
            href={`/api/episodes/download/${ep.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-xs shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Paperclip className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[150px]">{ep.attachmentName}</span>
          </a>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {ep.callReportId && (
            <ShareCrossTeamButton callReportId={ep.callReportId} episodeId={ep.id} callReportTitle={ep.callReportTitle} />
          )}
          <Button size="sm" variant={reviewed ? "outline" : "default"} onClick={() => onReview(ep)}>
            {reviewed ? "View" : "Review"}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t px-4 pb-4 pt-4 space-y-5 bg-slate-50/50">
          <RevisionEvaluateList
            entityId={ep.id}
            entityType="episode"
            revisionCount={ep.revisionCount}
            portalPrefix="management"
            originalFileName={ep.attachmentName}
            originalDate={ep.originalSubmissionDate}
            evaluateBasePath="/management/evaluate/episode"
          />
          <ContentRevisions entityId={ep.id} apiBasePath="/api/episodes" storageBucket="episodes" canEdit={false} userRole={userRole} evaluateUrl="/management/evaluate/episode" entityType="episode" />
          <Separator />
          <DiscussionThread entityId={ep.id} apiBasePath="/api/episodes" currentUserId={userId} currentUserRole={userRole} compact={true} defaultExpanded={true} title="Episode Feedback" />
        </div>
      )}
    </div>
  );
}

// ── One-Liner Review Dialog Content ──────────────────────────────────────────

function OLReviewContent({ data, userId, userRole }: { data: OLReviewData; userId: string; userRole: string }) {
  const cr = data.callReport;
  return (
    <div className="space-y-5">
      {/* Call Report Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs">{cr.call_report_id}</Badge>
          {cr.category && <Badge variant="secondary" className="text-xs capitalize">{cr.category.replace(/_/g, " ")}</Badge>}
          {cr.content_type && <Badge variant="secondary" className="text-xs">{cr.content_type}</Badge>}
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {cr.writers.length > 0 && (
            <div>
              <span className="font-medium text-slate-700">{cr.writers.length > 1 ? "Writers:" : "Writer:"}</span>
              <span className="text-slate-600 ml-1">{cr.writers.map((w) => w.writer_name + (w.writer_email ? ` (${w.writer_email})` : "")).join(", ")}</span>
            </div>
          )}
          {cr.suggested_writer && <div><span className="font-medium text-slate-700">Suggested Writer:</span><span className="text-slate-600 ml-1">{cr.suggested_writer}</span></div>}
          {cr.director && <div><span className="font-medium text-slate-700">Director:</span><span className="text-slate-600 ml-1">{cr.director}</span></div>}
          {(cr.total_episodes !== null || cr.received_episodes !== null) && (
            <div className="flex gap-6">
              {cr.total_episodes !== null && <div><span className="font-medium text-slate-700">Total Episodes:</span><span className="text-slate-600 ml-1">{cr.total_episodes}</span></div>}
              {cr.received_episodes !== null && <div><span className="font-medium text-slate-700">Received Episodes:</span><span className="text-slate-600 ml-1">{cr.received_episodes}</span></div>}
            </div>
          )}
          {cr.logline && <div><span className="font-medium text-slate-700">Logline:</span><p className="text-slate-600 mt-0.5">{cr.logline}</p></div>}
          {(cr.genre?.length || cr.target_slot || cr.theme) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {!!cr.genre?.length && <div><span className="font-medium text-slate-700">Genre:</span><span className="text-slate-600 ml-1">{cr.genre.join(", ")}</span></div>}
              {cr.target_slot && <div><span className="font-medium text-slate-700">Slot:</span><span className="text-slate-600 ml-1">{cr.target_slot}</span></div>}
              {cr.theme && <div><span className="font-medium text-slate-700">Theme:</span><span className="text-slate-600 ml-1">{cr.theme}</span></div>}
            </div>
          )}
          {cr.short_synopsis && <div><span className="font-medium text-slate-700">Short Synopsis:</span><p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{cr.short_synopsis}</p></div>}
          {cr.episodic_synopsis && <div><span className="font-medium text-slate-700">Episodic Synopsis:</span><p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{cr.episodic_synopsis}</p></div>}
          {(cr.idea_by || cr.developed_by || cr.management_member_name) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {cr.idea_by && <div><span className="font-medium text-slate-700">Idea By:</span><span className="text-slate-600 ml-1">{cr.idea_by}</span></div>}
              {cr.developed_by && <div><span className="font-medium text-slate-700">Developed By:</span><span className="text-slate-600 ml-1">{cr.developed_by}</span></div>}
              {cr.management_member_name && <div><span className="font-medium text-slate-700">Management Member:</span><span className="text-slate-600 ml-1">{cr.management_member_name}</span></div>}
            </div>
          )}
          {cr.meeting_notes && <div><span className="font-medium text-slate-700">Meeting Notes:</span><p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{cr.meeting_notes}</p></div>}
          {cr.next_steps && <div><span className="font-medium text-slate-700">Next Steps:</span><p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{cr.next_steps}</p></div>}
          {cr.logged_by_name && <div><span className="font-medium text-slate-700">Logged By:</span><span className="text-slate-600 ml-1">{cr.logged_by_name}</span></div>}
          {cr.meeting_attendees.length > 0 && <div><span className="font-medium text-slate-700">Attendees:</span><span className="text-slate-600 ml-1">{cr.meeting_attendees.join(", ")}</span></div>}
        </div>

        {/* Initial Assessments */}
        {cr.initialAssessments.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200 space-y-2">
            <p className="text-xs font-semibold text-blue-800">Team Initial Assessments ({cr.initialAssessments.length})</p>
            {cr.initialAssessments.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-blue-900">{a.assessor_name}</span>
                    {a.assessor_role && <span className="text-xs text-blue-600 ml-1 capitalize">({a.assessor_role.replace(/_/g, " ")})</span>}
                    {a.comment && <p className="text-xs text-blue-700 italic mt-0.5">{a.comment}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-blue-600">{a.score}/10</span>
                  <p className={`text-[10px] ${ratingLabel(a.score).cls.split(" ")[0]}`}>{ratingLabel(a.score).text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      {cr.attachments.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Attachments ({cr.attachments.length})</p>
            <div className="space-y-1.5">
              {cr.attachments.map((att) => (
                <a key={att.id} href={`/api/attachments/download?path=${encodeURIComponent(att.file_path)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-700 truncate font-medium">{att.file_name}</span>
                    {att.file_size && <span className="text-xs text-slate-400 shrink-0">{formatFileSize(att.file_size)}</span>}
                  </div>
                  <span className="text-xs text-blue-600 shrink-0">Download</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Team Evaluations */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Team Evaluations ({data.evaluations.length})</p>
        {data.evaluations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No evaluations submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {data.evaluations.map((ev) => (
              <div key={ev.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{ev.evaluator_name}</p>
                      {ev.evaluator_team && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{ev.evaluator_team}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{ev.evaluator_email}</p>
                    {ev.submitted_at && <p className="text-xs text-muted-foreground">{formatDate(ev.submitted_at)}</p>}
                  </div>
                  {ev.average_score !== null && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-base font-bold"><Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /><span>{ev.average_score.toFixed(1)}</span></div>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <ScoreBox label="Conflict of Content" score={ev.conflict_of_content_score} comment={ev.conflict_of_content_comment} />
                  <ScoreBox label="Characterization" score={ev.characterization_score} comment={ev.characterization_comment} />
                  <ScoreBox label="Story Progression" score={ev.story_progression_score} comment={ev.story_progression_comment} />
                  <ScoreBox label="What's Next Element" score={ev.whats_next_element_score} comment={ev.whats_next_element_comment} />
                  <div className="col-span-2">
                    <ScoreBox label="Overall Oneliner Grade" score={ev.overall_oneliner_grade_score} comment={ev.overall_oneliner_grade_comment} />
                  </div>
                </div>
                {(ev.big_idea || ev.theme) && (
                  <div className="flex gap-4 text-xs">
                    {ev.big_idea && <div><span className="font-medium text-slate-700">Big Idea:</span><span className="text-slate-600 ml-1">{ev.big_idea}</span></div>}
                    {ev.theme && <div><span className="font-medium text-slate-700">Theme:</span><span className="text-slate-600 ml-1">{ev.theme}</span></div>}
                  </div>
                )}
                {ev.comments && (
                  <div className="bg-slate-50 rounded p-2 text-xs">
                    <p className="font-medium text-slate-700 mb-0.5">Comments</p>
                    <p className="text-slate-600">{ev.comments}</p>
                  </div>
                )}
                {ev.decision && (
                  <div className="flex items-center gap-2">
                    <Badge variant={ev.decision === "approve" ? "default" : ev.decision === "reject" ? "destructive" : "secondary"} className="text-xs">
                      {ev.decision === "approve" ? "Approved" : ev.decision === "reject" ? "Rejected" : "Needs Improvement"}
                    </Badge>
                    {ev.decision_notes && <span className="text-xs text-muted-foreground">{ev.decision_notes}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />
      <ContentRevisions entityId={cr.id} apiBasePath="/api/call-reports" storageBucket="attachments" canEdit={false} userRole={userRole || "management"} evaluateUrl="/management/evaluate/call-report" entityType="call-report" />
      <Separator />
      <CallReportDiscussion callReportId={cr.id} currentUserId={userId} currentUserRole={userRole} />
    </div>
  );
}

// ── Episode Review Dialog Content ────────────────────────────────────────────

function EpReviewContent({ data, userId, userRole }: { data: EpReviewData; userId: string; userRole: string }) {
  const ep = data.episode;
  return (
    <div className="space-y-5">
      <div className="space-y-2 text-sm">
        {ep.call_report_id && <Badge variant="outline" className="font-mono text-xs">{ep.call_report_id}</Badge>}
        {ep.call_report_title && <div><span className="font-medium text-slate-700">Drama:</span><span className="text-slate-600 ml-1">{ep.call_report_title}</span></div>}
        {ep.logged_by_name && <div><span className="font-medium text-slate-700">Logged By:</span><span className="text-slate-600 ml-1">{ep.logged_by_name}</span></div>}
        {ep.approval_status && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Status:</span>
            <Badge variant="outline" className={`text-xs ${STATUS_BADGE[ep.approval_status]?.className || ""}`}>
              {STATUS_BADGE[ep.approval_status]?.label || ep.approval_status}
            </Badge>
            {ep.approved_at && <span className="text-xs text-slate-500">{formatDate(ep.approved_at)}</span>}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Episodic Evaluations ({data.evaluations.length})</p>
        {data.evaluations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No evaluations submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {data.evaluations.map((ev) => (
              <div key={ev.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{ev.evaluator_name}</p>
                      {ev.evaluator_team && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{ev.evaluator_team}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{ev.evaluator_email}</p>
                    {ev.created_at && <p className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</p>}
                  </div>
                  {ev.overall_average !== null && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-base font-bold"><Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /><span>{ev.overall_average.toFixed(1)}</span></div>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  )}
                </div>
                {(ev.no_of_pages !== null || ev.no_of_scenes !== null) && (
                  <div className="flex gap-4 text-xs text-slate-600">
                    {ev.no_of_pages !== null && <span><span className="font-medium">Pages:</span> {ev.no_of_pages}</span>}
                    {ev.no_of_scenes !== null && <span><span className="font-medium">Scenes:</span> {ev.no_of_scenes}</span>}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <ScoreBox label="Conflict of Content" score={ev.conflict_of_content_score} comment={ev.conflict_of_content_comment} />
                  <ScoreBox label="Characterization" score={ev.characterization_score} comment={ev.characterization_comment} />
                  <ScoreBox label="Story Progression" score={ev.story_progression_score} comment={ev.story_progression_comment} />
                  <ScoreBox label="Main Event" score={ev.main_event_score} comment={ev.main_event_comment} />
                  <ScoreBox label="Small Event" score={ev.small_event_score} comment={ev.small_event_comment} />
                  <ScoreBox label="Dragness" score={ev.dragness_score} comment={ev.dragness_comment} />
                  <ScoreBox label="Freezes" score={ev.freezes_score} comment={ev.freezes_comment} />
                  <ScoreBox label="What's Next Element" score={ev.whats_next_element_score} comment={ev.whats_next_element_comment} />
                  <div className="col-span-2">
                    <ScoreBox label="Overall Assessment" score={ev.overall_assessment_score} comment={ev.overall_assessment_comment} />
                  </div>
                </div>
                {ev.freeze_ending_scene && (
                  <div className="text-xs"><span className="font-medium text-slate-700">Freeze Ending Scene:</span><p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{ev.freeze_ending_scene}</p></div>
                )}
                {ev.summary_analysis && (
                  <div className="bg-slate-50 rounded p-2 text-xs"><p className="font-medium text-slate-700 mb-0.5">Summary Analysis</p><p className="text-slate-600 whitespace-pre-wrap">{ev.summary_analysis}</p></div>
                )}
                {ev.remarks && (
                  <div className="bg-slate-50 rounded p-2 text-xs"><p className="font-medium text-slate-700 mb-0.5">Remarks</p><p className="text-slate-600">{ev.remarks}</p></div>
                )}
                {ev.events && ev.events.length > 0 && (
                  <div className="text-xs">
                    <p className="font-medium text-slate-700 mb-1">Events</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      {ev.events.map((evt, i) => <li key={i}>{evt}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
