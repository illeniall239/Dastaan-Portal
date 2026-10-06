"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TrackingRevision {
  revisionNumber: number;
  receivedDate: string | null;
  feedbackDate: string | null;
  feedbackDays: number | null;
  teamFeedback?: Record<string, string | null>;
  teamDays?: Record<string, number | null>;
  teamScores?: Record<string, string | null>;
}

interface TrackingEpisode {
  id: string;
  episodeNumber: number;
  firstCopyDate: string | null;
  firstCopyFeedbackDate: string | null;
  firstCopyFeedbackDays: number | null;
  firstCopyTeamFeedback?: Record<string, string | null>;
  firstCopyTeamDays?: Record<string, number | null>;
  firstCopyTeamScores?: Record<string, string | null>;
  revisions: TrackingRevision[];
  paymentRequestDate: string | null;
  paymentDate: string | null;
  trackingStatus: string | null;
}

interface TrackingProject {
  id: string;
  workingTitle: string;
  writerName: string | null;
  trackingNotes: string | null;
  targetSlot: string | null;
  teamName: string | null;
  avgScore: number | null;
  oneLiner?: {
    loggedDate: string | null;
    teamFeedback: Record<string, string | null>;
    teamDays?: Record<string, number | null>;
    teamScores?: Record<string, string | null>;
  };
  episodes: TrackingEpisode[];
  maxRevisions: number;
  monthlySummary: { month: string; freshEps: number; revEps: number }[];
}

