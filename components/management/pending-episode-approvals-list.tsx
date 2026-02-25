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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  FileVideo,
  Star,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { DiscussionThread } from "@/components/call-reports/call-report-discussion";
import { ContentRevisions } from "@/components/ui/content-revisions";
import { formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EpisodeQueueItem {
  id: string;
  episodeNumber: number;
  title: string | null;
  callReportTitle: string;
  callReportDisplayId: string;
  evaluationCount: number;
  averageScore: number | null;
  lastEvaluatedAt: string;
  discussionCount: number;
  approvalStatus: "approved" | "rejected" | "needs_revision" | null;
  approvedAt: string | null;
}

interface ReviewEvaluation {
  id: string;
  evaluator_name: string;
  evaluator_email: string;
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

interface ReviewData {
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
  evaluations: ReviewEvaluation[];
}

interface PendingEpisodeApprovalsListProps {
  userId: string;
  userRole: string;
}

interface ProjectGroup {
  key: string;
  callReportTitle: string;
  callReportDisplayId: string;
  pendingEpisodes: EpisodeQueueItem[];
  reviewedEpisodes: EpisodeQueueItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string; borderLeft: string }> = {
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 border-green-300",
    borderLeft: "border-l-green-500",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border-red-300",
    borderLeft: "border-l-red-500",
  },
  needs_revision: {
    label: "Needs Revision",
    className: "bg-amber-100 text-amber-800 border-amber-300",
    borderLeft: "border-l-amber-500",
  },
};

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupByProject(
  pending: EpisodeQueueItem[],
  reviewed: EpisodeQueueItem[]
): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();

  const addEp = (ep: EpisodeQueueItem, isPending: boolean) => {
    const key = ep.callReportDisplayId || ep.callReportTitle || "unknown";
    if (!map.has(key)) {
      map.set(key, {
        key,
        callReportTitle: ep.callReportTitle || "Untitled Drama",
        callReportDisplayId: ep.callReportDisplayId,
        pendingEpisodes: [],
        reviewedEpisodes: [],
      });
    }
    const group = map.get(key)!;
    if (isPending) {
      group.pendingEpisodes.push(ep);
    } else {
      group.reviewedEpisodes.push(ep);
    }
  };

  for (const ep of pending) addEp(ep, true);
  for (const ep of reviewed) addEp(ep, false);

  for (const group of map.values()) {
    group.pendingEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    group.reviewedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  // Projects with pending episodes come first
  return Array.from(map.values()).sort(
    (a, b) => b.pendingEpisodes.length - a.pendingEpisodes.length
  );
}

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
      {comment && (
        <p className="text-xs text-muted-foreground mt-1 italic">{comment}</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PendingEpisodeApprovalsList({
  userId,
  userRole,
}: PendingEpisodeApprovalsListProps) {
  const [pending, setPending] = useState<EpisodeQueueItem[]>([]);
  const [reviewed, setReviewed] = useState<EpisodeQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");

  const [selectedEp, setSelectedEp] = useState<EpisodeQueueItem | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/management/episode-approval-queue?_t=${Date.now()}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setPending(data.episodes || []);
      setReviewed(data.reviewedEpisodes || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load episode queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleReview = async (ep: EpisodeQueueItem) => {
    setSelectedEp(ep);
    setReviewData(null);
    setLoadingReview(true);
    try {
      const res = await fetch(`/api/management/episode-review?id=${ep.id}`);
      const data = await res.json();
      if (res.ok) setReviewData(data);
    } catch {
      // non-fatal
    } finally {
      setLoadingReview(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedEp(null);
      setReviewData(null);
      fetchQueue();
    }
  };

  const matchesSearch = (ep: EpisodeQueueItem) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      `ep${ep.episodeNumber}`.includes(q) ||
      (ep.title || "").toLowerCase().includes(q) ||
      ep.callReportTitle.toLowerCase().includes(q) ||
      ep.callReportDisplayId.toLowerCase().includes(q)
    );
  };

  const filteredPending = pending.filter(matchesSearch);
  const filteredReviewed = reviewed.filter((ep) => {
    if (!matchesSearch(ep)) return false;
    if (decisionFilter !== "all" && ep.approvalStatus !== decisionFilter)
      return false;
    return true;
  });

  const projectGroups = groupByProject(filteredPending, filteredReviewed).filter(
    (g) => g.pendingEpisodes.length > 0 || g.reviewedEpisodes.length > 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval Tracking</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Episodes evaluated by the team, grouped by drama
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchQueue}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by drama title, episode number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={decisionFilter} onValueChange={setDecisionFilter}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Filter by decision" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Decisions</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="needs_revision">Needs Revision</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty states */}
      {pending.length === 0 && reviewed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <FileVideo className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No episodes to review</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Episodes with submitted evaluations will appear here for your approval.
            </p>
          </CardContent>
        </Card>
      ) : projectGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No matches</h3>
            <p className="text-sm text-muted-foreground text-center">
              No episodes match your search or filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projectGroups.map((group) => (
            <ProjectCard
              key={group.key}
              group={group}
              userId={userId}
              userRole={userRole}
              onReview={handleReview}
            />
          ))}
        </div>
      )}

      {/* Evaluations Review Dialog */}
      <Dialog open={!!selectedEp} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedEp
                ? `EP${selectedEp.episodeNumber}${selectedEp.title ? ` — ${selectedEp.title}` : ""}`
                : ""}
            </DialogTitle>
          </DialogHeader>

          {loadingReview ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviewData ? (
            <div className="space-y-5">
              <div className="space-y-2 text-sm">
                {reviewData.episode.call_report_id && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {reviewData.episode.call_report_id}
                  </Badge>
                )}
                {reviewData.episode.call_report_title && (
                  <div>
                    <span className="font-medium text-slate-700">Drama:</span>
                    <span className="text-slate-600 ml-1">
                      {reviewData.episode.call_report_title}
                    </span>
                  </div>
                )}
                {reviewData.episode.logged_by_name && (
                  <div>
                    <span className="font-medium text-slate-700">Logged By:</span>
                    <span className="text-slate-600 ml-1">
                      {reviewData.episode.logged_by_name}
                    </span>
                  </div>
                )}
                {reviewData.episode.approval_status && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">Status:</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        STATUS_BADGE[reviewData.episode.approval_status]
                          ?.className || ""
                      }`}
                    >
                      {STATUS_BADGE[reviewData.episode.approval_status]?.label ||
                        reviewData.episode.approval_status}
                    </Badge>
                    {reviewData.episode.approved_at && (
                      <span className="text-xs text-slate-500">
                        {formatDate(reviewData.episode.approved_at)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  Episodic Evaluations ({reviewData.evaluations.length})
                </p>
                {reviewData.evaluations.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No evaluations submitted yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reviewData.evaluations.map((ev) => (
                      <div
                        key={ev.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {ev.evaluator_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ev.evaluator_email}
                            </p>
                            {ev.created_at && (
                              <p className="text-xs text-muted-foreground">
                                {formatDate(ev.created_at)}
                              </p>
                            )}
                          </div>
                          {ev.overall_average !== null && (
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-base font-bold">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span>{ev.overall_average.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Avg Score
                              </p>
                            </div>
                          )}
                        </div>
                        {(ev.no_of_pages !== null || ev.no_of_scenes !== null) && (
                          <div className="flex gap-4 text-xs text-slate-600">
                            {ev.no_of_pages !== null && (
                              <span>
                                <span className="font-medium">Pages:</span>{" "}
                                {ev.no_of_pages}
                              </span>
                            )}
                            {ev.no_of_scenes !== null && (
                              <span>
                                <span className="font-medium">Scenes:</span>{" "}
                                {ev.no_of_scenes}
                              </span>
                            )}
                          </div>
                        )}
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
                            label="Main Event"
                            score={ev.main_event_score}
                            comment={ev.main_event_comment}
                          />
                          <ScoreBox
                            label="Small Event"
                            score={ev.small_event_score}
                            comment={ev.small_event_comment}
                          />
                          <ScoreBox
                            label="Dragness"
                            score={ev.dragness_score}
                            comment={ev.dragness_comment}
                          />
                          <ScoreBox
                            label="Freezes"
                            score={ev.freezes_score}
                            comment={ev.freezes_comment}
                          />
                          <ScoreBox
                            label="What's Next Element"
                            score={ev.whats_next_element_score}
                            comment={ev.whats_next_element_comment}
                          />
                          <div className="col-span-2">
                            <ScoreBox
                              label="Overall Assessment"
                              score={ev.overall_assessment_score}
                              comment={ev.overall_assessment_comment}
                            />
                          </div>
                        </div>
                        {ev.freeze_ending_scene && (
                          <div className="text-xs">
                            <span className="font-medium text-slate-700">
                              Freeze Ending Scene:
                            </span>
                            <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">
                              {ev.freeze_ending_scene}
                            </p>
                          </div>
                        )}
                        {ev.summary_analysis && (
                          <div className="bg-slate-50 rounded p-2 text-xs">
                            <p className="font-medium text-slate-700 mb-0.5">
                              Summary Analysis
                            </p>
                            <p className="text-slate-600 whitespace-pre-wrap">
                              {ev.summary_analysis}
                            </p>
                          </div>
                        )}
                        {ev.remarks && (
                          <div className="bg-slate-50 rounded p-2 text-xs">
                            <p className="font-medium text-slate-700 mb-0.5">
                              Remarks
                            </p>
                            <p className="text-slate-600">{ev.remarks}</p>
                          </div>
                        )}
                        {ev.events && ev.events.length > 0 && (
                          <div className="text-xs">
                            <p className="font-medium text-slate-700 mb-1">
                              Events
                            </p>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                              {ev.events.map((evt, i) => (
                                <li key={i}>{evt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  group,
  userId,
  userRole,
  onReview,
}: {
  group: ProjectGroup;
  userId: string;
  userRole: string;
  onReview: (ep: EpisodeQueueItem) => void;
}) {
  const totalEpisodes =
    group.pendingEpisodes.length + group.reviewedEpisodes.length;
  const pendingCount = group.pendingEpisodes.length;

  return (
    <Card className="overflow-hidden">
      {/* Project header */}
      <div className="px-5 py-4 border-b bg-slate-50">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-900 flex-1 min-w-0 truncate">
            {group.callReportTitle}
          </h2>
          {group.callReportDisplayId && (
            <Badge variant="outline" className="text-xs font-mono shrink-0">
              {group.callReportDisplayId}
            </Badge>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs">
              {totalEpisodes} ep{totalEpisodes !== 1 ? "s" : ""}
            </Badge>
            {pendingCount > 0 && (
              <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
                {pendingCount} pending
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Episode sub-cards */}
      <CardContent className="p-3 space-y-2">
        {group.pendingEpisodes.map((ep) => (
          <EpisodeSubCard
            key={ep.id}
            ep={ep}
            userId={userId}
            userRole={userRole}
            onReview={onReview}
          />
        ))}

        {group.pendingEpisodes.length > 0 && group.reviewedEpisodes.length > 0 && (
          <div className="pt-1 pb-1">
            <p className="text-xs text-slate-400 font-medium px-1">Decided</p>
          </div>
        )}

        {group.reviewedEpisodes.map((ep) => (
          <EpisodeSubCard
            key={ep.id}
            ep={ep}
            userId={userId}
            userRole={userRole}
            onReview={onReview}
            reviewed
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ── Episode Sub-Card ──────────────────────────────────────────────────────────

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
    <div
      className={`rounded-lg border bg-white transition-all ${
        reviewed && statusInfo ? `border-l-4 ${statusInfo.borderLeft}` : ""
      }`}
    >
      {/* Row — always visible */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Chevron toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Episode info — clicking also toggles */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-800">{epLabel}</span>
            {statusInfo && (
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${statusInfo.className}`}
              >
                {statusInfo.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
            {ep.evaluationCount > 0 && (
              <span>
                {ep.evaluationCount} eval{ep.evaluationCount !== 1 ? "s" : ""}
              </span>
            )}
            {ep.averageScore !== null && (
              <span className={`font-semibold ${scoreColor(ep.averageScore)}`}>
                Avg {ep.averageScore.toFixed(1)}
              </span>
            )}
            {ep.lastEvaluatedAt && !reviewed && (
              <span>Evaluated {timeAgo(ep.lastEvaluatedAt)}</span>
            )}
            {reviewed && ep.approvedAt && (
              <span>
                Decided{" "}
                {formatDistanceToNow(new Date(ep.approvedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/management/evaluate/episode/${ep.id}`}>Evaluate</Link>
          </Button>
          <Button size="sm" onClick={() => onReview(ep)}>
            {reviewed ? "View" : "Review"}
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-4 space-y-5 bg-slate-50/50">
          <ContentRevisions
            entityId={ep.id}
            apiBasePath="/api/episodes"
            storageBucket="episodes"
            canEdit={false}
            userRole={userRole}
            evaluateUrl="/management/evaluate/episode"
            entityType="episode"
          />
          <Separator />
          <DiscussionThread
            entityId={ep.id}
            apiBasePath="/api/episodes"
            currentUserId={userId}
            currentUserRole={userRole}
            compact={true}
            defaultExpanded={true}
            title="Episode Feedback"
          />
        </div>
      )}
    </div>
  );
}
