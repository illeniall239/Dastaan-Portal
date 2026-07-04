"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Pencil,
} from "lucide-react";

interface RevisionStatus {
  hasEvaluated: boolean;
  evaluatorName?: string;
}

interface Revision {
  id: string;
  revision_number: number;
  attachment_url?: string | null;
  attachment_name?: string | null;
  comment?: string | null;
  created_at: string;
  uploaded_by_user?: { name: string } | null;
}

interface RevisionEvaluateListProps {
  entityId: string;
  entityType: "episode" | "call-report";
  revisionCount: number;
  portalPrefix: string;
  originalFileName?: string | null;
  originalDate?: string | null;
  /** Override the default evaluate URL pattern (e.g. "/management/evaluate/episode") */
  evaluateBasePath?: string;
}

export function RevisionEvaluateList({
  entityId,
  entityType,
  revisionCount,
  portalPrefix,
  originalFileName,
  originalDate,
  evaluateBasePath,
}: RevisionEvaluateListProps) {
  const router = useRouter();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [statuses, setStatuses] = useState<{
    original: RevisionStatus;
    revisions: Record<string, RevisionStatus>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Build URLs based on entity type
        const revisionsUrl =
          entityType === "episode"
            ? `/api/episodes/${entityId}/revisions`
            : `/api/call-reports/${entityId}/revisions`;

        const statusesUrl =
          entityType === "episode"
            ? `/api/episodic-evaluations/episode/${entityId}/revision-statuses`
            : `/api/evaluator/forms/by-call-report/${entityId}/revision-statuses`;

        const [revisionsRes, statusesRes] = await Promise.all([
          revisionCount > 0
            ? fetch(`${revisionsUrl}?_t=${Date.now()}`, { cache: "no-store" })
            : Promise.resolve(null),
          fetch(`${statusesUrl}?_t=${Date.now()}`, { cache: "no-store" }),
        ]);

        if (revisionsRes && revisionsRes.ok) {
          const revisionsData = await revisionsRes.json();
          setRevisions(revisionsData.revisions || []);
        }

        if (statusesRes && statusesRes.ok) {
          const statusesData = await statusesRes.json();
          setStatuses(statusesData.statuses || null);
        }
      } catch (error) {
        console.error("Error fetching revision data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entityId, entityType, revisionCount]);

  const getEvaluateUrl = (revisionId?: string) => {
    const basePath = evaluateBasePath
      ? `${evaluateBasePath}/${entityId}`
      : entityType === "episode"
        ? `/${portalPrefix}/episodes/${entityId}`
        : `/${portalPrefix}/evaluate/${entityId}`;

    return revisionId ? `${basePath}?revision_id=${revisionId}` : basePath;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="text-xs text-muted-foreground">Loading submissions...</span>
        </div>
      </div>
    );
  }

  const originalStatus = statuses?.original || { hasEvaluated: false };

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-100 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-600">
          Submissions ({1 + revisions.length})
        </p>
      </div>

      <div className="divide-y divide-slate-200">
        {/* Original Submission */}
        <div className="flex items-center justify-between px-3 py-2.5 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0 bg-white">
              Original
            </Badge>
            <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
              {originalFileName ? (
                <span className="flex items-center gap-0.5 truncate">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{originalFileName}</span>
                </span>
              ) : (
                <span className="truncate">Original Submission</span>
              )}
              {originalDate && (
                <span className="shrink-0">&middot; {formatDate(originalDate)}</span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {originalStatus.hasEvaluated ? (
              <>
                <Badge className="h-5 text-[10px] bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                  Evaluated{originalStatus.evaluatorName ? ` by ${originalStatus.evaluatorName}` : ""}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => router.push(getEvaluateUrl())}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => router.push(getEvaluateUrl())}
              >
                <ClipboardCheck className="h-3 w-3" />
                Evaluate
              </Button>
            )}
          </div>
        </div>

        {/* Revisions */}
        {revisions.map((rev) => {
          const revStatus = statuses?.revisions[rev.id] || { hasEvaluated: false };
          return (
            <div key={rev.id} className="flex items-center justify-between px-3 py-2.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0 bg-blue-50 text-blue-700">
                  Rev {rev.revision_number}
                </Badge>
                <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
                  {rev.attachment_name && (
                    <span className="flex items-center gap-0.5 truncate">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{rev.attachment_name}</span>
                    </span>
                  )}
                  <span className="shrink-0">&middot; {formatDate(rev.created_at)}</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                {revStatus.hasEvaluated ? (
                  <>
                    <Badge className="h-5 text-[10px] bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />
                      Evaluated{revStatus.evaluatorName ? ` by ${revStatus.evaluatorName}` : ""}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => router.push(getEvaluateUrl(rev.id))}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => router.push(getEvaluateUrl(rev.id))}
                  >
                    <ClipboardCheck className="h-3 w-3" />
                    Evaluate
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* No revisions message */}
        {revisions.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground italic">
            No revisions yet
          </div>
        )}
      </div>
    </div>
  );
}
