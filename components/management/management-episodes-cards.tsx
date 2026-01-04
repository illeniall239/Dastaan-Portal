"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareLinkDialog } from "@/components/management/share-link-dialog";
import { Share2, FileText, CheckCircle, Star } from "lucide-react";

interface ManagementEpisodesCardsProps {
  episodes: any[];
}

export function ManagementEpisodesCards({ episodes }: ManagementEpisodesCardsProps) {
  const router = useRouter();
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const episodesBySource: Record<
    string,
    { story: any; callReport: any; episodes: any[] }
  > = episodes.reduce((acc, episode) => {
    const key = episode.story_id || episode.call_report_id || episode.id;
    if (!acc[key]) {
      acc[key] = {
        story: episode.stories,
        callReport: episode.call_reports,
        episodes: [],
      };
    }
    acc[key].episodes.push(episode);
    return acc;
  }, {} as Record<string, { story: any; callReport: any; episodes: any[] }>);

  const handleShare = (episode: any) => {
    setSelectedEpisode(episode);
    setIsShareDialogOpen(true);
  };

  const handleEvaluate = (episodeId: string) => {
    router.push(`/management/evaluate/episode/${episodeId}`);
  };

  if (episodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No episodes found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {Object.entries(episodesBySource).map(([sourceId, { story, callReport, episodes: groupedEpisodes }]) => {
          const totalEpisodes = groupedEpisodes.length;
          const evaluatedCount = groupedEpisodes.filter((ep) => ep.evaluation_count > 0).length;
          const title = story?.title || callReport?.working_title || "Untitled";
          const genre = story?.genre;
          const writer = story?.writer_originator_name || callReport?.writer_name || "Unknown writer";
          const labelPrefix = story ? "Story" : "Writer Engagement";

          return (
            <Card key={sourceId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{title}</CardTitle>
                      {genre && <Badge variant="outline">{genre}</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{labelPrefix} lead: {writer}</span>
                      <span>•</span>
                      <span>
                        {totalEpisodes} Episode{totalEpisodes !== 1 ? "s" : ""}
                      </span>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          {evaluatedCount}/{totalEpisodes} Evaluated
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groupedEpisodes
                    .sort((a, b) => a.episode_number - b.episode_number)
                    .map((episode) => (
                      <div
                        key={episode.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <Badge variant="secondary">Episode {episode.episode_number}</Badge>
                            {episode.title && <span className="font-medium">{episode.title}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {episode.evaluation_count > 0 ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>
                                  {episode.evaluation_count} Evaluation{episode.evaluation_count !== 1 ? "s" : ""}
                                </span>
                              </div>
                            ) : (
                              <span className="text-orange-600">Not Evaluated</span>
                            )}
                            {episode.attachment_name && (
                              <>
                                <span>•</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/api/episodes/download/${episode.id}`, "_blank");
                                  }}
                                  className="text-primary hover:underline text-left"
                                >
                                  {episode.attachment_name}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={episode.evaluation_count > 0 ? "outline" : "default"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEvaluate(episode.id);
                            }}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            {episode.evaluation_count > 0 ? "View Evaluation" : "Evaluate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShare(episode)}
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Share Externally
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedEpisode && (
        <ShareLinkDialog
          isOpen={isShareDialogOpen}
          onClose={() => {
            setIsShareDialogOpen(false);
            setSelectedEpisode(null);
          }}
          contentType="episode"
          contentId={selectedEpisode.id}
          contentTitle={`Episode ${selectedEpisode.episode_number}${
            selectedEpisode.title ? ` - ${selectedEpisode.title}` : ""
          }`}
        />
      )}
    </>
  );
}
