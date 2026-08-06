"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ClipboardList, Search, Eye } from "lucide-react";

interface CriterionEntry {
  label: string;
  score: number | null;
  comment: string | null;
}

interface OneLinerEval {
  evaluatorName: string;
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
}

interface EpisodeEval {
  evaluatorName: string;
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

export interface MemberAssessment {
  memberId: string;
  memberName: string;
  score: number | null;
}

interface EpisodeEntry {
  id: string;
  episodeNumber: number;
  evaluation: EpisodeEval | null;
  memberAssessments: MemberAssessment[];
}

export interface ContentEvalStory {
  id: string;
  workingTitle: string;
  writerName: string | null;
  contentType: string | null;
  genre: string | null;
  contentHeadName: string;
  oneLinerEval: OneLinerEval | null;
  memberAssessments: MemberAssessment[]; // per-user initial assessments for the one-liner
  episodes: EpisodeEntry[];
}

interface ContentEvaluationsClientProps {
  stories: ContentEvalStory[];
}

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
  if (decision === "approve") return "bg-green-100 text-green-700 border-green-200";
  if (decision === "reject") return "bg-red-100 text-red-700 border-red-200";
  if (decision === "needs_improvement") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function decisionLabel(decision: string | null): string {
  if (decision === "approve") return "Approve";
  if (decision === "reject") return "Reject";
  if (decision === "needs_improvement") return "Needs Improvement";
  return decision || "";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── One-liner eval view dialog ──────────────────────────────────────────────

function OneLinerViewDialog({
  ev, open, onClose,
}: {
  ev: OneLinerEval; open: boolean; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">One-Liner Evaluation</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Episodic eval view dialog ───────────────────────────────────────────────

function EpisodicViewDialog({
  ev, episodeNumber, open, onClose,
}: {
  ev: EpisodeEval; episodeNumber: number; open: boolean; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Episode {episodeNumber} — Evaluation</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
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

// ── Episode section ─────────────────────────────────────────────────────────

function EpisodeSection({ episode }: { episode: EpisodeEntry }) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const isRated = episode.evaluation != null && episode.evaluation.overallAverage != null;

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
            <Badge variant="outline" className={`text-[10px] ${isRated ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
              {isRated ? "Rated" : "Not Rated"}
            </Badge>
          </div>
        </button>

        {open && (
          <div className="divide-y">
            {/* Content Head evaluation */}
            <div className="flex items-center justify-between px-3 py-2 gap-2 text-sm bg-blue-50/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0 rounded border font-semibold bg-blue-100 text-blue-700 border-blue-200">
                  Content Head
                </span>
                <span className={isRated ? "text-slate-800" : "text-slate-400"}>
                  {episode.evaluation?.evaluatorName || "—"}
                </span>
                {episode.evaluation?.decision && (
                  <Badge className={`text-[10px] px-1.5 py-0 border ${decisionBadgeClass(episode.evaluation.decision)}`}>
                    {decisionLabel(episode.evaluation.decision)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isRated && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                )}
                {isRated ? (
                  <span className={`text-sm ${scoreColor(episode.evaluation!.overallAverage)}`}>
                    {episode.evaluation!.overallAverage!.toFixed(1)}/10
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">not rated</span>
                )}
              </div>
            </div>

            {/* Team member assessments */}
            {episode.memberAssessments.map(m => (
              <div key={m.memberId} className="flex items-center justify-between px-3 py-2 gap-2 text-sm">
                <span className="text-slate-700">{m.memberName}</span>
                <span className={`text-sm ${scoreColor(m.score)}`}>
                  {m.score != null ? `${m.score}/10` : <span className="text-xs text-slate-400 italic font-normal">—</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && episode.evaluation && (
        <EpisodicViewDialog
          ev={episode.evaluation}
          episodeNumber={episode.episodeNumber}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}

// ── Story row ───────────────────────────────────────────────────────────────

function StoryRow({ story }: { story: ContentEvalStory }) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const olRated = story.oneLinerEval != null && story.oneLinerEval.averageScore != null;
  const totalEps = story.episodes.length;
  const epsRated = story.episodes.filter(ep => ep.evaluation != null && ep.evaluation.overallAverage != null).length;

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
              {story.genre && ` · ${story.genre}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <Badge variant="outline" className={`text-[11px] ${olRated ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
            One-Liner {olRated ? "Rated" : "Not Rated"}
          </Badge>
          {totalEps > 0 && (
            <Badge variant="outline" className={`text-[11px] ${epsRated > 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
              {epsRated}/{totalEps} Episodes Rated
            </Badge>
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t bg-slate-50/50">
          {/* One-liner section */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-3 pb-2">One-Liner</p>
            <div className="bg-white border rounded-lg overflow-hidden divide-y">
              {/* Content Head row */}
              <div className="flex items-center justify-between px-3 py-2.5 text-sm bg-blue-50/40">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0 rounded border font-semibold bg-blue-100 text-blue-700 border-blue-200">
                    Content Head
                  </span>
                  <span className={olRated ? "font-medium text-slate-800" : "text-slate-400"}>
                    {story.contentHeadName}
                  </span>
                  {story.oneLinerEval?.decision && (
                    <Badge className={`text-[10px] px-1.5 py-0 border ${decisionBadgeClass(story.oneLinerEval.decision)}`}>
                      {decisionLabel(story.oneLinerEval.decision)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {olRated && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      onClick={() => setDialogOpen(true)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                  <span className={`text-sm ${scoreColor(olRated ? story.oneLinerEval!.averageScore : null)}`}>
                    {olRated ? `${story.oneLinerEval!.averageScore!.toFixed(1)}/10` : <span className="text-xs text-slate-400 italic font-normal">not rated</span>}
                  </span>
                </div>
              </div>

              {/* Team member rows */}
              {story.memberAssessments.map(m => (
                <div key={m.memberId} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-slate-700">{m.memberName}</span>
                  <span className={`text-sm ${scoreColor(m.score)}`}>
                    {m.score != null ? `${m.score}/10` : <span className="text-xs text-slate-400 italic font-normal">—</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Episodic evaluations */}
          {story.episodes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Episodes</p>
              <div className="space-y-1.5">
                {story.episodes.map(ep => <EpisodeSection key={ep.id} episode={ep} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {dialogOpen && story.oneLinerEval && (
        <OneLinerViewDialog
          ev={story.oneLinerEval}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

// ── Page client ─────────────────────────────────────────────────────────────

export function ContentEvaluationsClient({ stories }: ContentEvaluationsClientProps) {
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
          <ClipboardList className="h-10 w-10 opacity-40" />
          <p className="font-medium">No projects found for your team.</p>
          <p className="text-sm">Once one-liners are logged, they will appear here with their evaluation status.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Evaluations</CardTitle>
            <CardDescription>Your team&apos;s projects and their evaluation status from the Content Head</CardDescription>
          </div>
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
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
          <p className="text-center text-muted-foreground py-8">No projects match your search.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => <StoryRow key={s.id} story={s} />)}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">{filtered.length} of {stories.length} projects</p>
      </CardContent>
    </Card>
  );
}
