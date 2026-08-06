"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, User, FileText, Film, Clock, CheckCircle2 } from "lucide-react";

interface PersonPending {
  userId: string;
  name: string;
  role: string;
  pendingOneLiners: number;
  pendingEpisodes: number;
  totalOneLiners: number;
  totalEpisodes: number;
}

interface PendingOneLiner {
  id: string;
  title: string;
  date: string;
  daysPending: number;
}

interface PendingEpisode {
  id: string;
  episodeNumber: number;
  title: string | null;
  projectTitle: string;
  date: string;
  daysPending: number;
  revisions: number;
}

interface EvalEntry {
  evaluatorName: string;
  averageScore: number;
  submittedAt: string;
}

interface EpEvalEntry {
  evaluatorName: string;
  overallAverage: number;
  overallGrade: string;
  submittedAt: string;
}

interface EvaluatedOneLiner {
  id: string;
  title: string;
  date: string;
  evaluations: EvalEntry[];
}

interface EvaluatedEpisode {
  id: string;
  episodeNumber: number;
  title: string | null;
  projectTitle: string;
  date: string;
  evaluations: EpEvalEntry[];
  revisions: number;
}

const ROLE_COLORS: Record<string, string> = {
  evaluator: "bg-blue-100 text-blue-700 border-blue-200",
  content_head: "bg-blue-100 text-blue-700 border-blue-200",
  management: "bg-amber-100 text-amber-700 border-amber-200",
  programmer: "bg-purple-100 text-purple-700 border-purple-200",
};

const ROLE_LABELS: Record<string, string> = {
  evaluator: "Content Head",
  content_head: "Content Head",
  management: "Management",
  programmer: "Programming",
};

const NAME_BADGE_OVERRIDES: Record<string, { label: string; color: string }> = {
  "Salman Ahmed": { label: "Programming", color: "bg-purple-100 text-purple-700 border-purple-200" },
  "Humera Safder": { label: "Content Development", color: "bg-blue-100 text-blue-700 border-blue-200" },
  "Zanjabeel Asim": { label: "GCM", color: "bg-green-100 text-green-700 border-green-200" },
};

function progressPercent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function daysColor(days: number): string {
  if (days >= 30) return "text-red-600";
  if (days >= 14) return "text-amber-600";
  return "text-gray-500";
}

