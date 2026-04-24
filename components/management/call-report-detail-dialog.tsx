"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, Phone, MapPin, Target, Lightbulb, Eye, Paperclip, Film, Loader2, ClipboardCheck, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ContentRevisions } from "@/components/ui/content-revisions";

interface CallReportDetailDialogProps {
  report: any | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions
const formatDate = (date: string | null) => {
  if (!date) return "Not set";
  try {
    return format(new Date(date), "PPP");
  } catch {
    return "Invalid date";
  }
};

const formatDateTime = (date: string | null) => {
  if (!date) return "Not set";
  try {
    return format(new Date(date), "PPP 'at' p");
  } catch {
    return "Invalid date";
  }
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'external_producer': 'External Producer',
    'writer_pitch': 'Writer Pitch',
    'inhouse_content': 'In-house Content',
    'content_head_initiative': 'Content Head Initiative',
    'given_by_management': 'Given by Management'
  };
  return labels[category] || category;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    ready_for_evaluation: "bg-blue-100 text-blue-700 border-blue-200",
    in_review: "bg-yellow-100 text-yellow-700 border-yellow-200",
    approved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };
  return colors[status] || "bg-slate-100 text-slate-700 border-slate-200";
};

// ── helpers for the eval section ──────────────────────────────────────────
function evalTypeLabel(type: string) {
  if (type === 'management') return 'Management';
  if (type === 'programmer') return 'Programmer';
  return 'Evaluator';
}
function evalTypeBadgeClass(type: string) {
  if (type === 'management') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (type === 'programmer') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}
function decisionBadgeClass(decision: string | null) {
  if (decision === 'approve') return 'bg-green-100 text-green-700 border-green-200';
  if (decision === 'reject') return 'bg-red-100 text-red-700 border-red-200';
  if (decision === 'needs_improvement') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600';
}
function decisionLabel(decision: string | null) {
  if (decision === 'approve') return 'Approve';
  if (decision === 'reject') return 'Reject';
  if (decision === 'needs_improvement') return 'Needs Improvement';
  return null;
}
function scoreColor(score: number | null) {
  if (!score) return 'text-slate-500';
  if (score >= 7) return 'text-green-700 font-semibold';
  if (score >= 5) return 'text-amber-700 font-semibold';
  return 'text-red-700 font-semibold';
}

interface EvalGroup {
  label: string;       // "Original" | "Revision N"
  revisionId: string | null;
  items: any[];
}