export default function EvaluatorTrackerPage() {
  const [projects, setProjects] = useState<TrackingProject[]>([]);
  const [globalMaxRevisions, setGlobalMaxRevisions] = useState(0);
  const [feedbackTeams, setFeedbackTeams] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.trim().toLowerCase();
    return projects.filter(p => p.workingTitle.toLowerCase().includes(q) || (p.writerName && p.writerName.toLowerCase().includes(q)));
  }, [projects, search]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/evaluator/tracking?_t=${Date.now()}`);
        if (!res.ok) throw new Error("Failed to load tracking data");
        const data = await res.json();
        setProjects(data.projects || []);
        setGlobalMaxRevisions(data.globalMaxRevisions || 0);
        setFeedbackTeams(data.feedbackTeams || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Episode tracking for your team &middot; {filtered.length} project{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="relative w-fit">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search projects or writers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs pl-8 w-[220px]"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {projects.length === 0 ? "No tracking data found for your team." : "No projects match your search."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <TrackingTable projects={filtered} globalMaxRevisions={globalMaxRevisions} feedbackTeams={feedbackTeams} />
        </div>
      )}
    </div>
  );
}

function TrackingTable({
  projects,
  globalMaxRevisions,
  feedbackTeams = [],
}: {
  projects: TrackingProject[];
  globalMaxRevisions: number;
  feedbackTeams?: string[];
}) {
  const hasFbTeams = feedbackTeams.length > 0;
  const colsPerTeam = 2; // feedback + days
  const fbBlockCols = hasFbTeams ? feedbackTeams.length * colsPerTeam : 1;
  const copyBlockCols = 1 + fbBlockCols;
  const revColCount = globalMaxRevisions * copyBlockCols;
  const totalCols = 2 + copyBlockCols + revColCount;
  const fbColWidth = 100;
  const daysWidth = 50;
  const teamBlockWidth = fbColWidth + daysWidth;
  const minWidth = 50 + 180 + 110 + (hasFbTeams ? feedbackTeams.length * teamBlockWidth : 110) + globalMaxRevisions * (110 + (hasFbTeams ? feedbackTeams.length * teamBlockWidth : 110));

  const daysColor = (d: number | null) => {
    if (d === null) return "";
    return "text-green-700 bg-green-50";
  };

  const ordinal = (n: number) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

  const thBase = "px-3 py-2.5 text-[11px] font-semibold text-center border-b-2 whitespace-nowrap";
  const tdBase = "px-3 py-2 text-center text-[11px]";
  const divider = "border-r border-border/40";

  return (
    <div className="rounded-xl border border-border/60 shadow-sm bg-white w-fit min-w-full">
      <table className="w-full text-xs border-separate border-spacing-0" style={{ minWidth }}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
            <th className={`${thBase} ${divider} text-left`} style={{ width: 50 }}>Ep #</th>
            <th className={`${thBase} ${divider} text-left bg-slate-50/80 text-slate-600`} style={{ width: 180 }}>Writer</th>
            <th className={`${thBase} ${divider} bg-blue-50/80 text-blue-700`} style={{ width: 120 }}>1st Copy Received</th>
            {hasFbTeams ? feedbackTeams.map((team) => [
              <th key={`fb-0-${team}`} className={`${thBase} ${divider} bg-amber-50/80 text-amber-700`} style={{ width: fbColWidth, whiteSpace: "normal", lineHeight: "1.3" }}>
                {team}
              </th>,
              <th key={`days-0-${team}`} className={`${thBase} ${divider} bg-slate-50 text-slate-500`} style={{ width: daysWidth }}>Days</th>,
            ]).flat() : (
              <th className={`${thBase} ${divider} bg-amber-50/80 text-amber-700`} style={{ width: 120 }}>Feedback</th>
            )}
            {Array.from({ length: globalMaxRevisions }, (_, i) => [
              <th key={`rev-${i}`} className={`${thBase} ${divider} bg-blue-50/80 text-blue-700`} style={{ width: 120 }}>
                {ordinal(i + 1)} Revised
              </th>,
              ...(hasFbTeams ? feedbackTeams.map((team) => [
                <th key={`fb-${i}-${team}`} className={`${thBase} ${divider} bg-amber-50/80 text-amber-700`} style={{ width: fbColWidth, whiteSpace: "normal", lineHeight: "1.3" }}>
                  {team}
                </th>,
                <th key={`days-${i}-${team}`} className={`${thBase} ${divider} bg-slate-50 text-slate-500`} style={{ width: daysWidth }}>Days</th>,
              ]).flat() : [
                <th key={`fb-${i}`} className={`${thBase} ${divider} bg-amber-50/80 text-amber-700`} style={{ width: 120 }}>
                  Feedback
                </th>,
              ]),
            ]).flat()}
          </tr>
        </thead>
        <tbody>
          {projects.map((project, pIdx) => (
            <Fragment key={project.id}>
              {pIdx > 0 && <tr><td colSpan={totalCols} className="h-2 bg-slate-50/50" /></tr>}
              <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                <td colSpan={totalCols} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-800">{project.workingTitle}</span>
                  </div>
                </td>
              </tr>
              {project.oneLiner && (
                <tr className="bg-violet-50/30 border-b border-violet-100/60">
                  <td className={`${tdBase} ${divider} font-semibold text-violet-600`}>OL</td>
                  <td className={`${tdBase} ${divider} text-slate-500`}>{project.writerName ?? ""}</td>
                  <td className={`${tdBase} ${divider} text-violet-600`}>{project.oneLiner.loggedDate ?? ""}</td>
                  {hasFbTeams ? feedbackTeams.map((team) => {
                    const d = project.oneLiner!.teamDays?.[team] ?? null;
                    const pending = !project.oneLiner!.teamFeedback?.[team];
                    return [
                      <td key={`ol-fb-${team}`} className={`${tdBase} ${divider} text-violet-600 text-[10px]`}>
                        <div>{project.oneLiner!.teamFeedback?.[team] ?? ""}</div>
                        {project.oneLiner!.teamScores?.[team] && (
                          <div className="mt-0.5 font-bold text-violet-700 text-[9px]">{project.oneLiner!.teamScores[team]}</div>
                        )}
                      </td>,
                      <td key={`ol-days-${team}`} className={`px-2 py-2 ${divider} text-center font-semibold text-[10px] ${pending ? "text-red-600 bg-red-50/50 italic" : daysColor(d)}`}>
                        {d != null ? d : ""}
                      </td>,
                    ];
                  }).flat() : (
                    <td className={`${tdBase} ${divider} text-violet-600`}></td>
                  )}
                  {Array.from({ length: globalMaxRevisions }, (_, i) => [
                    <td key={`ol-rev-${i}`} className={`${tdBase} ${divider}`}></td>,
                    ...(hasFbTeams ? feedbackTeams.map((team) => [
                      <td key={`ol-rfb-${i}-${team}`} className={`${tdBase} ${divider}`}></td>,
                      <td key={`ol-rdays-${i}-${team}`} className={`${tdBase} ${divider}`}></td>,
                    ]).flat() : [
                      <td key={`ol-rfb-${i}`} className={`${tdBase} ${divider}`}></td>,
                    ]),
                  ]).flat()}
                </tr>
              )}
              {project.episodes.map((ep, epIdx) => (
                <tr key={ep.id} className={`border-b border-border/20 transition-colors hover:bg-blue-50/20 ${epIdx % 2 === 1 ? "bg-slate-50/30" : "bg-white"}`}>
                  <td className={`${tdBase} ${divider} font-semibold text-slate-700`}>{ep.episodeNumber}</td>
                  <td className={`${tdBase} ${divider} text-slate-500`}>{project.writerName ?? ""}</td>
                  <td className={`${tdBase} ${divider} text-blue-700 font-medium`}>{ep.firstCopyDate ?? ""}</td>
                  {hasFbTeams ? feedbackTeams.map((team) => {
                    const d = ep.firstCopyTeamDays?.[team] ?? null;
                    const pending = !ep.firstCopyTeamFeedback?.[team];
                    return [
                      <td key={`fb-0-${team}`} className={`${tdBase} ${divider} text-slate-600 text-[10px]`}>
                        <div>{ep.firstCopyTeamFeedback?.[team] ?? ""}</div>
                        {ep.firstCopyTeamScores?.[team] && (
                          <div className="mt-0.5 font-bold text-emerald-700 text-[9px]">{ep.firstCopyTeamScores[team]}</div>
                        )}
                      </td>,
                      <td key={`days-0-${team}`} className={`px-2 py-2 ${divider} text-center font-semibold text-[10px] ${pending ? "text-red-600 bg-red-50/50 italic" : daysColor(d)}`}>
                        {d != null ? d : ""}
                      </td>,
                    ];
                  }).flat() : (
                    <td className={`${tdBase} ${divider} text-slate-600`}>{ep.firstCopyFeedbackDate ?? ""}</td>
                  )}
                  {Array.from({ length: globalMaxRevisions }, (_, i) => {
                    const rev = ep.revisions[i];
                    return [
                      <td key={`rev-${i}`} className={`${tdBase} ${divider} text-blue-700 font-medium`}>{rev?.receivedDate ?? ""}</td>,
                      ...(hasFbTeams ? feedbackTeams.map((team) => {
                        const d = rev?.teamDays?.[team] ?? null;
                        const pending = !rev?.teamFeedback?.[team];
                        return [
                          <td key={`fb-${i}-${team}`} className={`${tdBase} ${divider} text-slate-600 text-[10px]`}>
                            <div>{rev?.teamFeedback?.[team] ?? ""}</div>
                            {rev?.teamScores?.[team] && (
                              <div className="mt-0.5 font-bold text-emerald-700 text-[9px]">{rev.teamScores[team]}</div>
                            )}
                          </td>,
                          <td key={`days-${i}-${team}`} className={`px-2 py-2 ${divider} text-center font-semibold text-[10px] ${rev ? (pending ? "text-red-600 bg-red-50/50 italic" : daysColor(d)) : ""}`}>
                            {rev && d != null ? d : ""}
                          </td>,
                        ];
                      }).flat() : [
                        <td key={`fb-${i}`} className={`${tdBase} ${divider} text-slate-600`}>{rev?.feedbackDate ?? ""}</td>,
                      ]),
                    ];
                  }).flat()}
                </tr>
              ))}
              {project.monthlySummary && project.monthlySummary.length > 0 && (
                <tr className="bg-indigo-50/30 border-b border-indigo-100/40">
                  <td colSpan={totalCols} className="px-4 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Monthly</span>
                      {project.monthlySummary.map((ms) => (
                        <span key={ms.month} className="inline-flex items-center gap-1 text-[10px]">
                          <span className="font-medium text-slate-500">{ms.month}:</span>
                          {ms.freshEps > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{ms.freshEps}F</span>}
                          {ms.revEps > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">{ms.revEps}R</span>}
                          {ms.freshEps === 0 && ms.revEps === 0 && <span className="text-slate-300">0</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
