"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EpisodeFileUpload } from "./episode-file-upload";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface EpisodeFormEntry {
  episode_number: number;
  file: File | null;
  additional_info: string;
  initial_assessment?: number;
}

interface EpisodeUploadFormProps {
  episodes: EpisodeFormEntry[];
  onEpisodesChange: (episodes: EpisodeFormEntry[]) => void;
  disabled?: boolean;
  existingEpisodeNumbers?: number[];
  uploadProgress?: Record<number, number>; // episode number to progress percentage
}

export function EpisodeUploadForm({
  episodes,
  onEpisodesChange,
  disabled = false,
  existingEpisodeNumbers = [],
  uploadProgress = {},
}: EpisodeUploadFormProps) {
  const updateEpisodes = (list: EpisodeFormEntry[]) => {
    // Sort episodes by episode_number before updating parent
    const sorted = [...list].sort((a, b) => a.episode_number - b.episode_number);
    onEpisodesChange(sorted);
  };

  const addEpisode = () => {
    const nextEpisodeNumber =
      episodes.length > 0
        ? Math.max(...episodes.map((ep) => ep.episode_number)) + 1
        : 1;

    const hasAssessment = episodes.length > 0 && episodes[0].initial_assessment !== undefined;
    const newEpisode: EpisodeFormEntry = {
      episode_number: nextEpisodeNumber,
      file: null,
      additional_info: "",
      ...(hasAssessment ? { initial_assessment: 5 } : {}),
    };

    updateEpisodes([...episodes, newEpisode]);
  };

  const removeEpisode = (index: number) => {
    updateEpisodes(episodes.filter((_, i) => i !== index));
  };

  const updateEpisode = (index: number, field: keyof EpisodeFormEntry, value: any) => {
    const updated = episodes.map((episode, i) =>
      i === index ? { ...episode, [field]: value } : episode
    );
    updateEpisodes(updated);
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {episodes.map((episode, index) => (
        <Card key={`episode-${episode.episode_number}-${index}`} className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Header with Episode Number and Remove Button */}
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Episode {episode.episode_number}</h3>
              {episodes.length > 1 && !disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeEpisode(index)}
                  className="touch-target"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Remove</span>
                  <span className="sm:hidden">Remove</span>
                </Button>
              )}
            </div>

            {/* Episode Number */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`episode-${episode.episode_number}-number`} className="text-sm sm:text-base">
                  Episode Number <span className="text-red-500">*</span>
                </Label>
                {existingEpisodeNumbers.includes(episode.episode_number) && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Already Exists
                  </Badge>
                )}
              </div>
              <Input
                id={`episode-${episode.episode_number}-number`}
                type="number"
                min="1"
                value={episode.episode_number || ""}
                data-episode-number={episode.episode_number}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string or valid number during typing
                  updateEpisode(index, "episode_number", value === "" ? "" : parseInt(value) || "");
                }}
                onBlur={(e) => {
                  // Validate on blur - ensure minimum value of 1
                  const value = parseInt(e.target.value);
                  if (!value || value < 1) {
                    updateEpisode(index, "episode_number", 1);
                  }
                }}
                disabled={disabled}
                required
                className={existingEpisodeNumbers.includes(episode.episode_number) ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {existingEpisodeNumbers.includes(episode.episode_number) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  This episode number already exists for this project
                </p>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Attachment (Optional)</Label>
              <EpisodeFileUpload
                file={episode.file}
                onFileSelect={(file) => updateEpisode(index, "file", file)}
                onFileRemove={() => updateEpisode(index, "file", null)}
                disabled={disabled}
                uploadProgress={uploadProgress[episode.episode_number]}
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-2">
              <Label htmlFor={`episode-${index}-info`} className="text-sm sm:text-base">
                Additional Information (Optional)
              </Label>
              <Textarea
                id={`episode-${index}-info`}
                placeholder="Add any notes, synopsis, or details..."
                value={episode.additional_info}
                onChange={(e) => updateEpisode(index, "additional_info", e.target.value)}
                disabled={disabled}
                rows={3}
                maxLength={5000}
                className="resize-none text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">
                {episode.additional_info.length}/5000 characters
              </p>
            </div>

            {/* Initial Assessment */}
            {episode.initial_assessment !== undefined && (
              <ScoreCard
                label="Initial Assessment"
                description="Your initial rating of this episode (1-10)"
                score={episode.initial_assessment}
                onChange={(score) => updateEpisode(index, "initial_assessment", score)}
                disabled={disabled}
                showGrade={true}
              />
            )}
          </div>
        </Card>
      ))}

      {/* Add Another Episode Button */}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          onClick={addEpisode}
          className="w-full touch-target"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Episode
        </Button>
      )}

      {episodes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No episodes added yet. Click &quot;Add Another Episode&quot; to start.</p>
        </div>
      )}
    </div>
  );
}
