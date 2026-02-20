"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EpisodeFileUpload } from "./episode-file-upload";
import { EpisodeRevisions } from "./episode-revisions";
import { updateEpisodeClient } from "@/lib/episodes/client";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import { Loader2, Save, ArrowLeft, FileText } from "lucide-react";
import type { Episode } from "@/types";

interface EpisodeEditFormProps {
  episode: Episode;
  onSuccess?: () => void;
}

export function EpisodeEditForm({ episode, onSuccess }: EpisodeEditFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("users").select("role").eq("id", user.id).single()
          .then(({ data }) => { if (data) setUserRole(data.role); });
      }
    });
  }, [supabase]);
  const [episodeNumber, setEpisodeNumber] = useState<number | string>(episode.episode_number);
  const [additionalInfo, setAdditionalInfo] = useState(episode.additional_info || "");
  const [initialAssessment, setInitialAssessment] = useState(episode.initial_assessment || 5);
  const [file, setFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState({
    url: episode.attachment_url,
    name: episode.attachment_name,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let attachment_url = existingAttachment.url;
      let attachment_name = existingAttachment.name;
      let attachment_type = episode.attachment_type;

      // Handle file upload if a new file is selected
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const sourceId = episode.call_report_id || episode.story_id;
        const filePath = `${sourceId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("episodes")
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("episodes")
          .getPublicUrl(filePath);

        attachment_url = urlData.publicUrl;
        attachment_name = file.name;
        attachment_type = file.type;

        // Delete old attachment if exists
        if (existingAttachment.url) {
          try {
            const url = new URL(existingAttachment.url);
            const pathParts = url.pathname.split("/");
            const oldFilePath = pathParts.slice(pathParts.indexOf("episode-files") + 1).join("/");

            await supabase.storage
              .from("episodes")
              .remove([oldFilePath]);
          } catch (error) {
            console.error("Error deleting old file:", error);
            // Continue anyway
          }
        }
      }

      const updateData = {
        episode_number: typeof episodeNumber === "string" ? parseInt(episodeNumber) || 1 : episodeNumber,
        additional_info: additionalInfo.trim() || null,
        initial_assessment: initialAssessment,
        attachment_url,
        attachment_name,
        attachment_type,
      };

      await updateEpisodeClient(episode.id, updateData);

      toast.success("Episode updated successfully!");

      if (onSuccess) {
        onSuccess();
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error("Error updating episode:", error);
      toast.error(error.message || "Failed to update episode");
    } finally {
      setLoading(false);
    }
  };

  const handleFileRemove = () => {
    setFile(null);
    // Note: We don't remove the existing attachment here, just clear the new file selection
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Episode Number */}
          <div className="space-y-2">
            <Label htmlFor="episode-number">
              Episode Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="episode-number"
              type="number"
              min="1"
              value={episodeNumber || ""}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string or valid number during typing
                setEpisodeNumber(value === "" ? "" : parseInt(value) || "");
              }}
              onBlur={(e) => {
                // Validate on blur - ensure minimum value of 1
                const value = parseInt(e.target.value);
                if (!value || value < 1) {
                  setEpisodeNumber(1);
                }
              }}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              The episode sequence number
            </p>
          </div>

          {/* Current Attachment Info */}
          {existingAttachment.url && !file && (
            <div className="space-y-2">
              <Label>Current Attachment</Label>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border">
                <FileText className="h-5 w-5 text-slate-600" />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (episode.id) {
                      window.open(`/api/episodes/download/${episode.id}`, "_blank");
                    }
                  }}
                  className="text-sm text-blue-600 hover:underline flex-1 truncate text-left"
                >
                  {existingAttachment.name || "View attachment"}
                </button>
                <Badge variant="outline" className="text-xs">Current</Badge>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label>
              {existingAttachment.url && !file ? "Replace Attachment (Optional)" : "Attachment (Optional)"}
            </Label>
            <EpisodeFileUpload
              file={file}
              onFileSelect={setFile}
              onFileRemove={handleFileRemove}
              disabled={loading}
            />
            {existingAttachment.url && (
              <p className="text-xs text-muted-foreground">
                Upload a new file to replace the existing attachment
              </p>
            )}
          </div>

          {/* Additional Information */}
          <div className="space-y-2">
            <Label htmlFor="additional-info">
              Additional Information (Optional)
            </Label>
            <Textarea
              id="additional-info"
              placeholder="Add any notes, synopsis, or details..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              disabled={loading}
              rows={4}
              maxLength={5000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {additionalInfo.length}/5000 characters
            </p>
          </div>

          {/* Initial Assessment */}
          <ScoreCard
            label="Initial Assessment"
            description="Your initial rating of this episode (1-10)"
            score={initialAssessment}
            onChange={setInitialAssessment}
            disabled={loading}
          />
        </div>
      </Card>

      {/* Revisions */}
      <EpisodeRevisions
        episodeId={episode.id}
        sourceId={episode.call_report_id || episode.story_id}
        canEdit={true}
        userRole={userRole}
        evaluateUrl="/evaluator/episodes"
      />

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
          className="flex-1 sm:flex-none"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 sm:flex-none"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Update Episode
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
