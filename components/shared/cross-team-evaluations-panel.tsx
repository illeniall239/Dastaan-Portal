"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Loader2, Users } from "lucide-react";

type Team = "programming" | "management";

interface CrossTeamEval {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  team: Team;
  averageScore: number | null;
  conflictScore: number | null;
  characterizationScore: number | null;
  storyProgressionScore: number | null;
  whatsNextScore: number | null;
  overallOnelinerScore: number | null;
  conflictComment: string | null;
  characterizationComment: string | null;
  storyProgressionComment: string | null;
  whatsNextComment: string | null;
  overallOnelinerComment: string | null;
  closingRemarks: string | null;
  decision: string | null;
  decisionNotes: string | null;
  submittedAt: string;
}

interface CrossTeamEvaluationsPanelProps {
  callReportId: string;
}

const TEAM_BADGE: Record<Team, string> = {
  programming: "bg-purple-100 text-purple-700 border-purple-200",
  management:  "bg-amber-100 text-amber-700 border-amber-200",
};

const TEAM_LABEL: Record<Team, string> = {
  programming: "Programming",
  management:  "Management",
};

const CRITERIA = [
  { label: "Conflict of Content", scoreKey: "conflictScore",          commentKey: "conflictComment" },
  { label: "Characterization",    scoreKey: "characterizationScore",  commentKey: "characterizationComment" },
  { label: "Story Progression",   scoreKey: "storyProgressionScore",  commentKey: "storyProgressionComment" },
  { label: "What's Next Element", scoreKey: "whatsNextScore",         commentKey: "whatsNextComment" },
  { label: "Overall One-Liner",   scoreKey: "overallOnelinerScore",   commentKey: "overallOnelinerComment" },
] as const;

function scoreColor(score: number | null): string {
  if (!score) return "text-slate-500";
  if (score >= 7) return "text-green-700 font-semibold";
  if (score >= 5) return "text-amber-700 font-semibold";
  return "text-red-700 font-semibold";
}

function decisionBadge(decision: string | null) {
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

function EvaluatorDetail({ ev }: { ev: CrossTeamEval }) {
  const [open, setOpen] = useState(false);

  const hasCriteria = CRITERIA.some(c => ev[c.scoreKey] !== null);
  const hasComments = CRITERIA.some(c => ev[c.commentKey]);
  const hasRemarks  = !!ev.closingRemarks;

  return (
    <div>
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors text-sm"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <span className="font-medium text-slate-800">{ev.evaluatorName}</span>
          {ev.decision && (
            <Badge className={`text-[10px] px-1.5 py-0 border ${decisionBadge(ev.decision)}`}>
              {decisionLabel(ev.decision)}
            </Badge>
          )}
        </div>
        <span className={`text-sm shrink-0 ${scoreColor(ev.averageScore)}`}>
          {ev.averageScore !== null ? `${ev.averageScore.toFixed(1)}/10` : "—"}
        </span>
      </button>

      {/* Detail rows */}
      {open && (hasCriteria || hasComments || hasRemarks || ev.decisionNotes) && (
        <div className="px-3 pb-3 space-y-3 bg-slate-50/60 border-t">
          {/* Criteria scores + comments */}
          {hasCriteria && (
            <div className="pt-3 space-y-2">
              {CRITERIA.map(c => {
                const score   = ev[c.scoreKey];
                const comment = ev[c.commentKey];
                if (score === null && !comment) return null;
                return (
                  <div key={c.label} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">{c.label}</span>
                      {score !== null && (
                        <span className={scoreColor(score)}>{score.toFixed(1)}/10</span>
                      )}
                    </div>
                    {comment && (
                      <p className="mt-0.5 text-slate-500 italic">{comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Closing remarks */}
          {hasRemarks && (
            <div className="text-xs">
              <p className="text-slate-500 uppercase tracking-wide font-medium mb-0.5">Closing Remarks</p>
              <p className="text-slate-700">{ev.closingRemarks}</p>
            </div>
          )}

          {/* Decision notes */}
          {ev.decisionNotes && (
            <div className="text-xs">
              <p className="text-slate-500 uppercase tracking-wide font-medium mb-0.5">Decision Notes</p>
              <p className="text-slate-700">{ev.decisionNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamPanel({ team, evaluations }: { team: Team; evaluations: CrossTeamEval[] }) {
  const [open, setOpen] = useState(true);

  const avg = evaluations.length
    ? (evaluations.reduce((s, e) => s + (e.averageScore ?? 0), 0) / evaluations.length).toFixed(1)
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
          <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${TEAM_BADGE[team]}`}>
            {TEAM_LABEL[team]}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {evaluations.length} {evaluations.length === 1 ? "evaluation" : "evaluations"}
          </span>
          {avg && (
            <span className={`text-xs ${scoreColor(parseFloat(avg))}`}>avg {avg}/10</span>
          )}
        </div>
      </button>

      {open && (
        <div className="divide-y">
          {evaluations.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No evaluations submitted yet</p>
          ) : (
            evaluations.map(ev => <EvaluatorDetail key={ev.id} ev={ev} />)
          )}
        </div>
      )}
    </div>
  );
}

export function CrossTeamEvaluationsPanel({ callReportId }: CrossTeamEvaluationsPanelProps) {
  const [evaluations, setEvaluations] = useState<CrossTeamEval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/call-reports/${callReportId}/cross-team-evaluations?_t=${Date.now()}`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        setEvaluations((await res.json()).evaluations || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [callReportId]);

  const programming = evaluations.filter(e => e.team === "programming");
  const management  = evaluations.filter(e => e.team === "management");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Programming & Management Evaluations</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <TeamPanel team="programming" evaluations={programming} />
            <TeamPanel team="management"  evaluations={management} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
