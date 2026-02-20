"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Minus,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Loader2,
  Share2,
} from "lucide-react";

interface EpisodeResult {
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string | null;
  avgScore: number | null;
  overallDecision: string | null;
  decisionCounts: Record<string, number>;
  comments: { text: string; submittedAt: string }[];
  evaluationCount: number;
}

interface EnrichedShare {
  id: string;
  status: string;
  shared_at: string;
  completed_evaluations: number;
  required_evaluations: number;
  notes: string | null;
  avgScore: number | null;
  overallDecision: string | null;
  decisionCounts: Record<string, number>;
  comments: { text: string; submittedAt: string }[];
  episodicResults: EpisodeResult[];
  call_report: { id: string; call_report_id: string; working_title: string; logline: string | null } | null;
  from_team: { id: string; name: string } | null;
  to_team: { id: string; name: string } | null;
}

function getStatusBadge(status: string) {
  const map: Record<string, { className: string; label: string }> = {
    pending: { className: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pending" },
    in_progress: { className: "bg-blue-100 text-blue-800 border-blue-200", label: "In Progress" },
    completed: { className: "bg-green-100 text-green-800 border-green-200", label: "Completed" },
    cancelled: { className: "bg-gray-100 text-gray-800 border-gray-200", label: "Cancelled" },
  };
  const v = map[status] || map.pending;
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

function getDecisionBadge(decision: string | null) {
  if (!decision) return <Badge variant="outline" className="bg-gray-100 text-gray-500">Pending</Badge>;
  if (decision === "approve") return <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
  if (decision === "reject") return <Badge className="bg-red-100 text-red-800 border border-red-300 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100"><Minus className="h-3 w-3 mr-1" />Needs Improvement</Badge>;
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">No score yet</span>;
  const color = score >= 7 ? "text-green-600" : score >= 5 ? "text-amber-600" : "text-red-600";
  const Icon = score >= 7 ? TrendingUp : score >= 5 ? Minus : TrendingDown;
  return (
    <div className={`flex items-center gap-1.5 font-bold text-2xl ${color}`}>
      <Icon className="h-5 w-5" />
      {score.toFixed(1)}<span className="text-sm font-normal text-gray-400">/10</span>
    </div>
  );
}

function CommentsSection({ comments }: { comments: { text: string; submittedAt: string }[] }) {
  if (comments.length === 0) {
    return <p className="text-xs text-gray-400 italic">No comments provided.</p>;
  }
  return (
    <div className="space-y-2">
      {comments.map((c, i) => (
        <div key={i} className="bg-gray-50 rounded-md p-3 border-l-2 border-gray-300">
          <p className="text-sm text-gray-700">{c.text}</p>
          <p className="text-xs text-gray-400 mt-1">
            {format(new Date(c.submittedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      ))}
    </div>
  );
}

export function RequestedEvaluationsView() {
  const [shares, setShares] = useState<EnrichedShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch(`/api/cross-team-shares/results?_t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        setShares(Array.isArray(data) ? data : []);
      })
      .catch(() => setShares([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return shares;
    return shares.filter(s => s.status === statusFilter);
  }, [shares, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No evaluation requests yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Use the &ldquo;Request Evaluation&rdquo; button on a writer engagement report or episode to ask another team for their evaluation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {shares.length} requests
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No requests match this filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(share => (
            <Card key={share.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {share.call_report?.working_title || "Episode Evaluation Request"}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {share.call_report?.call_report_id && (
                        <span>ID: {share.call_report.call_report_id}</span>
                      )}
                      <span>To: <strong>{share.to_team?.name || "—"}</strong></span>
                      <span>{format(new Date(share.shared_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(share.status)}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {share.completed_evaluations}/{share.required_evaluations} evals
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Results section — only shown if there are any evaluations */}
                {share.completed_evaluations > 0 && (
                  <>
                    {/* Call report evaluation results */}
                    {(share.avgScore !== null || share.overallDecision !== null || share.comments.length > 0) && (
                      <div className="bg-slate-50 rounded-lg p-4 border space-y-3">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Evaluation Results
                        </p>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
                            <ScoreDisplay score={share.avgScore} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Decision</p>
                            {getDecisionBadge(share.overallDecision)}
                          </div>
                        </div>

                        {share.comments.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                              <p className="text-xs font-medium text-slate-600">Comments</p>
                            </div>
                            <CommentsSection comments={share.comments} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Episodic evaluation results */}
                    {share.episodicResults.length > 0 && share.episodicResults.some(ep => ep.evaluationCount > 0) && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Episode Results
                        </p>
                        {share.episodicResults
                          .filter(ep => ep.evaluationCount > 0)
                          .map(ep => (
                            <div key={ep.episodeId} className="bg-purple-50 rounded-lg p-4 border border-purple-100 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-purple-900">
                                  Episode {ep.episodeNumber}
                                  {ep.episodeTitle && <span className="font-normal text-purple-700"> — {ep.episodeTitle}</span>}
                                </p>
                                <span className="text-xs text-purple-500">{ep.evaluationCount} eval{ep.evaluationCount !== 1 ? "s" : ""}</span>
                              </div>
                              <div className="flex items-center gap-6">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
                                  <ScoreDisplay score={ep.avgScore} />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Decision</p>
                                  {getDecisionBadge(ep.overallDecision)}
                                </div>
                              </div>
                              {ep.comments.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                                    <p className="text-xs font-medium text-purple-700">Comments</p>
                                  </div>
                                  <CommentsSection comments={ep.comments} />
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}

                {/* Pending state — no evaluations yet */}
                {share.completed_evaluations === 0 && share.status !== "cancelled" && (
                  <div className="bg-gray-50 rounded-lg p-4 border text-center">
                    <p className="text-sm text-muted-foreground">
                      Waiting for {share.to_team?.name || "the other team"} to submit evaluations.
                    </p>
                  </div>
                )}

                {/* Notes from request */}
                {share.notes && (
                  <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded p-3">
                    <span className="font-medium text-blue-700">Request note:</span> {share.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
