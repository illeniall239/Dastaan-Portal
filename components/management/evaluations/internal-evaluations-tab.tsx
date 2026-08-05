"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Film, ChevronDown, ChevronRight, Search, CheckCircle2, Paperclip } from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";
import { SegregatedEvaluationsDisplay } from "@/components/evaluations/segregated-evaluations-display";
import { SegregatedEpisodicEvaluationsDisplay } from "@/components/evaluations/segregated-episodic-evaluations-display";
import type { SegregatedEvaluations, SegregatedEpisodicEvaluations } from "@/types";

interface AttachmentItem {
  id: string;
  fileName: string;
  filePath: string;
}

interface CallReportWithEvaluations {
  id: string;
  callReportId: string;
  workingTitle: string;
  writerName: string;
  meetingDate: string;
  createdAt: string;
  updatedAt: string;
  evaluationCount: number;
  segregatedEvaluations: SegregatedEvaluations;
  attachments: AttachmentItem[];
}

interface EpisodeWithEvaluations {
  id: string;
  episodeNumber: number;
  title: string;
  callReportId: string;
  dramaTitle: string;
  createdAt: string;
  updatedAt: string;
  attachmentName: string | null;
  evaluationCount: number;
  segregatedEvaluations: SegregatedEpisodicEvaluations;
}

interface InternalProject {
  callReportId: string;
  callReportDisplayId: string;
  title: string;
  writerName: string;
  meetingDate: string;
  attachments: AttachmentItem[];
  oneLiner: CallReportWithEvaluations | null;
  episodes: EpisodeWithEvaluations[];
}

interface InternalEvaluationsTabProps {
  currentUser: any;
}

