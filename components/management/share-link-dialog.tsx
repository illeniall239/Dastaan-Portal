"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ShareLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: "episode" | "one_liner" | "call_report";
  contentId: string;
  contentTitle: string;
}

interface Episode {
  id: string;
  episode_number: number;
  title: string | null;
}

export function ShareLinkDialog({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
}: ShareLinkDialogProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(30);

  // Episode selection state
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set());
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [includeOneLiner, setIncludeOneLiner] = useState(true);

  // Fetch linked episodes when dialog opens for call_report
  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!isOpen || contentType !== "call_report") {
        setEpisodes([]);
        setSelectedEpisodeIds(new Set());
        return;
      }

      setLoadingEpisodes(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("episodes")
          .select("id, episode_number, title")
          .eq("call_report_id", contentId)
          .order("episode_number", { ascending: true });

        if (error) {
          console.error("Error fetching episodes:", error);
          toast.error("Failed to fetch linked episodes");
          return;
        }

        setEpisodes(data || []);
        // Auto-select all episodes by default
        if (data && data.length > 0) {
          setSelectedEpisodeIds(new Set(data.map((ep) => ep.id)));
        }
      } catch (error) {
        console.error("Error fetching episodes:", error);
        toast.error("Failed to fetch linked episodes");
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [isOpen, contentType, contentId]);

  const toggleEpisode = (episodeId: string) => {
    setSelectedEpisodeIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(episodeId)) {
        newSet.delete(episodeId);
      } else {
        newSet.add(episodeId);
      }
      return newSet;
    });
  };

  const selectAllEpisodes = () => {
    setSelectedEpisodeIds(new Set(episodes.map((ep) => ep.id)));
  };

  const deselectAllEpisodes = () => {
    setSelectedEpisodeIds(new Set());
  };

  const handleGenerate = async () => {
    // Validation: Must select at least one item
    if (contentType === "call_report") {
      if (!includeOneLiner && selectedEpisodeIds.size === 0) {
        toast.error("Please select at least one item to share (One-Liner or Episodes)");
        return;
      }
    }

    setIsGenerating(true);

    try {
      const requestBody: any = {
        expires_in_days: expiresInDays,
        notes: `Link for ${contentTitle}`,
      };

      // Determine what to send based on selections
      if (contentType === "call_report") {
        if (includeOneLiner) {
          // Include call_report as primary content
          requestBody.content_type = "call_report";
          requestBody.content_id = contentId;
          if (selectedEpisodeIds.size > 0) {
            requestBody.episode_ids = Array.from(selectedEpisodeIds);
          }
        } else {
          // Episode-only mode
          requestBody.content_type = "episode";
          requestBody.content_id = null;
          requestBody.episode_ids = Array.from(selectedEpisodeIds);
        }
      } else {
        // Non-call_report content (original behavior)
        requestBody.content_type = contentType;
        requestBody.content_id = contentId;
      }

      const response = await fetch("/api/management/external/generate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate link");
      }

      setGeneratedLink(data.link.url);
      toast.success("Shareable link generated!");
      router.refresh();
    } catch (error: any) {
      console.error("Error generating link:", error);
      toast.error(error.message || "Failed to generate link");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setExpiresInDays(30);
    setEpisodes([]);
    setSelectedEpisodeIds(new Set());
    setIncludeOneLiner(true); // Reset to checked
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Share Externally: {contentType === "call_report" ? "One-Liner" : "Episode"}
          </DialogTitle>
          <DialogDescription>
            {contentTitle}
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <h4 className="font-semibold text-green-900">Link Generated Successfully!</h4>
                  <div className="bg-white border rounded p-3 flex items-center justify-between gap-2">
                    <code className="text-sm text-gray-700 flex-1 break-all">
                      {generatedLink}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToClipboard}
                      className="flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToClipboard}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="flex-1"
                    >
                      <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Link
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Episode Selection (only for call_report with linked episodes) */}
            {contentType === "call_report" && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Content to Include</Label>

                {loadingEpisodes ? (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading episodes...
                  </div>
                ) : (
                  <>
                    {/* One-Liner checkbox (can be unchecked) */}
                    <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md">
                      <Checkbox
                        checked={includeOneLiner}
                        onCheckedChange={(checked) => setIncludeOneLiner(!!checked)}
                        id="one-liner-check"
                      />
                      <label
                        htmlFor="one-liner-check"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        One-Liner
                      </label>
                    </div>

                    {/* Show episodes if any exist */}
                    {episodes.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm text-muted-foreground">
                            Linked Episodes ({episodes.length})
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={selectAllEpisodes}
                              className="h-7 text-xs"
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={deselectAllEpisodes}
                              className="h-7 text-xs"
                            >
                              Deselect All
                            </Button>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                          {episodes.map((episode) => (
                            <div
                              key={episode.id}
                              className="flex items-center space-x-2 p-3 hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={`episode-${episode.id}`}
                                checked={selectedEpisodeIds.has(episode.id)}
                                onCheckedChange={() => toggleEpisode(episode.id)}
                              />
                              <label
                                htmlFor={`episode-${episode.id}`}
                                className="text-sm flex-1 cursor-pointer"
                              >
                                Episode {episode.episode_number}
                                {episode.title ? `: ${episode.title}` : ""}
                              </label>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {selectedEpisodeIds.size} of {episodes.length} episodes selected
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="expires">Expires In (Days)</Label>
              <Input
                id="expires"
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
                min={1}
                max={365}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                External evaluators will be able to access and evaluate this content through the generated link without requiring a system account.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Link"
                )}
              </Button>
              <Button onClick={handleClose} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
