"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EpisodeUploadForm, type EpisodeFormEntry } from "@/components/episodes/episode-upload-form";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CallReport {
  id: string;
  working_title: string;
  writer_name: string;
  meeting_type: string;
}

export default function LogEpisodesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Selected story (backed by logged call reports)
  const [selectedSource, setSelectedSource] = useState<string>("");

  // Data
  const [callReports, setCallReports] = useState<CallReport[]>([]);
  

  // Episodes
  const [episodes, setEpisodes] = useState<EpisodeFormEntry[]>([
    {
      episode_number: 1,
      title: "",
      file: null,
      additional_info: "",
    },
  ]);

  // Fetch logged call reports
  useEffect(() => {
    async function fetchData() {
      setFetchingData(true);

      try {
        // Fetch call reports (only logged reports, not scheduled meetings)
        const { data: callReportsData, error: crError } = await supabase
          .from("call_reports")
          .select("id, working_title, writer_name, meeting_type")
          .eq("meeting_type", "call_report")
          .order("created_at", { ascending: false })
          .limit(100);

        if (crError) {
          console.error("Error fetching call reports:", crError);
        } else {
          setCallReports(callReportsData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setFetchingData(false);
      }
    }

    fetchData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSource) {
      toast.error("Please select a story");
      return;
    }

    if (episodes.length === 0) {
      toast.error("Please add at least one episode");
      return;
    }

    setLoading(true);

    try {
      // Upload files to Supabase Storage and prepare episode data
      const episodesData = await Promise.all(
        episodes.map(async (episode) => {
          let attachment_url = null;
          let attachment_name = null;
          let attachment_type = null;

          if (episode.file) {
            // Upload file to Supabase Storage
            const fileExt = episode.file.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${selectedSource}/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("episodes")
              .upload(filePath, episode.file);

            if (uploadError) {
              console.error("File upload error:", uploadError);
              throw new Error(`Failed to upload ${episode.file.name}`);
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from("episodes")
              .getPublicUrl(filePath);

            if (!urlData || !urlData.publicUrl) {
              throw new Error(`Failed to generate public URL for ${episode.file.name}`);
            }

            attachment_url = urlData.publicUrl;
            attachment_name = episode.file.name;
            attachment_type = episode.file.type;
          }

          return {
            episode_number: episode.episode_number,
            title: episode.title || null,
            attachment_url,
            attachment_name,
            attachment_type,
            additional_info: episode.additional_info || null,
          };
        })
      );

      // Create episodes via API
      const payload = {
        call_report_id: selectedSource,
        episodes: episodesData,
      };

      const response = await fetch("/api/episodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create episodes");
      }

      toast.success(`Successfully logged ${episodes.length} episode(s)`);

      // Reset form
      setSelectedSource("");
      setEpisodes([
        {
          episode_number: 1,
          title: "",
          file: null,
          additional_info: "",
        },
      ]);

      // Navigate to episodes list
      router.push("/content-department/episodes");
    } catch (error: any) {
      console.error("Error creating episodes:", error);
      toast.error(error.message || "Failed to log episodes");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mobile-container mobile-section max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Log Episodes</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Add episode details with attachments and additional information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Select a story (backed by logged call reports) */}
        <div className="space-y-3 sm:space-y-4 md:space-y-6 bg-white p-3 sm:p-4 md:p-6 rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="source-select" className="text-sm sm:text-base">
              Select a story <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedSource}
              onValueChange={setSelectedSource}
              disabled={loading}
            >
              <SelectTrigger id="source-select">
                <SelectValue placeholder="Select a story" />
              </SelectTrigger>
              <SelectContent>
                {callReports.map((cr) => (
                  <SelectItem key={cr.id} value={cr.id}>
                    {cr.working_title} - {cr.writer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Episodes Form */}
        {selectedSource && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold">Episodes</h2>
            <EpisodeUploadForm
              episodes={episodes}
              onEpisodesChange={setEpisodes}
              disabled={loading}
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={loading || !selectedSource || episodes.length === 0}
            className="flex-1 touch-target"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Logging Episodes...</span>
                <span className="sm:hidden">Logging...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">
                  {episodes.length === 1 ? "Log Episode" : `Log ${episodes.length} Episodes`}
                </span>
                <span className="sm:hidden">
                  {episodes.length === 1 ? "Log" : `Log ${episodes.length}`}
                </span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/content-department")}
            disabled={loading}
            className="touch-target"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
