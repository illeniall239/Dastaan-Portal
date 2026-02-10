"use client";

import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

interface DraftRestoreBannerProps {
  /** Whether a draft exists */
  hasDraft: boolean;
  /** Whether the draft check has completed (prevents flash) */
  draftLoaded: boolean;
  /** Called when user clicks "Restore Draft" */
  onRestore: () => void;
  /** Called when user clicks "Discard" */
  onDiscard: () => void;
  /** The updated_at timestamp of the draft (ISO string) */
  lastUpdated?: string | null;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

export function DraftRestoreBanner({
  hasDraft,
  draftLoaded,
  onRestore,
  onDiscard,
  lastUpdated,
}: DraftRestoreBannerProps) {
  if (!draftLoaded || !hasDraft) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <FileText className="h-4 w-4 text-amber-600 shrink-0" />
      <span className="text-amber-800 flex-1">
        You have an unsaved draft
        {lastUpdated ? ` from ${timeAgo(lastUpdated)}` : ""}.
      </span>
      <div className="flex gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={onDiscard}
        >
          <X className="h-3 w-3 mr-1" />
          Discard
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          onClick={onRestore}
        >
          Restore Draft
        </Button>
      </div>
    </div>
  );
}
