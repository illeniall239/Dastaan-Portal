"use client";

import { ContentRevisions } from "@/components/ui/content-revisions";

interface EpisodeRevisionsProps {
  episodeId: string;
  sourceId?: string | null;
  canEdit: boolean;
  compact?: boolean;
  userRole?: string;
  evaluateUrl?: string;
  /** The revision being evaluated on this page */
  activeRevisionId?: string | null;
}

/**
 * Wrapper around ContentRevisions for episodes.
 * Uses /api/episodes as the API base and "episodes" storage bucket.
 */
export function EpisodeRevisions({
  episodeId,
  sourceId,
  canEdit,
  compact = false,
  userRole,
  evaluateUrl,
  activeRevisionId,
}: EpisodeRevisionsProps) {
  return (
    <ContentRevisions
      entityId={episodeId}
      apiBasePath="/api/episodes"
      storageBucket="episodes"
      sourceId={sourceId}
      canEdit={canEdit}
      compact={compact}
      userRole={userRole}
      evaluateUrl={evaluateUrl}
      entityType="episode"
      activeRevisionId={activeRevisionId}
    />
  );
}
