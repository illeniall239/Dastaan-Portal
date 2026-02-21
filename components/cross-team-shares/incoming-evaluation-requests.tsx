"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, Inbox, Film, FileText, Share2, CheckCircle2, FilePenLine } from "lucide-react";
import Link from "next/link";

interface SharedEpisode {
  id: string;
  episode_id: string;
  revision_id: string | null;
  episode: {
    id: string;
    episode_number: number;
    title: string | null;
    call_report_id: string | null;
  } | null;
}

interface SharedCRRevision {
  call_report_revision_id: string;
  revision: {
    id: string;
    revision_number: number;
    attachment_name: string | null;
    comment: string | null;
  };
}

interface IncomingShare {
  id: string;
  status: string;
  shared_at: string;
  notes: string | null;
  completed_evaluations: number;
  required_evaluations: number;
  call_report: {
    id: string;
    call_report_id: string;
    working_title: string;
  } | null;
  from_team: { id: string; name: string } | null;
  to_team: { id: string; name: string } | null;
  shared_episodes: SharedEpisode[];
  sharedCallReportRevisions: SharedCRRevision[];
  currentUserHasEvaluated: boolean;
  myEvaluatedEpisodeIds: string[];
  myEvaluatedCRRevisionIds: string[];
  myEvaluatedEpisodeRevisionKeys: string[]; // "episodeId|revisionId"
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

interface IncomingEvaluationRequestsProps {
  portalPrefix: string;
  showEpisodeEvaluate?: boolean;
}

export function IncomingEvaluationRequests({
  portalPrefix,
  showEpisodeEvaluate = true,
}: IncomingEvaluationRequestsProps) {
  const [shares, setShares] = useState<IncomingShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch(`/api/cross-team-shares?direction=received&_t=${Date.now()}`)
      .then(r => r.json())
      .then(data => setShares(Array.isArray(data) ? data : []))
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
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No incoming evaluation requests</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            When another team requests your team&apos;s evaluation of a one liner or episodes, it will appear here.
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
          {filtered.map(share => {
            const isCompleted = share.status === "completed" || share.status === "cancelled";

            // Separate base episodes from episode revision rows
            type EpData = NonNullable<SharedEpisode["episode"]>;
            const baseEpisodeRows = share.shared_episodes.filter(se => !se.revision_id);
            const epRevisionRows = share.shared_episodes.filter(se => !!se.revision_id);

            // Unique episode data from base rows (for group headers)
            const baseEpisodeList: EpData[] = baseEpisodeRows
              .map(se => se.episode)
              .filter((ep): ep is EpData => ep !== null);

            // Group episode revision rows by episode_id for easy lookup
            const epRevisionsByEpisodeId: Record<string, SharedEpisode[]> = {};
            for (const row of epRevisionRows) {
              if (!row.episode_id) continue;
              if (!epRevisionsByEpisodeId[row.episode_id]) epRevisionsByEpisodeId[row.episode_id] = [];
              epRevisionsByEpisodeId[row.episode_id].push(row);
            }

            // Episode revision rows whose episode has no base row (standalone revision shares)
            const standaloneRevisionEpisodeIds = new Set(
              epRevisionRows
                .filter(r => !baseEpisodeRows.some(b => b.episode_id === r.episode_id))
                .map(r => r.episode_id)
            );

            return (
              <Card key={share.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">
                        {share.call_report?.working_title || "Episode Evaluation Request"}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span>From: <strong>{share.from_team?.name || "—"}</strong></span>
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

                <CardContent className="space-y-3 pt-0">
                  {/* Notes */}
                  {share.notes && (
                    <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded p-3">
                      <span className="font-medium text-blue-700">Note from requesting team:</span> {share.notes}
                    </div>
                  )}

                  {/* Call report base evaluate */}
                  {share.call_report && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {share.call_report.working_title}
                            </p>
                            <p className="text-xs text-muted-foreground">{share.call_report.call_report_id}</p>
                          </div>
                        </div>
                        <div className="ml-3 shrink-0 flex items-center gap-2">
                          {share.currentUserHasEvaluated ? (
                            <>
                              <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Submitted
                              </Badge>
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/${portalPrefix}/evaluate/${share.call_report?.id}?crossTeamShareId=${share.id}&evaluated=1`}>
                                  View
                                </Link>
                              </Button>
                            </>
                          ) : !isCompleted ? (
                            <Button asChild size="sm">
                              <Link href={`/${portalPrefix}/evaluate/${share.call_report?.id}?crossTeamShareId=${share.id}`}>
                                Evaluate
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {/* Call report revisions */}
                      {(share.sharedCallReportRevisions || []).map(cr => {
                        const alreadyEval = (share.myEvaluatedCRRevisionIds || []).includes(cr.call_report_revision_id);
                        return (
                          <div
                            key={cr.call_report_revision_id}
                            className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 border ml-4"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FilePenLine className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <p className="text-sm text-slate-700">
                                Revision {cr.revision.revision_number}
                                {cr.revision.attachment_name && (
                                  <span className="text-slate-400 font-normal"> — {cr.revision.attachment_name}</span>
                                )}
                              </p>
                            </div>
                            <div className="ml-3 shrink-0 flex items-center gap-2">
                              {alreadyEval ? (
                                <>
                                  <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100 gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Submitted
                                  </Badge>
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={`/${portalPrefix}/evaluate/${share.call_report?.id}?crossTeamShareId=${share.id}&revision_id=${cr.call_report_revision_id}&evaluated=1`}>
                                      View
                                    </Link>
                                  </Button>
                                </>
                              ) : !isCompleted ? (
                                <Button asChild size="sm">
                                  <Link href={`/${portalPrefix}/evaluate/${share.call_report?.id}?crossTeamShareId=${share.id}&revision_id=${cr.call_report_revision_id}`}>
                                    Evaluate
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Episodes section */}
                  {(baseEpisodeList.length > 0 || standaloneRevisionEpisodeIds.size > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Film className="h-3.5 w-3.5 text-purple-500" />
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                          Attached Episodes
                        </p>
                      </div>

                      {/* Episodes with base row (+ their revision sub-rows) */}
                      {baseEpisodeList.map(ep => (
                        <div key={ep.id} className="space-y-1.5">
                          {/* Base episode row */}
                          {showEpisodeEvaluate && (
                            <div className="flex items-center justify-between bg-purple-50 rounded-lg p-3 border border-purple-100">
                              <div className="flex items-center gap-2">
                                <Film className="h-4 w-4 text-purple-400 shrink-0" />
                                <p className="text-sm text-purple-900">
                                  Episode {ep.episode_number}
                                  {ep.title && (
                                    <span className="font-normal text-purple-600"> — {ep.title}</span>
                                  )}
                                </p>
                              </div>
                              <div className="ml-3 shrink-0 flex items-center gap-2">
                                {share.myEvaluatedEpisodeIds.includes(ep.id) ? (
                                  <>
                                    <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100 gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> Submitted
                                    </Badge>
                                    <Button asChild size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-100">
                                      <Link href={`/${portalPrefix}/episodes/${ep.id}?crossTeamShareId=${share.id}&evaluated=1`}>
                                        View
                                      </Link>
                                    </Button>
                                  </>
                                ) : !isCompleted ? (
                                  <Button asChild size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-100">
                                    <Link href={`/${portalPrefix}/episodes/${ep.id}?crossTeamShareId=${share.id}`}>
                                      Evaluate
                                    </Link>
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          )}

                          {/* Episode revision rows */}
                          {showEpisodeEvaluate && (epRevisionsByEpisodeId[ep.id] || []).map(row => {
                            const revisionKey = `${ep.id}|${row.revision_id}`;
                            const alreadyEval = (share.myEvaluatedEpisodeRevisionKeys || []).includes(revisionKey);
                            return (
                              <div
                                key={row.id}
                                className="flex items-center justify-between bg-purple-50 rounded-lg p-2.5 border border-purple-100 ml-4"
                              >
                                <div className="flex items-center gap-2">
                                  <FilePenLine className="h-3.5 w-3.5 text-purple-300 shrink-0" />
                                  <p className="text-sm text-purple-800">
                                    Episode {ep.episode_number} — Revision
                                    {row.episode?.title && (
                                      <span className="font-normal text-purple-500"> ({row.episode.title})</span>
                                    )}
                                  </p>
                                </div>
                                <div className="ml-3 shrink-0 flex items-center gap-2">
                                  {alreadyEval ? (
                                    <>
                                      <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100 gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Submitted
                                      </Badge>
                                      <Button asChild size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-100">
                                        <Link href={`/${portalPrefix}/episodes/${ep.id}?crossTeamShareId=${share.id}&revision_id=${row.revision_id}&evaluated=1`}>
                                          View
                                        </Link>
                                      </Button>
                                    </>
                                  ) : !isCompleted ? (
                                    <Button asChild size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-100">
                                      <Link href={`/${portalPrefix}/episodes/${ep.id}?crossTeamShareId=${share.id}&revision_id=${row.revision_id}`}>
                                        Evaluate
                                      </Link>
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      {/* Standalone episode revision rows (episode shared as revision-only, no base) */}
                      {Array.from(standaloneRevisionEpisodeIds).map(epId => {
                        const rows = epRevisionsByEpisodeId[epId] || [];
                        const firstEp = rows[0]?.episode;
                        return rows.map(row => {
                          const revisionKey = `${epId}|${row.revision_id}`;
                          const alreadyEval = (share.myEvaluatedEpisodeRevisionKeys || []).includes(revisionKey);
                          return (
                            <div
                              key={row.id}
                              className="flex items-center justify-between bg-purple-50 rounded-lg p-3 border border-purple-100"
                            >
                              <div className="flex items-center gap-2">
                                <FilePenLine className="h-4 w-4 text-purple-400 shrink-0" />
                                <p className="text-sm text-purple-900">
                                  {firstEp ? `Episode ${firstEp.episode_number}` : 'Episode'}
                                  {firstEp?.title && <span className="font-normal text-purple-600"> — {firstEp.title}</span>}
                                  <span className="text-purple-500 text-xs ml-1">(Revision)</span>
                                </p>
                              </div>
                              {showEpisodeEvaluate && (
                                <div className="ml-3 shrink-0 flex items-center gap-2">
                                  {alreadyEval ? (
                                    <>
                                      <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100 gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Submitted
                                      </Badge>
                                      <Button asChild size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-100">
                                        <Link href={`/${portalPrefix}/episodes/${epId}?crossTeamShareId=${share.id}&revision_id=${row.revision_id}&evaluated=1`}>
                                          View
                                        </Link>
                                      </Button>
                                    </>
                                  ) : !isCompleted ? (
                                    <Button asChild size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-100">
                                      <Link href={`/${portalPrefix}/episodes/${epId}?crossTeamShareId=${share.id}&revision_id=${row.revision_id}`}>
                                        Evaluate
                                      </Link>
                                    </Button>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })}
                    </div>
                  )}

                  {/* Completed state */}
                  {isCompleted && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 border rounded-lg p-3">
                      <Share2 className="h-3.5 w-3.5" />
                      <span>
                        {share.status === "completed"
                          ? `Evaluation complete — ${share.completed_evaluations} evaluations submitted`
                          : "This request has been cancelled"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
