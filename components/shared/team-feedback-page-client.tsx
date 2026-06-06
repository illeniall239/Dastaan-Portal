"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users, Search, Eye, Paperclip, FileText, Image as ImageIcon, File } from "lucide-react";

type Team = "programming" | "management";

interface CriterionEntry {
  label: string;
  score: number | null;
  comment: string | null;
}

interface EvalEntry {
  id: string;
  evaluatorName: string;
  team: Team;
  averageScore: number | null;
  criteria: CriterionEntry[];
  closingRemarks: string | null;
  decision: string | null;
  decisionNotes: string | null;
  submittedAt: string | null;
  themesOfDrama: string[] | null;
  correspondingDramas: string[] | null;
  categoryOfTheme: string | null;
  noOfTracks: number | null;
  first2EpsRequired: boolean | null;
  targetWriter: string | null;
  perEpPriceRange: string | null;
  slot: string | null;
  delayReason: string | null;
}

interface EpisodeEvalEntry {
  id: string;
  evaluatorName: string;
  team: Team;
  overallAverage: number | null;
  criteria: CriterionEntry[];
  decision: string | null;
  decisionNotes: string | null;
  submittedAt: string | null;
  noOfPages: number | null;
  noOfScenes: number | null;
  freezeEndingScene: string | null;
  scenesRemarks: string | null;
  characterizationRemarks: string | null;
}

interface EpisodeEntry {
  id: string;
  episodeNumber: number;
  evaluations: EpisodeEvalEntry[];
}

interface ProgrammerFeedbackAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

interface ProgrammerFeedbackEntry {
  id: string;
  feedback_date: string;
  content: string | null;
  programmer: { name: string } | null;
  attachments: ProgrammerFeedbackAttachment[];
}

interface StoryEntry {
  id: string;
  workingTitle: string;
  writerName: string | null;
  contentType: string | null;
  genre: string | null;
  evaluations: EvalEntry[];
  episodes: EpisodeEntry[];
  programmerFeedback?: ProgrammerFeedbackEntry[];
}

interface TeamFeedbackPageClientProps {
  stories: StoryEntry[];
}

const TEAM_BADGE: Record<Team, string> = {
  programming: "bg-purple-100 text-purple-700 border-purple-200",
  management:  "bg-amber-100 text-amber-700 border-amber-200",
};

const TEAM_LABEL: Record<Team, string> = {
  programming: "Programming",
  management:  "Management",
};

function scoreColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 7) return "text-green-700 font-semibold";
  if (score >= 5) return "text-amber-700 font-semibold";
  return "text-red-700 font-semibold";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-slate-100 text-slate-500";
  if (score >= 7) return "bg-green-100 text-green-800";
  if (score >= 5) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function decisionBadgeClass(decision: string | null): string {
  if (decision === "approve")           return "bg-green-100 text-green-700 border-green-200";
  if (decision === "reject")            return "bg-red-100 text-red-700 border-red-200";
  if (decision === "needs_improvement") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function decisionLabel(decision: string | null): string {
  if (decision === "approve")           return "Approve";
  if (decision === "reject")            return "Reject";
  if (decision === "needs_improvement") return "Needs Improvement";
  return decision || "";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── One-liner eval view dialog ──────────────────────────────────────────────

function OnelinerViewDialog({ ev, open, onClose }: { ev: EvalEntry; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">One-Liner Evaluation</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${TEAM_BADGE[ev.team]}`}>
              {TEAM_LABEL[ev.team]} Team
            </span>
            <span className="text-sm font-medium text-slate-800">{ev.evaluatorName}</span>
            {ev.decision && (
              <Badge className={`text-xs px-2 border ${decisionBadgeClass(ev.decision)}`}>
                {decisionLabel(ev.decision)}
              </Badge>
            )}
            {ev.submittedAt && (
              <span className="text-xs text-slate-500 ml-auto">Submitted {formatDate(ev.submittedAt)}</span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Criteria scores */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evaluation Scores</p>
            <div className="space-y-3">
              {ev.criteria.map(c => (
                <div key={c.label} className="border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-700 font-medium">{c.label}</span>
                    {c.score !== null ? (
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${scoreBg(c.score)}`}>
                        {c.score.toFixed(1)}/10
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">—</span>
                    )}
                  </div>
                  {c.comment && <p className="text-xs text-slate-500 italic mt-0.5">{c.comment}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Overall average */}
          {ev.averageScore !== null && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall Average</span>
              <span className={`text-lg font-bold font-mono ml-auto ${scoreColor(ev.averageScore)}`}>
                {ev.averageScore.toFixed(2)}/10
              </span>
            </div>
          )}

          {/* Descriptive fields */}
          {(ev.themesOfDrama?.length || ev.correspondingDramas?.length || ev.categoryOfTheme || ev.noOfTracks !== null) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Story Assessment</p>
              <div className="space-y-2 text-sm">
                {ev.themesOfDrama?.length ? (
                  <div>
                    <span className="text-slate-500 text-xs">Themes of Drama</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ev.themesOfDrama.map(t => (
                        <span key={t} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {ev.correspondingDramas?.length ? (
                  <div>
                    <span className="text-slate-500 text-xs">Corresponding Previously Aired Dramas</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ev.correspondingDramas.map(d => (
                        <span key={d} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{d}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {ev.categoryOfTheme && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Category of Theme</span>
                    <span className="text-slate-800 text-xs font-medium">{ev.categoryOfTheme}</span>
                  </div>
                )}
                {ev.noOfTracks !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">No. of Tracks</span>
                    <span className="text-slate-800 text-xs font-medium">{ev.noOfTracks}</span>
                  </div>
                )}
                {ev.first2EpsRequired !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">First 2 Episodes Required</span>
                    <span className="text-slate-800 text-xs font-medium">{ev.first2EpsRequired ? "Yes" : "No"}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project info */}
          {(ev.targetWriter || ev.perEpPriceRange || ev.slot) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Project Info</p>
              <div className="space-y-1.5 text-sm">
                {ev.targetWriter && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Target Writer</span>
                    <span className="text-slate-800 text-xs font-medium">{ev.targetWriter}</span>
                  </div>
                )}
                {ev.perEpPriceRange && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Per EP Price Range</span>
                    <span className="text-slate-800 text-xs font-medium">{ev.perEpPriceRange}</span>
                  </div>
                )}
                {ev.slot && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Slot</span>
                    <span className="text-slate-800 text-xs font-medium">{ev.slot}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Closing remarks */}
          {ev.closingRemarks && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Closing Remarks</p>
              <p className="text-sm text-slate-700 leading-relaxed">{ev.closingRemarks}</p>
            </div>
          )}

          {/* Decision */}
          {ev.decision && (
            <div className={`p-3 rounded-lg border ${decisionBadgeClass(ev.decision)}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide">Decision</span>
                <Badge className={`text-xs px-2 border ${decisionBadgeClass(ev.decision)}`}>
                  {decisionLabel(ev.decision)}
                </Badge>
              </div>
              {ev.decisionNotes && <p className="text-xs leading-relaxed mt-1">{ev.decisionNotes}</p>}
            </div>
          )}

          {/* Delay reason */}
          {ev.delayReason && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Late Evaluation — Delay Reason</p>
              <p className="text-xs text-amber-800">{ev.delayReason}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Episodic eval view dialog ───────────────────────────────────────────────

function EpisodicViewDialog({
  ev, episodeNumber, open, onClose
}: { ev: EpisodeEvalEntry; episodeNumber: number; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Episode {episodeNumber} — Episodic Evaluation</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${TEAM_BADGE[ev.team]}`}>
              {TEAM_LABEL[ev.team]} Team
            </span>
            <span className="text-sm font-medium text-slate-800">{ev.evaluatorName}</span>
            {ev.decision && (
              <Badge className={`text-xs px-2 border ${decisionBadgeClass(ev.decision)}`}>
                {decisionLabel(ev.decision)}
              </Badge>
            )}
            {ev.submittedAt && (
              <span className="text-xs text-slate-500 ml-auto">Submitted {formatDate(ev.submittedAt)}</span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Episode metrics */}
          {(ev.noOfPages !== null || ev.noOfScenes !== null) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Episode Metrics</p>
              <div className="flex gap-6 text-sm">
                {ev.noOfPages !== null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">{ev.noOfPages}</p>
                    <p className="text-xs text-slate-500">Pages</p>
                  </div>
                )}
                {ev.noOfScenes !== null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">{ev.noOfScenes}</p>
                    <p className="text-xs text-slate-500">Scenes</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Freeze/ending */}
          {ev.freezeEndingScene && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Freeze / Ending Scene</p>
              <p className="text-sm text-slate-700 leading-relaxed">{ev.freezeEndingScene}</p>
            </div>
          )}

          {/* Scenes remarks */}
          {ev.scenesRemarks && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Scenes Remarks</p>
              <p className="text-sm text-slate-700 leading-relaxed">{ev.scenesRemarks}</p>
            </div>
          )}

          {/* Characterization remarks */}
          {ev.characterizationRemarks && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Characterization Remarks</p>
              <p className="text-sm text-slate-700 leading-relaxed">{ev.characterizationRemarks}</p>
            </div>
          )}

          {/* Criteria scores */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evaluation Scores</p>
            <div className="space-y-3">
              {ev.criteria.map(c => (
                <div key={c.label} className="border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm text-slate-700 font-medium">{c.label}</span>
                      {c.label === "Dragness" && (
                        <span className="text-[10px] text-slate-400 ml-1">(lower = better)</span>
                      )}
                    </div>
                    {c.score !== null ? (
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${scoreBg(c.label === "Dragness" ? (11 - c.score) : c.score)}`}>
                        {c.score.toFixed(1)}/10
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">—</span>
                    )}
                  </div>
                  {c.comment && <p className="text-xs text-slate-500 italic mt-0.5">{c.comment}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Overall average */}
          {ev.overallAverage !== null && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall Average</span>
              <span className={`text-lg font-bold font-mono ml-auto ${scoreColor(ev.overallAverage)}`}>
                {ev.overallAverage.toFixed(2)}/10
              </span>
            </div>
          )}

          {/* Decision */}
          {ev.decision && (
            <div className={`p-3 rounded-lg border ${decisionBadgeClass(ev.decision)}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide">Decision</span>
                <Badge className={`text-xs px-2 border ${decisionBadgeClass(ev.decision)}`}>
                  {decisionLabel(ev.decision)}
                </Badge>
              </div>
              {ev.decisionNotes && <p className="text-xs leading-relaxed mt-1">{ev.decisionNotes}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Evaluator row (one-liner) ───────────────────────────────────────────────

function EvaluatorRow({ ev }: { ev: EvalEntry }) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasCriteria = ev.criteria.some(c => c.score !== null || c.comment);
  const isSubmitted = ev.averageScore !== null;

  return (
    <>
      <div className="bg-white border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
            <span className="font-medium text-slate-800">{ev.evaluatorName}</span>
            {ev.decision && (
              <Badge className={`text-[10px] px-1.5 py-0 border ${decisionBadgeClass(ev.decision)}`}>
                {decisionLabel(ev.decision)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isSubmitted && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                onClick={e => { e.stopPropagation(); setDialogOpen(true); }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
            <span className={`text-sm ${scoreColor(ev.averageScore)}`}>
              {ev.averageScore !== null ? `${ev.averageScore.toFixed(1)}/10` : <span className="text-xs text-slate-400 italic font-normal">not rated</span>}
            </span>
          </div>
        </button>

        {open && (hasCriteria || ev.closingRemarks || ev.decisionNotes) && (
          <div className="px-4 pb-3 pt-2 border-t bg-slate-50/60 space-y-3 text-xs">
            {hasCriteria && (
              <div className="space-y-2">
                {ev.criteria.map(c => {
                  if (c.score === null && !c.comment) return null;
                  return (
                    <div key={c.label}>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">{c.label}</span>
                        {c.score !== null && <span className={scoreColor(c.score)}>{c.score.toFixed(1)}/10</span>}
                      </div>
                      {c.comment && <p className="text-slate-500 italic mt-0.5">{c.comment}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {ev.closingRemarks && (
              <div>
                <p className="text-slate-500 uppercase tracking-wide font-medium mb-0.5">Closing Remarks</p>
                <p className="text-slate-700">{ev.closingRemarks}</p>
              </div>
            )}
            {ev.decisionNotes && (
              <div>
                <p className="text-slate-500 uppercase tracking-wide font-medium mb-0.5">Decision Notes</p>
                <p className="text-slate-700">{ev.decisionNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {dialogOpen && (
        <OnelinerViewDialog ev={ev} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </>
  );
}

// ── Episode section ─────────────────────────────────────────────────────────

function EpisodeSection({ episode }: { episode: EpisodeEntry }) {
  const [open, setOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<EpisodeEvalEntry | null>(null);
  const ratedCount = episode.evaluations.filter(e => e.overallAverage !== null).length;

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
        >
          <div className="flex items-center gap-2 font-medium text-slate-700">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Episode {episode.episodeNumber}
            <span className="text-xs font-normal text-muted-foreground">{ratedCount}/{episode.evaluations.length} rated</span>
          </div>
        </button>
        {open && (
          <div className="divide-y">
            {episode.evaluations.map(ev => (
              <div key={ev.id} className="flex items-center justify-between px-3 py-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0 rounded border font-semibold ${TEAM_BADGE[ev.team]}`}>
                    {TEAM_LABEL[ev.team]}
                  </span>
                  <span className={ev.overallAverage !== null ? "text-slate-800" : "text-slate-400"}>{ev.evaluatorName}</span>
                  {ev.decision && (
                    <Badge className={`text-[10px] px-1.5 py-0 border ${ev.decision === "approve" ? "bg-green-100 text-green-700 border-green-200" : ev.decision === "reject" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                      {ev.decision === "approve" ? "Approve" : ev.decision === "reject" ? "Reject" : "Needs Revision"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ev.overallAverage !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      onClick={() => setActiveDialog(ev)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                  {ev.overallAverage !== null ? (
                    <span className={scoreColor(ev.overallAverage)}>{ev.overallAverage.toFixed(1)}/10</span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">not rated</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeDialog && (
        <EpisodicViewDialog
          ev={activeDialog}
          episodeNumber={episode.episodeNumber}
          open={!!activeDialog}
          onClose={() => setActiveDialog(null)}
        />
      )}
    </>
  );
}

// ── Programmer Feedback section ─────────────────────────────────────────────

function getAttachmentIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <ImageIcon className="h-3 w-3" />;
  if (fileType.includes("pdf")) return <FileText className="h-3 w-3" />;
  return <File className="h-3 w-3" />;
}

function getPublicUrl(filePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/attachments/${filePath}`;
}

function formatFeedbackDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ProgrammerFeedbackSection({ entries }: { entries: ProgrammerFeedbackEntry[] }) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 hover:text-slate-700 transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Paperclip className="h-3.5 w-3.5" />
        Programmer Feedback
        <span className="text-[11px] font-normal text-muted-foreground normal-case tracking-normal">
          ({entries.length} {entries.length === 1 ? "entry" : "entries"})
        </span>
      </button>

      {open && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="border border-blue-100 bg-blue-50/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                  {formatFeedbackDate(entry.feedback_date)}
                </span>
                {entry.programmer?.name && (
                  <span className="text-xs text-muted-foreground">{entry.programmer.name}</span>
                )}
              </div>

              {entry.content && (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {entry.content}
                </p>
              )}

              {entry.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={getPublicUrl(att.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors"
                    >
                      {getAttachmentIcon(att.file_type)}
                      <span className="truncate max-w-[160px]">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Story row ───────────────────────────────────────────────────────────────

function StoryRow({ story }: { story: StoryEntry }) {
  const [open, setOpen] = useState(false);

  const programming = story.evaluations.filter(e => e.team === "programming");
  const management  = story.evaluations.filter(e => e.team === "management");
  const ratedCount  = story.evaluations.filter(e => e.averageScore !== null).length;

  return (
    <div className="border rounded-lg">
      <div
        onClick={() => setOpen(v => !v)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-lg cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" /> : <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />}
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-900 leading-snug">{story.workingTitle}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {story.writerName}
              {story.contentType && ` · ${story.contentType}`}
              {story.genre      && ` · ${story.genre}`}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 ml-3 text-xs ${ratedCount > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
        >
          {ratedCount}/{story.evaluations.length} rated
        </Badge>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t bg-slate-50/50">
          {/* One-liner evaluations */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-3 pb-2">One-Liner Evaluations</p>
            {([["programming", programming], ["management", management]] as [Team, EvalEntry[]][]).map(([team, evals]) => (
              <div key={team} className="mb-3">
                <div className="flex items-center gap-2 pb-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${TEAM_BADGE[team]}`}>
                    {TEAM_LABEL[team]} Team
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {evals.filter(e => e.averageScore !== null).length}/{evals.length} rated
                  </span>
                </div>
                <div className="space-y-1.5">
                  {evals.map(ev => <EvaluatorRow key={ev.id} ev={ev} />)}
                </div>
              </div>
            ))}
          </div>

          {/* Episodic evaluations */}
          {story.episodes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Episodic Evaluations</p>
              <div className="space-y-1.5">
                {story.episodes.map(ep => <EpisodeSection key={ep.id} episode={ep} />)}
              </div>
            </div>
          )}

          {/* Programmer feedback */}
          {(story.programmerFeedback?.length ?? 0) > 0 && (
            <ProgrammerFeedbackSection entries={story.programmerFeedback!} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Page client ─────────────────────────────────────────────────────────────

export function TeamFeedbackPageClient({ stories }: TeamFeedbackPageClientProps) {
  const [search, setSearch] = useState("");

  const filtered = stories.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.workingTitle.toLowerCase().includes(q) || (s.writerName || "").toLowerCase().includes(q);
  });

  if (stories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center text-muted-foreground">
          <Users className="h-10 w-10 opacity-40" />
          <p className="font-medium">No call reports found for your team.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Team Feedback</CardTitle>
            <CardDescription>Scores and remarks from the programming and management teams on your one-liners and episodes</CardDescription>
          </div>
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="relative max-w-sm pt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or writer..."
            className="pl-9 h-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No stories match your search.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => <StoryRow key={s.id} story={s} />)}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">{filtered.length} of {stories.length} stories</p>
      </CardContent>
    </Card>
  );
}
