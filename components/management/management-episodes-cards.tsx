"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareLinkDialog } from "@/components/management/share-link-dialog";
import { Share2, FileText, CheckCircle, Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface ManagementEpisodesCardsProps {
  episodes: any[];
}

export function ManagementEpisodesCards({ episodes }: ManagementEpisodesCardsProps) {
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const debouncedSearch = useDebounce(search, 300);

  const filteredEpisodes = useMemo(() => {
    let results = [...episodes];

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      results = results.filter((ep) => {
        const fields = [
          ep.title,
          ep.stories?.title,
          ep.stories?.writer_originator_name,
          ep.stories?.genre,
          ep.call_reports?.working_title,
          ep.call_reports?.writer_name,
          ep.call_reports?.creator?.team?.name,
        ];
        return fields.some((f) => f && String(f).toLowerCase().includes(q));
      });
    }

    results.sort((a, b) => {
      const dateA = new Date(a.original_submission_date || a.created_at).getTime();
      const dateB = new Date(b.original_submission_date || b.created_at).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return results;
  }, [episodes, debouncedSearch, sortBy]);

  const episodesBySource: Record<
    string,
    { story: any; callReport: any; episodes: any[] }
  > = filteredEpisodes.reduce((acc, episode) => {
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
      {/* Search & Sort */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, writer, genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "oldest")}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {debouncedSearch && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredEpisodes.length} of {episodes.length} episodes
          </p>
        )}
      </div>

      {filteredEpisodes.length === 0 && debouncedSearch ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No episodes match your search</p>
          </CardContent>
        </Card>
      ) : (
      <div className="space-y-4">
        {Object.entries(episodesBySource).map(([sourceId, { story, callReport, episodes: groupedEpisodes }]) => {
          const totalEpisodes = groupedEpisodes.length;
          const evaluatedCount = groupedEpisodes.filter((ep) => ep.evaluation_count > 0).length;
          const title = story?.title || callReport?.working_title || "Untitled";
          const genre = story?.genre;
          const writer = story?.writer_originator_name || callReport?.writer_name || "Unknown writer";
          const labelPrefix = story ? "Story" : "Writer Engagement";
          const teamName = callReport?.creator?.team?.name;

          return (
            <Card key={sourceId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{title}</CardTitle>
                      {genre && <Badge variant="outline">{genre}</Badge>}
                      {teamName && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {teamName}
                        </Badge>
                      )}
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
      )}

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