function scoreColor(score: number): string {
  if (score >= 7) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function gradeColor(grade: string): string {
  if (grade === "A+" || grade === "A") return "bg-green-100 text-green-700 border-green-200";
  if (grade === "B+" || grade === "B") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getBadgeProps(name: string, role: string) {
  const override = NAME_BADGE_OVERRIDES[name];
  return {
    label: override?.label || ROLE_LABELS[role] || role,
    color: override?.color || ROLE_COLORS[role] || "",
  };
}

// ── Drill-Down Dialog ───────────────────────────────────────────────────────

function PendingDetailDialog({ userId, personName, personRole, onClose }: {
  userId: string;
  personName: string;
  personRole: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [pendingOL, setPendingOL] = useState<PendingOneLiner[]>([]);
  const [evaluatedOL, setEvaluatedOL] = useState<EvaluatedOneLiner[]>([]);
  const [pendingEp, setPendingEp] = useState<PendingEpisode[]>([]);
  const [evaluatedEp, setEvaluatedEp] = useState<EvaluatedEpisode[]>([]);
  const [tab, setTab] = useState<"oneliners" | "episodes">("oneliners");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch(`/api/management/pending-by-person?detail=${userId}&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        setPendingOL(res.pendingOneLiners || []);
        setEvaluatedOL(res.evaluatedOneLiners || []);
        setPendingEp(res.pendingEpisodes || []);
        setEvaluatedEp(res.evaluatedEpisodes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const badge = getBadgeProps(personName, personRole);
  const totalOL = pendingOL.length + evaluatedOL.length;
  const totalEp = pendingEp.length + evaluatedEp.length;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{personName}</DialogTitle>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.color}`}>
              {badge.label}
            </Badge>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex rounded-md border overflow-hidden text-xs mb-3 shrink-0">
          <button
            className={`flex-1 px-3 py-2 flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === "oneliners" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            }`}
            onClick={() => setTab("oneliners")}
          >
            <FileText className="h-3 w-3 shrink-0" />
            <span>One-Liners ({totalOL})</span>
          </button>
          <button
            className={`flex-1 px-3 py-2 flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === "episodes" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            }`}
            onClick={() => setTab("episodes")}
          >
            <Film className="h-3 w-3 shrink-0" />
            <span>Episodes ({totalEp})</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <div className="overflow-auto flex-1 -mx-6 px-6">
            {/* ── ONE-LINERS TAB ── */}
            {tab === "oneliners" && (
              totalOL === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No one-liners found</div>
              ) : (
                <div className="space-y-4">
                  {/* Pending Section */}
                  {pendingOL.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">Pending ({pendingOL.length})</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-amber-50/50">
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Title</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Submitted</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-500">Waiting</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingOL.map((ol) => (
                            <tr key={ol.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-medium text-gray-800">{ol.title || "Untitled"}</td>
                              <td className="py-2 px-3 text-gray-500">{formatDate(ol.date)}</td>
                              <td className="py-2 px-3 text-right">
                                <span className={`inline-flex items-center gap-1 font-semibold ${daysColor(ol.daysPending)}`}>
                                  <Clock className="h-3 w-3" />
                                  {ol.daysPending}d
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Evaluated Section */}
                  {evaluatedOL.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-semibold text-green-600">Evaluated ({evaluatedOL.length})</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-green-50/50">
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Title</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Submitted</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Evaluations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evaluatedOL.map((ol) => (
                            <tr key={ol.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-medium text-gray-800">{ol.title || "Untitled"}</td>
                              <td className="py-2 px-3 text-gray-500">{formatDate(ol.date)}</td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {ol.evaluations.map((ev, i) => (
                                    <Badge key={i} variant="outline" className={`text-[10px] px-1.5 py-0 ${scoreColor(ev.averageScore ?? 0)}`}>
                                      {ev.evaluatorName.split(" ")[0]}: {ev.averageScore != null ? ev.averageScore.toFixed(1) : "—"}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            )}

            {/* ── EPISODES TAB ── */}
            {tab === "episodes" && (
              totalEp === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No episodes found</div>
              ) : (
                <div className="space-y-4">
                  {/* Pending Section */}
                  {pendingEp.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">Pending ({pendingEp.length})</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-amber-50/50">
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Project</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Episode</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Submitted</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-500">Waiting</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingEp.map((ep) => (
                            <tr key={ep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-medium text-gray-800">{ep.projectTitle}</td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Ep {ep.episodeNumber}
                                </Badge>
                                {ep.revisions > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 bg-violet-50 text-violet-600 border-violet-200">
                                    {ep.revisions}R
                                  </Badge>
                                )}
                                {ep.title && <span className="ml-1.5 text-gray-500">{ep.title}</span>}
                              </td>
                              <td className="py-2 px-3 text-gray-500">{formatDate(ep.date)}</td>
                              <td className="py-2 px-3 text-right">
                                <span className={`inline-flex items-center gap-1 font-semibold ${daysColor(ep.daysPending)}`}>
                                  <Clock className="h-3 w-3" />
                                  {ep.daysPending}d
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Evaluated Section */}
                  {evaluatedEp.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-semibold text-green-600">Evaluated ({evaluatedEp.length})</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-green-50/50">
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Project</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Episode</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-500">Evaluations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evaluatedEp.map((ep) => (
                            <tr key={ep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-medium text-gray-800">{ep.projectTitle}</td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Ep {ep.episodeNumber}
                                </Badge>
                                {ep.revisions > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 bg-violet-50 text-violet-600 border-violet-200">
                                    {ep.revisions}R
                                  </Badge>
                                )}
                                {ep.title && <span className="ml-1.5 text-gray-500">{ep.title}</span>}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {ep.evaluations.map((ev, i) => (
                                    <span key={i} className="inline-flex items-center gap-1">
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${scoreColor(ev.overallAverage ?? 0)}`}>
                                        {ev.evaluatorName.split(" ")[0]}: {ev.overallAverage != null ? ev.overallAverage.toFixed(1) : "—"}
                                      </Badge>
                                      {ev.overallGrade && (
                                        <Badge variant="outline" className={`text-[10px] px-1 py-0 font-bold ${gradeColor(ev.overallGrade)}`}>
                                          {ev.overallGrade}
                                        </Badge>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function PendingByPerson() {
  const [data, setData] = useState<PersonPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<PersonPending | null>(null);

  useEffect(() => {
    fetch(`/api/management/pending-by-person?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => setData(res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No pending evaluations found.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((person) => {
          const olDone = person.totalOneLiners - person.pendingOneLiners;
          const epDone = person.totalEpisodes - person.pendingEpisodes;
          const olPct = progressPercent(olDone, person.totalOneLiners);
          const epPct = progressPercent(epDone, person.totalEpisodes);

          return (
            <Card
              key={person.userId}
              className="border-gray-200 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
              onClick={() => setDrillDown(person)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{person.name}</p>
                      {(() => {
                        const badge = getBadgeProps(person.name, person.role);
                        return (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.color}`}>
                            {badge.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-gray-600">
                        <FileText className="h-3 w-3" /> One-Liners
                      </span>
                      <span className="font-medium">
                        <span className="text-amber-600">{person.pendingOneLiners} pending</span>
                        <span className="text-gray-400 mx-1">·</span>
                        {olDone}/{person.totalOneLiners} done
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${olPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Film className="h-3 w-3" /> Episodes
                      </span>
                      <span className="font-medium">
                        <span className="text-amber-600">{person.pendingEpisodes} pending</span>
                        <span className="text-gray-400 mx-1">·</span>
                        {epDone}/{person.totalEpisodes} done
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${epPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {drillDown && (
        <PendingDetailDialog
          key={drillDown.userId}
          userId={drillDown.userId}
          personName={drillDown.name}
          personRole={drillDown.role}
          onClose={() => setDrillDown(null)}
        />
      )}
    </>
  );
}
