"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, Phone, MapPin, Target, Lightbulb, Eye, Paperclip, Film, Loader2, ClipboardCheck, ChevronDown, ChevronRight, CalendarDays } from "lucide-react";
import { ContentRevisions } from "@/components/ui/content-revisions";
import { FeedbackCommunicationView } from "@/components/evaluations/feedback-communication-view";
import { createClient } from "@/lib/supabase/client";
import { formatInTimeZone } from "date-fns-tz";
import { PKT_TIME_ZONE } from "@/lib/utils/format-date";

interface CallReportDetailDialogProps {
  report: any | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions
const formatDate = (date: string | null) => {
  if (!date) return "Not set";
  try {
    return formatInTimeZone(new Date(date), PKT_TIME_ZONE, "PPP");
  } catch {
    return "Invalid date";
  }
};

const formatDateTime = (date: string | null) => {
  if (!date) return "Not set";
  try {
    return formatInTimeZone(new Date(date), PKT_TIME_ZONE, "PPP 'at' p");
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
// Who an evaluation is from, by the team the API sorted it into (not the person's role: e.g. Salman is
// management but evaluates with the Programming Team)
type EvalGroupKey = 'content_head' | 'programming' | 'content_dev' | 'management';
const EVAL_GROUP_BADGE: Record<EvalGroupKey, { label: string; cls: string }> = {
  content_head: { label: 'Content Head', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  programming:  { label: "Salman's Team", cls: 'bg-green-100 text-green-700 border-green-200' },
  content_dev:  { label: "Humera's Team", cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  management:   { label: 'Management', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
};
/** All evaluations from the API's segregated lists, each tagged with its group */
function groupedEvaluations(seg: any): any[] {
  if (!seg) return [];
  const tag = (list: any[] | undefined, group: EvalGroupKey) => (list || []).map((e) => ({ ...e, evalGroup: group }));
  return [
    ...tag(seg.evaluatorEvaluations, 'content_head'),
    ...tag(seg.managementEvaluations, 'management'),
    ...tag(seg.programmerEvaluations, 'programming'),
    ...tag((seg.contentTeamEvaluations || []).flatMap((g: any) => g.evaluations || []), 'content_dev'),
  ];
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

// The parameters behind an evaluation's score. Older one-liner evaluations used the legacy criteria,
// so each list includes those too; only the ones the evaluation actually has are shown.
const ONE_LINER_PARAMS: [string, string, string?][] = [
  ["Conflict of Content", "conflict_of_content_score", "conflict_of_content_comment"],
  ["Characterization", "characterization_score", "characterization_comment"],
  ["Story Progression", "story_progression_score", "story_progression_comment"],
  ["What's Next Element", "whats_next_element_score", "whats_next_element_comment"],
  ["Overall One-liner Grade", "overall_oneliner_grade_score", "overall_oneliner_grade_comment"],
  ["Premise / Conflict", "premise_conflict_score"],
  ["Storyline / Plot", "storyline_plot_score"],
  ["Episodic Progression", "episodic_progression_score"],
  ["Characters", "characters_score"],
  ["Dialogues", "dialogues_score"],
  ["What's Next", "whats_next_score"],
  ["Freezes", "freezes_score"],
  ["Overall Assessment", "overall_assessment_score"],
];
const EPISODE_PARAMS: [string, string, string?][] = [
  ["Conflict of Content", "conflict_of_content_score", "conflict_of_content_comment"],
  ["Characterization", "characterization_score", "characterization_comment"],
  ["Story Progression", "story_progression_score", "story_progression_comment"],
  ["Main Event", "main_event_score", "main_event_comment"],
  ["Small Event", "small_event_score", "small_event_comment"],
  ["Dragness", "dragness_score", "dragness_comment"],
  ["Freezes", "freezes_score", "freezes_comment"],
  ["What's Next Element", "whats_next_element_score", "whats_next_element_comment"],
  ["Overall Assessment", "overall_assessment_score", "overall_assessment_comment"],
];

// An initial assessment as stored on the item itself (one-liner, episode or revision); the name only
// where it's recorded (revisions)
interface Assessment { score: number; name?: string | null }
const assessment = (score: unknown, name?: string | null): Assessment[] =>
  score != null && score !== "" ? [{ score: Number(score), name }] : [];

/** An evaluation's overall score; null for a feedback-only evaluation (written feedback, no scores) */
const evalScore = (e: any): number | null => e.average_score ?? e.overall_average ?? null;

/** A revision's initial assessment (one score, by whoever assessed it) */
function revisionAssessments(rev: any): Assessment[] {
  return assessment(rev.initial_assessment, rev.assessed_by_user?.name);
}

interface EvalGroup {
  label: string;       // "Original" | "Revision N"
  revisionId: string | null;
  items: any[];
  assessments: Assessment[];
}

/** One evaluation: who and the score; opens to show the score of each parameter (and its comment) */
function EvalRow({ e, kind, showDecision }: { e: any; kind: "one-liner" | "episode"; showDecision?: boolean }) {
  const [open, setOpen] = useState(false);
  const score = evalScore(e);
  // Feedback-only: the form's default scores are stored but were never given, so don't show them
  const params = score == null ? [] : (kind === "one-liner" ? ONE_LINER_PARAMS : EPISODE_PARAMS).filter(([, key]) => e[key] != null);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 gap-2 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {open ? <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />}
          <span className="font-medium truncate">{e.evaluator_name || 'Unknown'}</span>
          {EVAL_GROUP_BADGE[e.evalGroup as EvalGroupKey] && (
            <Badge className={`text-[10px] px-1 py-0 border ${EVAL_GROUP_BADGE[e.evalGroup as EvalGroupKey].cls}`}>
              {EVAL_GROUP_BADGE[e.evalGroup as EvalGroupKey].label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {score == null ? (
            <span className="text-xs text-muted-foreground italic">Feedback only</span>
          ) : (
            <span className={`text-sm ${scoreColor(score)}`}>{score.toFixed(1)}/10</span>
          )}
          {showDecision && e.decision && (
            <Badge className={`text-[10px] px-1 py-0 border ${decisionBadgeClass(e.decision)}`}>
              {decisionLabel(e.decision)}
            </Badge>
          )}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {score == null ? (
            <>
              <p className="text-xs text-muted-foreground italic">Feedback only — no scores given.</p>
              <FeedbackCommunicationView text={e.feedback_text} attachments={e.feedback_attachments} />
            </>
          ) : params.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No parameter scores recorded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {params.map(([label, key, commentKey]) => (
                <div key={key} className="bg-slate-50 rounded px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className={`text-xs ${scoreColor(e[key])}`}>{e[key]}/10</span>
                  </div>
                  {commentKey && e[commentKey] && (
                    <p className="text-[11px] text-slate-600 italic mt-0.5 whitespace-pre-wrap">{e[commentKey]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {kind === "episode" && (e.no_of_pages != null || e.no_of_scenes != null) && (
            <p className="text-xs text-slate-600">
              {[e.no_of_pages != null && `${e.no_of_pages} pages`, e.no_of_scenes != null && `${e.no_of_scenes} scenes`].filter(Boolean).join(" · ")}
            </p>
          )}
          {e.decision_notes && (
            <p className="text-xs text-slate-600"><span className="font-medium">Decision notes:</span> {e.decision_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

function EvalGroupPanel({ group, kind, showDecision }: { group: EvalGroup; kind: "one-liner" | "episode"; showDecision?: boolean }) {
  const [open, setOpen] = useState(true);
  // Average of the scored evaluations only (feedback-only ones have no score)
  const scores = group.items.map(evalScore).filter((v): v is number => v != null);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
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
          {group.assessments.length > 0 && (
            <div className="px-3 py-2 bg-blue-50/40 space-y-1">
              {group.assessments.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">
                    Initial Assessment{a.name && <span className="text-slate-400"> · by {a.name}</span>}
                  </span>
                  <span className={`shrink-0 ${scoreColor(a.score)}`}>{+a.score.toFixed(1)}/10</span>
                </div>
              ))}
            </div>
          )}
          {group.items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No evaluations yet</p>
          ) : group.items.map((e: any) => (
            <EvalRow key={e.id} e={e} kind={kind} showDecision={showDecision} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CallReportDetailDialog({ report, isOpen, onClose }: CallReportDetailDialogProps) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  // ── evaluations state ────────────────────────────────────────────────────
  const [crEvals, setCrEvals] = useState<any[]>([]);
  const [epEvalsMap, setEpEvalsMap] = useState<Record<string, any[]>>({});
  const [crRevisions, setCrRevisions] = useState<any[]>([]);
  const [epRevisionsMap, setEpRevisionsMap] = useState<Record<string, any[]>>({});
  const [loadingEvals, setLoadingEvals] = useState(false);
  // The one-liner's initial assessment (stored on the call report)
  const [crAssessment, setCrAssessment] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user?.id) return;
      supabase.from("users").select("role").eq("id", data.user.id).single()
        .then(({ data: u }) => { if (u?.role) setUserRole(u.role); });
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !report?.id) {
      setAttachments([]);
      return;
    }
    // If parent pre-loaded attachments (story-bank pattern), use them directly
    if (report.attachments !== undefined) {
      setAttachments(Array.isArray(report.attachments) ? report.attachments : []);
      return;
    }
    // Otherwise self-fetch (team-projects pattern — no pre-loaded attachments)
    fetch(`/api/attachments?entity_type=call_report&entity_id=${report.id}&_t=${Date.now()}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setAttachments(Array.isArray(data.attachments) ? data.attachments : []))
      .catch(() => setAttachments([]));
  }, [isOpen, report?.id]);

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
      setCrEvals([]); setEpEvalsMap({}); setCrRevisions([]); setEpRevisionsMap({}); setCrAssessment(null);
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
      const allCrEvals = groupedEvaluations(crReport?.segregatedEvaluations);
      setCrEvals(allCrEvals);
      setCrAssessment(crReport?.initialAssessment ?? null);
      setCrRevisions(crRevData.revisions || []);

      // Episode evaluations: map episodeId → flat list
      const epMap: Record<string, any[]> = {};
      for (const ep of (epData.episodes || [])) {
        epMap[ep.id] = groupedEvaluations(ep.segregatedEvaluations);
      }
      setEpEvalsMap(epMap);

      const epIds: string[] = (epData.episodes || []).map((ep: any) => ep.id);

      // Every episode's revisions (their evaluations and initial assessments)
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
          {/* Only when there's something to show (Team Overview projects carry none of these) */}
          {(report.average_initial_assessment || report.overall_rating || report.evaluation_deadline
            || (report.required_evaluators && report.completed_evaluations !== undefined)) && (
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
          {attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attachments.map((attachment: any) => {
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
                        {userRole !== "management_viewer" && (
                          <a
                            href={`/api/attachments/download?path=${encodeURIComponent(attachment.file_path)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-3 whitespace-nowrap"
                          >
                            Download
                          </a>
                        )}
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
                      { label: 'Original', revisionId: null, items: crEvals.filter(e => !e.revision_id), assessments: assessment(crAssessment) },
                      ...crRevisions.map((rev: any) => ({
                        label: `Revision ${rev.revision_number}${rev.attachment_name ? ` — ${rev.attachment_name}` : ''}`,
                        revisionId: rev.id,
                        items: crEvals.filter(e => e.revision_id === rev.id),
                        assessments: revisionAssessments(rev),
                      })),
                    ].filter(g => g.items.length > 0 || g.assessments.length > 0 || g.revisionId === null);
                    return groups.length > 0 ? groups.map(g => (
                      <EvalGroupPanel key={g.revisionId ?? 'base'} group={g} kind="one-liner" showDecision={true} />
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
                      { label: 'Original', revisionId: null, items: epEvals.filter(e => !e.revision_id), assessments: assessment(ep.average_initial_assessment ?? ep.initial_assessment) },
                      ...epRevs.map((rev: any) => ({
                        label: `Revision ${rev.revision_number}${rev.attachment_name ? ` — ${rev.attachment_name}` : ''}`,
                        revisionId: rev.id,
                        items: epEvals.filter(e => e.revision_id === rev.id),
                        assessments: revisionAssessments(rev),
                      })),
                    ].filter(g => g.items.length > 0 || g.assessments.length > 0);
                    return (
                      <div key={ep.id} className="space-y-1.5">
                        <div className="text-sm font-medium">
                          <Badge variant="outline" className="mr-1.5 text-xs">EP {ep.episode_number}</Badge>
                          {ep.title || ''}
                        </div>
                        {groups.length > 0 ? groups.map(g => (
                          <EvalGroupPanel key={g.revisionId ?? 'base'} group={g} kind="episode" />
                        )) : (
                          <p className="text-xs text-muted-foreground italic pl-1">No assessments or evaluations yet.</p>
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
            userRole={userRole || "management"}
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
                      {/* Episode dates */}
                      <div className="flex items-center gap-4 px-4 py-1.5 text-xs text-muted-foreground bg-slate-50/50">
                        {ep.created_at && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Logged: {formatDate(ep.created_at)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <ClipboardCheck className="h-3 w-3" />
                          {epEvalsMap[ep.id]?.length > 0 ? (() => {
                            const dates = epEvalsMap[ep.id]
                              .map((ev: any) => ev.submitted_at || ev.created_at)
                              .filter(Boolean)
                              .sort();
                            const latest = dates[dates.length - 1];
                            return latest ? `Evaluated: ${formatDate(latest)}` : "Evaluated: Not evaluated";
                          })() : "Evaluated: Not evaluated"}
                        </span>
                      </div>
                      {/* Episode revisions */}
                      <div className="px-4 py-3">
                        <ContentRevisions
                          entityId={ep.id}
                          apiBasePath="/api/episodes"
                          storageBucket="episodes"
                          canEdit={false}
                          compact={true}
                          userRole={userRole || "management"}
                          entityType="episode"
                        />
                      </div>
                      {/* Episode primary attachment */}
                      {ep.attachment_name && (
                        <div className="px-4 pb-3">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                            <Paperclip className="h-3.5 w-3.5" />
                            Attachment
                          </p>
                          <div className="flex items-center justify-between gap-2 px-3 py-2 border rounded-md text-xs bg-white hover:bg-gray-50">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                              <span className="truncate font-medium">{ep.attachment_name}</span>
                            </div>
                            {userRole !== "management_viewer" && (
                              <button
                                onClick={() => window.open(`/api/episodes/download/${ep.id}`, "_blank")}
                                className="text-blue-600 hover:text-blue-800 hover:underline flex-shrink-0"
                              >
                                Download
                              </button>
                            )}
                          </div>
                        </div>
                      )}
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