function mergeProjects(
  callReports: CallReportWithEvaluations[],
  episodes: EpisodeWithEvaluations[],
): InternalProject[] {
  const map = new Map<string, InternalProject>();

  for (const cr of callReports) {
    map.set(cr.id, {
      callReportId: cr.id,
      callReportDisplayId: cr.callReportId,
      title: cr.workingTitle,
      writerName: cr.writerName,
      meetingDate: cr.meetingDate,
      attachments: cr.attachments || [],
      oneLiner: cr,
      episodes: [],
    });
  }

  for (const ep of episodes) {
    if (!ep.callReportId) continue;
    const existing = map.get(ep.callReportId);
    if (existing) {
      existing.episodes.push(ep);
    } else {
      map.set(ep.callReportId, {
        callReportId: ep.callReportId,
        callReportDisplayId: "",
        title: ep.dramaTitle,
        writerName: "",
        meetingDate: "",
        attachments: [],
        oneLiner: null,
        episodes: [ep],
      });
    }
  }

  // Sort episodes by number within each project
  for (const proj of map.values()) {
    proj.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  // Sort: projects with more evaluations first
  return Array.from(map.values()).sort((a, b) => {
    const aTotal = (a.oneLiner?.evaluationCount || 0) + a.episodes.reduce((s, e) => s + e.evaluationCount, 0);
    const bTotal = (b.oneLiner?.evaluationCount || 0) + b.episodes.reduce((s, e) => s + e.evaluationCount, 0);
    return bTotal - aTotal;
  });
}

export function InternalEvaluationsTab({ currentUser }: InternalEvaluationsTabProps) {
  const [projects, setProjects] = useState<InternalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [callReportsRes, episodesRes] = await Promise.all([
          fetch("/api/management/call-reports-with-evaluations"),
          fetch("/api/management/episodes-with-evaluations"),
        ]);

        if (!callReportsRes.ok) throw new Error("Failed to fetch call reports");
        if (!episodesRes.ok) throw new Error("Failed to fetch episodes");

        const callReportsData = await callReportsRes.json();
        const episodesData = await episodesRes.json();

        setProjects(
          mergeProjects(
            callReportsData.callReports || [],
            episodesData.episodes || [],
          )
        );
      } catch (err: any) {
        console.error("Error fetching evaluations:", err);
        setError(err.message || "Failed to load evaluations");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Error loading evaluations</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filtered = q
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.writerName.toLowerCase().includes(q) ||
          p.callReportDisplayId.toLowerCase().includes(q) ||
          p.episodes.some((ep) => `ep${ep.episodeNumber}`.includes(q) || (ep.title || "").toLowerCase().includes(q))
      )
    : projects;

  const totalOL = filtered.filter((p) => p.oneLiner).length;
  const totalEp = filtered.reduce((s, p) => s + p.episodes.length, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Search by title, writer, or report ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium text-slate-700">
              {projects.length === 0 ? "No Evaluations Found" : "No matches"}
            </p>
            <p className="text-sm">
              {projects.length === 0
                ? "Evaluations will appear here once stories have been evaluated."
                : "No projects match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
            {totalOL > 0 && ` · ${totalOL} one-liner${totalOL !== 1 ? "s" : ""}`}
            {totalEp > 0 && ` · ${totalEp} episode${totalEp !== 1 ? "s" : ""}`}
          </p>
          <div className="space-y-3">
            {filtered.map((proj) => (
              <InternalProjectCard key={proj.callReportId} project={proj} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Project Card ────────────────────────────────────────────────────────────

function InternalProjectCard({ project: p }: { project: InternalProject }) {
  const [expanded, setExpanded] = useState(false);

  const totalEvals = (p.oneLiner?.evaluationCount || 0) + p.episodes.reduce((s, e) => s + e.evaluationCount, 0);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 border-b bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-900 truncate">{p.title}</h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
            {p.writerName && <span>{p.writerName}</span>}
            {p.writerName && p.meetingDate && <span>·</span>}
            {p.meetingDate && <span>{formatDate(p.meetingDate)}</span>}
          </div>
        </div>
        {p.callReportDisplayId && (
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            {p.callReportDisplayId}
          </Badge>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {p.oneLiner && (
            <Badge className="text-xs bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-100">
              <FileText className="h-3 w-3 mr-1" />
              One-Liner
            </Badge>
          )}
          {p.episodes.length > 0 && (
            <Badge className="text-xs bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-100">
              <Film className="h-3 w-3 mr-1" />
              {p.episodes.length} ep{p.episodes.length !== 1 ? "s" : ""}
            </Badge>
          )}
          <span className="text-sm font-bold text-slate-600">{totalEvals} eval{totalEvals !== 1 ? "s" : ""}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="p-4 space-y-5">
          {/* Attachments */}
          {p.attachments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Attachments ({p.attachments.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {p.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/api/attachments/download?path=${encodeURIComponent(att.filePath)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-xs"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[200px]">{att.fileName}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* One-Liner Section */}
          {p.oneLiner && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> One-Liner Evaluations ({p.oneLiner.evaluationCount})
              </p>
              {p.oneLiner.segregatedEvaluations.total > 0 ? (
                <SegregatedEvaluationsDisplay evaluations={p.oneLiner.segregatedEvaluations} />
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">No evaluations available</div>
              )}
            </div>
          )}

          {/* Episodes Section */}
          {p.episodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5" /> Episodes ({p.episodes.length})
              </p>
              <div className="space-y-2">
                {p.episodes.map((ep) => (
                  <EpisodeSubCard key={ep.id} episode={ep} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Episode Sub-Card ────────────────────────────────────────────────────────

function EpisodeSubCard({ episode: ep }: { episode: EpisodeWithEvaluations }) {
  const [expanded, setExpanded] = useState(false);
  const epLabel = `EP${ep.episodeNumber}${ep.title ? ` — ${ep.title}` : ""}`;

  return (
    <div className="rounded-lg border bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
        <span className="font-medium text-sm text-slate-800 flex-1 min-w-0 truncate">{epLabel}</span>
        <span className="text-xs text-slate-500 shrink-0">{ep.evaluationCount} eval{ep.evaluationCount !== 1 ? "s" : ""}</span>
      </button>
      {ep.attachmentName && (
        <a
          href={`/api/episodes/download/${ep.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mx-4 mb-2 px-2.5 py-1 rounded-md border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-xs w-fit"
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[200px]">{ep.attachmentName}</span>
        </a>
      )}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-4 bg-slate-50/50">
          {ep.segregatedEvaluations.total > 0 ? (
            <SegregatedEpisodicEvaluationsDisplay evaluations={ep.segregatedEvaluations} />
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">No evaluations available</div>
          )}
        </div>
      )}
    </div>
  );
}
