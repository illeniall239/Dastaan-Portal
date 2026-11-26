"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { EpisodicEvaluationForm } from "@/components/episodic-evaluations/episodic-evaluation-form";
import { EpisodeRevisions } from "@/components/episodes/episode-revisions";
import { EvaluatingVersionBanner } from "@/components/ui/evaluating-version-banner";
import type { Episode, EpisodicEvaluation } from "@/types";

/**
 * The content team's view of their content head's evaluation of an episode (original or a revision):
 * exactly what the head sees on their own evaluation, read-only.
 */
export default function ContentHeadEpisodeEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const searchParams = useSearchParams();
  const revisionId = searchParams.get("revision_id") || undefined;
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [evaluation, setEvaluation] = useState<EpisodicEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setEpisodeId(p.id));
  }, [params]);

  useEffect(() => {
    if (!episodeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const evalParams = revisionId ? `?revision_id=${revisionId}&_t=${Date.now()}` : `?_t=${Date.now()}`;
        const [epRes, evRes] = await Promise.all([
          fetch(`/api/episodes/${episodeId}`),
          // For the content team this returns their content head's evaluation
          fetch(`/api/episodic-evaluations/episode/${episodeId}${evalParams}`, { cache: "no-store" }),
        ]);
        const epData = await epRes.json();
        const evData = await evRes.json();
        if (cancelled) return;
        setEpisode(epRes.ok ? epData.episode : null);
        setEvaluation(evRes.ok ? evData.evaluation || null : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [episodeId, revisionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading evaluation...
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="mobile-container mobile-section max-w-4xl mx-auto">
        <Card className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">This episode doesn&apos;t exist or has been removed.</p>
          <BackButton fallbackHref="/content-department/episodes" />
        </Card>
      </div>
    );
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/content-department/episodes" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">View Evaluation</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {evaluation
              ? `${(evaluation as any).evaluator?.name ?? "Your content head"}'s evaluation of this episode`
              : "Your content head hasn't evaluated this version yet"}
          </p>
        </div>
      </div>

      <EvaluatingVersionBanner
        apiBasePath="/api/episodes"
        storageBucket="episodes"
        entityId={episode.id}
        revisionId={revisionId}
        entityLabel={`EP${episode.episode_number}`}
      />

      <EpisodeRevisions episodeId={episode.id} activeRevisionId={revisionId} canEdit={false} />

      {evaluation && (
        <EpisodicEvaluationForm
          key={`${episode.id}:${revisionId ?? ""}`}
          episode={episode}
          revisionId={revisionId}
          existingEvaluation={evaluation}
          onSubmit={async () => {}}
          disabled
        />
      )}
    </div>
  );
}
