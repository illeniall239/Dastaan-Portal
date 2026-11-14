"use client";

import { useQuery } from "@tanstack/react-query";
import { FilePenLine, FileText, Download, History } from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";

export interface Revision {
  id: string;
  revision_number: number;
  attachment_url: string | null;
  attachment_name: string | null;
  comment: string | null;
  created_at: string;
  original_submission_date?: string | null;
  uploaded_by_user?: { name?: string } | null;
}

interface EvaluatingVersionBannerProps {
  /** "/api/episodes" or "/api/call-reports" */
  apiBasePath: string;
  /** Storage bucket of the revision files: "episodes" or "attachments" */
  storageBucket: string;
  entityId: string;
  /** The revision being evaluated; none means the original submission */
  revisionId?: string | null;
  /** How to name the item, e.g. "EP3" or "this one-liner" */
  entityLabel: string;
  className?: string;
}

/** An episode's or one-liner's revisions, shared (one request) by everything on the page that needs them */
export function useRevisions(apiBasePath: string, entityId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["revisions", apiBasePath, entityId],
    queryFn: async (): Promise<Revision[]> => {
      const res = await fetch(`${apiBasePath}/${entityId}/revisions`, { cache: "no-store" });
      if (!res.ok) return [];
      return (await res.json()).revisions || [];
    },
    enabled: !!entityId && enabled,
    staleTime: 30_000,
  });
}

/** "Episode 3 (Rev #2)" when a revision is being evaluated, else "Episode 3" */
export function episodeVersionLabel(episodeNumber: number, revisionNumber?: number | null) {
  return revisionNumber ? `Episode ${episodeNumber} (Rev #${revisionNumber})` : `Episode ${episodeNumber}`;
}

/**
 * Says exactly which version is being evaluated: "Revision 2 of EP3" with its file, or the
 * original submission when later revisions exist. Shown above the revisions list, which lists
 * every version and would otherwise leave it unclear.
 */
export function EvaluatingVersionBanner({ apiBasePath, storageBucket, entityId, revisionId, entityLabel, className = "" }: EvaluatingVersionBannerProps) {
  const { data: revisions } = useRevisions(apiBasePath, entityId);

  if (!revisions) return null;

  if (!revisionId) {
    if (revisions.length === 0) return null;
    return (
      <div className={`p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2 ${className}`}>
        <History className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-700">
          You are evaluating the <span className="font-semibold">original submission</span> of {entityLabel}.{" "}
          It has {revisions.length} later revision{revisions.length === 1 ? "" : "s"}, listed below — evaluate
          one of those from its own button.
        </p>
      </div>
    );
  }

  const rev = revisions.find((r) => r.id === revisionId);
  if (!rev) {
    return (
      <div className={`p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 ${className}`}>
        <FilePenLine className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">This revision of {entityLabel} no longer exists.</p>
      </div>
    );
  }

  const downloadHref = rev.attachment_url
    ? `/api/storage/download?url=${encodeURIComponent(rev.attachment_url)}&bucket=${encodeURIComponent(storageBucket)}&name=${encodeURIComponent(rev.attachment_name || "")}`
    : null;

  return (
    <div className={`p-4 bg-amber-50 border-2 border-amber-300 rounded-lg space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <FilePenLine className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-base text-amber-900">
          You are evaluating <span className="font-bold">Revision {rev.revision_number}</span> of {entityLabel}
          <span className="text-amber-700 text-sm"> (of {revisions.length})</span>
        </p>
      </div>
      <div className="pl-7 space-y-1">
        {downloadHref && (
          <a
            href={downloadHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-sm font-medium text-amber-900"
          >
            <FileText className="h-4 w-4" />
            <span className="truncate max-w-[300px]">{rev.attachment_name || "Revision file"}</span>
            <Download className="h-4 w-4 opacity-60" />
          </a>
        )}
        <p className="text-xs text-amber-800">
          Uploaded by {rev.uploaded_by_user?.name || "Unknown"} · {formatDate(rev.original_submission_date || rev.created_at)}
        </p>
        {rev.comment && <p className="text-sm text-amber-900 line-clamp-3">&ldquo;{rev.comment}&rdquo;</p>}
      </div>
    </div>
  );
}
