"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

/** One evaluable version: an episode's original submission or one of its revisions */
export interface EpisodeVersion {
  episode_id: string;
  episode_number: number;
  revision_id: string | null;
  revision_number: number | null;
  evaluated: boolean;
}

/**
 * Every version of a project's episodes in evaluation order (EP1, EP1 Rev 1, Rev 2…, EP2),
 * marked evaluated by the same team rules as the Original/Rev rows on the page.
 */
function useProjectVersions(callReportId: string | null | undefined, refreshKey: unknown) {
  const [versions, setVersions] = useState<EpisodeVersion[] | null>(null);

  useEffect(() => {
    if (!callReportId) return;
    let cancelled = false;
    fetch(`/api/episodic-evaluations/project/${callReportId}/versions`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => { if (!cancelled && body) setVersions(body.versions || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [callReportId, refreshKey]);

  return versions;
}

const isSame = (v: EpisodeVersion, episodeId: string, revisionId: string | null) =>
  v.episode_id === episodeId && v.revision_id === revisionId;

/**
 * The next version still to evaluate: the ones after this one first (its own later revisions,
 * then the next episodes), then any earlier ones left behind. Never the current one.
 */
export function nextToEvaluate(versions: EpisodeVersion[], episodeId: string, revisionId: string | null): EpisodeVersion | null {
  const i = versions.findIndex((v) => isSame(v, episodeId, revisionId));
  const ordered = [...versions.slice(i + 1), ...versions.slice(0, Math.max(i, 0))];
  return ordered.find((v) => !v.evaluated && !isSame(v, episodeId, revisionId)) ?? null;
}

export const versionLabel = (v: { episode_number: number; revision_number: number | null }) =>
  v.revision_number ? `EP${v.episode_number} Rev ${v.revision_number}` : `EP${v.episode_number}`;

interface EpisodeNavProps {
  episode: { id: string; episode_number: number; call_report_id?: string | null };
  /** The revision being evaluated on this page, if any */
  revisionId?: string | null;
  projectTitle?: string | null;
  /** Page for an episode (or one of its revisions) in this portal */
  hrefFor: (episodeId: string, revisionId?: string | null) => string;
  backHref: string;
  /** Set right after this version's evaluation was submitted: shows what to evaluate next */
  justEvaluated?: boolean;
}

/** ‹ EP2 · EP4 › arrows across a project's episodes, plus the "evaluate next" bar after submitting */
export function EpisodeNav({ episode, revisionId = null, projectTitle, hrefFor, backHref, justEvaluated }: EpisodeNavProps) {
  const versions = useProjectVersions(episode.call_report_id, justEvaluated);
  if (!versions || versions.length === 0) return null;

  const episodes = versions.filter((v) => v.revision_id === null);
  const i = episodes.findIndex((v) => v.episode_id === episode.id);
  const prev = i > 0 ? episodes[i - 1] : null;
  const next = i >= 0 && i < episodes.length - 1 ? episodes[i + 1] : null;
  const current = versions.find((v) => isSame(v, episode.id, revisionId));
  const upNext = nextToEvaluate(versions, episode.id, revisionId);
  const project = projectTitle || "this project";

  return (
    <div className="space-y-3">
      {justEvaluated && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">{versionLabel(current ?? { episode_number: episode.episode_number, revision_number: null })} evaluated.</span>{" "}
              {upNext
                ? `Next up in ${project}: ${versionLabel(upNext)}.`
                : `Every episode${versions.length > episodes.length ? " and revision" : ""} of ${project} is evaluated.`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild size="sm" variant="outline">
              <Link href={backHref}>Back to episodes</Link>
            </Button>
            {upNext && (
              <Button asChild size="sm">
                <Link href={hrefFor(upNext.episode_id, upNext.revision_id)}>
                  Evaluate {versionLabel(upNext)} <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {episodes.length > 1 && i >= 0 && (
        <div className="flex items-center justify-between gap-2">
          {prev ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={hrefFor(prev.episode_id)}><ChevronLeft className="h-4 w-4 mr-1" /> EP{prev.episode_number}</Link>
            </Button>
          ) : <span />}
          <span className="text-xs text-muted-foreground">
            Episode {i + 1} of {episodes.length}
          </span>
          {next ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={hrefFor(next.episode_id)}>EP{next.episode_number} <ChevronRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