function EvalGroupPanel({ group, showDecision }: { group: EvalGroup; showDecision?: boolean }) {
  const [open, setOpen] = useState(true);
  const avg = group.items.length
    ? (group.items.reduce((s, e) => s + (e.average_score || e.overall_average || 0), 0) / group.items.length).toFixed(1)
    : null;
  return (
    <div className="border rounded-md overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2 font-medium text-slate-700">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {group.label}
          <Badge variant="outline" className="text-xs font-normal">{group.items.length} eval{group.items.length !== 1 ? 's' : ''}</Badge>
          {avg && <span className={`text-xs ${scoreColor(parseFloat(avg))}`}>avg {avg}/10</span>}
        </div>
      </button>
      {open && (
        <div className="divide-y">
          {group.items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No evaluations yet</p>
          ) : group.items.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between px-3 py-2 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium truncate">{e.evaluator_name || 'Unknown'}</span>
                <Badge className={`text-[10px] px-1 py-0 border ${evalTypeBadgeClass(e.evaluation_type)}`}>
                  {evalTypeLabel(e.evaluation_type)}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-sm ${scoreColor(e.average_score || e.overall_average)}`}>
                  {(e.average_score || e.overall_average)?.toFixed(1) ?? '—'}/10
                </span>
                {showDecision && e.decision && (
                  <Badge className={`text-[10px] px-1 py-0 border ${decisionBadgeClass(e.decision)}`}>
                    {decisionLabel(e.decision)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CallReportDetailDialog({ report, isOpen, onClose }: CallReportDetailDialogProps) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // ── evaluations state ────────────────────────────────────────────────────
  const [crEvals, setCrEvals] = useState<any[]>([]);
  const [epEvalsMap, setEpEvalsMap] = useState<Record<string, any[]>>({});
  const [crRevisions, setCrRevisions] = useState<any[]>([]);
  const [epRevisionsMap, setEpRevisionsMap] = useState<Record<string, any[]>>({});
  const [loadingEvals, setLoadingEvals] = useState(false);

  useEffect(() => {
    if (isOpen && report?.id) {
      setLoadingEpisodes(true);
      fetch(`/api/episodes?call_report_id=${report.id}&_t=${Date.now()}`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then(data => setEpisodes(Array.isArray(data.data) ? data.data : []))
        .catch(() => setEpisodes([]))
        .finally(() => setLoadingEpisodes(false));
    } else {
      setEpisodes([]);
    }
  }, [isOpen, report?.id]);

  useEffect(() => {
    if (!isOpen || !report?.id) {
      setCrEvals([]); setEpEvalsMap({}); setCrRevisions([]); setEpRevisionsMap({});
      return;
    }
    setLoadingEvals(true);
    const t = Date.now();
    Promise.all([
      fetch(`/api/management/call-reports-with-evaluations?call_report_id=${report.id}&_t=${t}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`/api/management/episodes-with-evaluations?call_report_id=${report.id}&_t=${t}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`/api/call-reports/${report.id}/revisions?_t=${t}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ]).then(([crData, epData, crRevData]) => {
      const crReport = crData.callReports?.[0];
      const allCrEvals = [
        ...(crReport?.segregatedEvaluations?.evaluatorEvaluations || []),
        ...(crReport?.segregatedEvaluations?.managementEvaluations || []),
        ...(crReport?.segregatedEvaluations?.programmerEvaluations || []),
      ];
      setCrEvals(allCrEvals);
      setCrRevisions(crRevData.revisions || []);

      // Episode evaluations: map episodeId → flat list
      const epMap: Record<string, any[]> = {};
      for (const ep of (epData.episodes || [])) {
        epMap[ep.id] = [
          ...(ep.segregatedEvaluations?.evaluatorEvaluations || []),
          ...(ep.segregatedEvaluations?.managementEvaluations || []),
          ...(ep.segregatedEvaluations?.programmerEvaluations || []),
        ];
      }
      setEpEvalsMap(epMap);

      // Fetch episode revisions for any episode that has revision evals
      const epIds = Object.keys(epMap).filter(id => epMap[id].some((e: any) => e.revision_id));
      if (epIds.length > 0) {
        Promise.all(epIds.map(id =>
          fetch(`/api/episodes/${id}/revisions?_t=${t}`).then(r => r.json()).then(d => ({ id, revs: d.revisions || [] })).catch(() => ({ id, revs: [] }))
        )).then(results => {
          const revMap: Record<string, any[]> = {};
          for (const r of results) revMap[r.id] = r.revs;
          setEpRevisionsMap(revMap);
        });
      }
    }).catch(() => {}).finally(() => setLoadingEvals(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, report?.id]);

  if (!report) return null;

  const attendees: string[] = report.meeting_attendees || [];
  const genres: string[] = report.genre || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {report.working_title}
          </DialogTitle>
          {report.stories?.title && (
            <DialogDescription className="text-base">
              Story: {report.stories.title}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Writer:</span>
                <p className="font-medium">{report.writer_name || "Not specified"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Logged By:</span>
                <p className="font-medium">{report.creator?.name || "Unknown"}</p>
              </div>
              {genres.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Genre:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {genres.map((genre, idx) => (
                      <Badge key={idx} variant="outline">{genre}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {report.theme && (
                <div>
                  <span className="text-sm text-muted-foreground">Theme:</span>
                  <p className="font-medium">{report.theme}</p>
                </div>
              )}
              {report.status && (
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <div className="mt-1">
                    <Badge className={getStatusColor(report.status)}>
                      {report.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Created:</span>
                <p className="text-sm">{formatDateTime(report.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Content Classification */}
          {(report.category || report.content_type || report.theme || report.target_slot) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Content Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {report.category && (
                  <div>
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <p className="font-medium">{getCategoryLabel(report.category)}</p>
                  </div>
                )}
                {report.content_type && (
                  <div>
                    <span className="text-sm text-muted-foreground">Content Type:</span>
                    <p className="font-medium">{report.content_type}</p>
                  </div>
                )}
                {report.theme && (
                  <div>
                    <span className="text-sm text-muted-foreground">Theme:</span>
                    <p className="font-medium">{report.theme}</p>
                  </div>
                )}
                {report.target_slot && (
                  <div>
                    <span className="text-sm text-muted-foreground">Target Slot:</span>
                    <p className="font-medium">{report.target_slot}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Logline & Synopsis */}
          {(report.logline || report.short_synopsis || report.episodic_synopsis) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Story Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.logline && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Logline:</span>
                    <p className="mt-1 text-sm leading-relaxed">{report.logline}</p>
                  </div>
                )}
                {report.short_synopsis && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Short Synopsis:</span>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{report.short_synopsis}</p>
                  </div>
                )}
                {report.episodic_synopsis && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Episodic Synopsis:</span>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{report.episodic_synopsis}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          {(report.contact_type || report.contact_email || report.contact_phone || report.contact_address) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {report.contact_type && (
                  <div>
                    <span className="text-sm text-muted-foreground">Contact Type:</span>
                    <p className="font-medium capitalize">{report.contact_type.replace(/_/g, " ")}</p>
                  </div>
                )}
                {report.contact_email && (
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${report.contact_email}`} className="text-blue-600 hover:underline">
                        {report.contact_email}
                      </a>
                    </p>
                  </div>
                )}
                {report.contact_phone && (
                  <div>
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {report.contact_phone}
                    </p>
                  </div>
                )}
                {report.contact_address && (
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Address:</span>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {report.contact_address}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Evaluation Status */}
          {(report.average_initial_assessment || report.overall_rating || report.evaluation_status || report.evaluation_deadline) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Evaluation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(report.average_initial_assessment ?? report.overall_rating) && (
                    <div>
                      <span className="text-sm text-muted-foreground">Initial Assessment:</span>
                      <p className="font-bold text-xl mt-1">{(report.average_initial_assessment ?? report.overall_rating).toFixed(1)} / 10</p>
                      {report.assessment_count > 0 && (
                        <span className="text-xs text-muted-foreground">{report.assessment_count} assessor{report.assessment_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  )}
                  {report.evaluation_deadline && (
                    <div>
                      <span className="text-sm text-muted-foreground">Evaluation Deadline:</span>
                      <p className="font-medium">{formatDate(report.evaluation_deadline)}</p>
                    </div>
                  )}
                </div>
                {(report.required_evaluators && report.completed_evaluations !== undefined) && (
                  <div>
                    <span className="text-sm text-muted-foreground">Evaluation Progress:</span>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{report.completed_evaluations} / {report.required_evaluators} completed</span>
                        <span>{Math.round((report.completed_evaluations / report.required_evaluators) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(report.completed_evaluations / report.required_evaluators) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {report.attachments && report.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments ({report.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.attachments.map((attachment: any) => {
                    const fileSizeKB = attachment.file_size ? (attachment.file_size / 1024).toFixed(1) : "Unknown";
                    const uploadDate = formatDateTime(attachment.uploaded_at);
                    const uploaderName = attachment.uploader?.name || "Unknown";

                    return (
                      <div key={attachment.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                              <span>{fileSizeKB} KB</span>
                              <span>•</span>
                              <span>Uploaded by {uploaderName}</span>
                              <span>•</span>
                              <span>{uploadDate}</span>
                            </div>
                          </div>
                        </div>
                        <a
                          href={`/api/attachments/download?path=${encodeURIComponent(attachment.file_path)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-3 whitespace-nowrap"
                        >
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Evaluation Scores ──────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Evaluation Scores
                {loadingEvals && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Call Report eval groups */}
              {crEvals.length > 0 || (!loadingEvals) ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide text-xs">One-Liner</p>
                  {(() => {
                    const groups: EvalGroup[] = [
                      { label: 'Original', revisionId: null, items: crEvals.filter(e => !e.revision_id) },
                      ...crRevisions.map((rev: any) => ({
                        label: `Revision ${rev.revision_number}${rev.attachment_name ? ` — ${rev.attachment_name}` : ''}`,
                        revisionId: rev.id,
                        items: crEvals.filter(e => e.revision_id === rev.id),
                      })),
                    ].filter(g => g.items.length > 0 || g.revisionId === null);
                    return groups.length > 0 ? groups.map(g => (
                      <EvalGroupPanel key={g.revisionId ?? 'base'} group={g} showDecision={true} />
                    )) : (
                      <p className="text-sm text-muted-foreground italic">No evaluations submitted yet.</p>
                    );
                  })()}
                </div>
              ) : null}

              {/* Episode eval groups (shown inline with episode data once loaded) */}
              {!loadingEpisodes && episodes.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide text-xs">Episodes</p>
                  {episodes.map((ep: any) => {
                    const epEvals = epEvalsMap[ep.id] || [];
                    const epRevs = epRevisionsMap[ep.id] || [];
                    const groups: EvalGroup[] = [
                      { label: 'Original', revisionId: null, items: epEvals.filter(e => !e.revision_id) },
                      ...epRevs.map((rev: any) => ({
                        label: `Revision ${rev.revision_number}${rev.attachment_name ? ` — ${rev.attachment_name}` : ''}`,
                        revisionId: rev.id,
                        items: epEvals.filter(e => e.revision_id === rev.id),
                      })),
                    ].filter(g => g.items.length > 0);
                    return (
                      <div key={ep.id} className="space-y-1.5">
                        <p className="text-sm font-medium">
                          <Badge variant="outline" className="mr-1.5 text-xs">EP {ep.episode_number}</Badge>
                          {ep.title || ''}
                        </p>
                        {groups.length > 0 ? groups.map(g => (
                          <EvalGroupPanel key={g.revisionId ?? 'base'} group={g} />
                        )) : (
                          <p className="text-xs text-muted-foreground italic pl-1">No evaluations yet.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* One-Liner Revisions */}
          <ContentRevisions
            entityId={report.id}
            apiBasePath="/api/call-reports"
            storageBucket="attachments"
            canEdit={false}
            userRole="management"
            entityType="call-report"
          />

          {/* Linked Episodes with Revisions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Film className="h-5 w-5" />
                Linked Episodes
                {episodes.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">({episodes.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEpisodes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading episodes...
                </div>
              ) : episodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No episodes linked to this report.</p>
              ) : (
                <div className="space-y-4">
                  {episodes.map((ep: any) => (
                    <div key={ep.id} className="border rounded-lg overflow-hidden">
                      {/* Episode header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">EP {ep.episode_number}</Badge>
                          {ep.title && <span className="text-sm font-medium">{ep.title}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {ep.approval_status && (
                            <Badge
                              variant="outline"
                              className={
                                ep.approval_status === "approved"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : ep.approval_status === "rejected"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                              }
                            >
                              {ep.approval_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Episode revisions */}
                      <div className="px-4 py-3">
                        <ContentRevisions
                          entityId={ep.id}
                          apiBasePath="/api/episodes"
                          storageBucket="episodes"
                          canEdit={false}
                          compact={true}
                          userRole="management"
                          entityType="episode"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Private Fields (Content Head Initiative) */}
          {(report.idea_by || report.developed_by || report.management_member_name) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg text-amber-900">Management Information</CardTitle>
                <p className="text-xs text-amber-700">Visible only to management and content team</p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {report.idea_by && (
                  <div>
                    <span className="text-sm text-amber-700">Idea By:</span>
                    <p className="font-medium text-amber-900">{report.idea_by}</p>
                  </div>
                )}
                {report.developed_by && (
                  <div>
                    <span className="text-sm text-amber-700">Developed By:</span>
                    <p className="font-medium text-amber-900">{report.developed_by}</p>
                  </div>
                )}
                {report.management_member_name && (
                  <div>
                    <span className="text-sm text-amber-700">Management Member:</span>
                    <p className="font-medium text-amber-900">{report.management_member_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
