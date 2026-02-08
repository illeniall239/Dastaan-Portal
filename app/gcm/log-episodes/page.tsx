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
import { uploadEpisodeFile } from "@/lib/episodes/upload-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

interface CallReportWriter {
  id: string;
  writer_id: string;
  writer_name: string;
  writer_email?: string;
  writer_phone?: string;
  display_order: number;
}

interface CallReport {
  id: string;
  working_title: string;
  writer_name: string; // Deprecated: kept for backward compatibility
  writers?: CallReportWriter[]; // NEW: Multiple writers
  meeting_type: string;
  story_id?: string;
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

  // Existing episode numbers for selected project
  const [existingEpisodeNumbers, setExistingEpisodeNumbers] = useState<number[]>([]);

  // Episodes
  const [episodes, setEpisodes] = useState<EpisodeFormEntry[]>([
    {
      episode_number: 1,
      file: null,
      additional_info: "",
    },
  ]);

  // Upload progress tracking (episode number to progress percentage)
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});

  // Fetch logged call reports
  useEffect(() => {
    async function fetchData() {
      setFetchingData(true);

      try {
        // Get current user's team context for team isolation
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Not authenticated");
          setFetchingData(false);
          return;
        }

        const { data: currentUser } = await supabase
          .from("users")
          .select("team_id, role")
          .eq("id", user.id)
          .single();

        // Build query with team filter - always filter by team for episode logging
        let callReportsQuery = supabase
          .from("call_reports")
          .select(`
            id,
            working_title,
            writer_name,
            meeting_type,
            story_id,
            call_report_writers:call_report_writers (
              id,
              writer_id,
              writer_email,
              writer_phone,
              display_order,
              writer:writers(name)
            )
          `)
          .eq("meeting_type", "call_report")
          .order("created_at", { ascending: false })
          .limit(100);

        // TEAM ISOLATION: Always filter by team for episode logging
        if (!currentUser?.team_id) {
          setCallReports([]);
          setFetchingData(false);
          return;
        }
        callReportsQuery = callReportsQuery.eq("team_id", currentUser.team_id);

        const { data: callReportsData, error: crError } = await callReportsQuery;

        if (crError) {
          console.error("Error fetching call reports:", crError);
        } else if (callReportsData) {
          // Transform the joined data
          const reportsWithWriters = callReportsData.map((report: any) => {
            const transformedWriters: CallReportWriter[] =
              report.call_report_writers?.map((w: any) => ({
                id: w.id,
                writer_id: w.writer_id,
                writer_name: w.writer?.name || "",
                writer_email: w.writer_email,
                writer_phone: w.writer_phone,
                display_order: w.display_order,
              })) || [];

            // Sort writers by display_order
            const sortedWriters = transformedWriters.sort(
              (a, b) => a.display_order - b.display_order
            );

            return {
              ...report,
              writers: sortedWriters,
            };
          });

          setCallReports(reportsWithWriters);
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

  // Fetch existing episodes when source is selected
  useEffect(() => {
    async function fetchExistingEpisodes() {
      if (!selectedSource) {
        setExistingEpisodeNumbers([]);
        // Reset to episode 1 when no source selected
        setEpisodes([
          {
            episode_number: 1,
            file: null,
            additional_info: "",
          },
        ]);
        return;
      }

      try {
        const response = await fetch(`/api/episodes?call_report_id=${selectedSource}&limit=100`);
        const data = await response.json();

        if (response.ok && data.data) {
          const numbers = data.data.map((ep: any) => ep.episode_number);
          setExistingEpisodeNumbers(numbers);

          // Calculate next episode number
          const nextEpisodeNumber = numbers.length > 0
            ? Math.max(...numbers) + 1
            : 1;

          // Update initial episode state with calculated number
          setEpisodes([
            {
              episode_number: nextEpisodeNumber,
              file: null,
              additional_info: "",
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching existing episodes:", error);
        setExistingEpisodeNumbers([]);
        // Reset to episode 1 on error
        setEpisodes([
          {
            episode_number: 1,
            file: null,
            additional_info: "",
          },
        ]);
      }
    }

    fetchExistingEpisodes();
  }, [selectedSource]);

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

    // Check for duplicate episode numbers with existing episodes
    const duplicates = episodes.filter(ep =>
      existingEpisodeNumbers.includes(ep.episode_number)
    );

    if (duplicates.length > 0) {
      const duplicateNumbers = duplicates.map(d => d.episode_number).sort((a, b) => a - b);
      toast.error(
        `Episode ${duplicateNumbers.join(', ')} already exist${duplicateNumbers.length > 1 ? '' : 's'} for this project`
      );
      return;
    }

    setLoading(true);

    try {
      // Get Supabase config for upload helper
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Upload files to Supabase Storage and prepare episode data
      const episodesData = await Promise.all(
        episodes.map(async (episode) => {
          let attachment_url = null;
          let attachment_name = null;
          let attachment_type = null;

          if (episode.file) {
            // Upload file to Supabase Storage with progress tracking
            const fileExt = episode.file.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${selectedSource}/${fileName}`;

            try {
              const result = await uploadEpisodeFile(
                episode.file,
                "episodes",
                filePath,
                supabaseUrl,
                supabaseAnonKey,
                (progress) => {
                  setUploadProgress(prev => ({ ...prev, [episode.episode_number]: progress }));
                }
              );

              attachment_url = result.publicUrl;
              attachment_name = episode.file.name;
              attachment_type = episode.file.type;

              // Remove from progress tracking when complete
              setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[episode.episode_number];
                return newProgress;
              });
            } catch (uploadError) {
              console.error("File upload error:", uploadError);
              // Remove from progress tracking on error
              setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[episode.episode_number];
                return newProgress;
              });
              throw new Error(`Failed to upload ${episode.file.name}`);
            }
          }

          return {
            episode_number: episode.episode_number,
            attachment_url,
            attachment_name,
            attachment_type,
            additional_info: episode.additional_info || null,
          };
        })
      );

      // Create episodes via API
      const selectedReport = callReports.find(cr => cr.id === selectedSource);
      const payload = {
        call_report_id: selectedSource,
        story_id: selectedReport?.story_id || null,
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
        // Show detailed error message if available (e.g., duplicate episode numbers)
        const errorMessage = result.details || result.error || "Failed to create episodes";
        throw new Error(errorMessage);
      }

      toast.success(`Successfully logged ${episodes.length} episode(s)`);

      // Reset form
      setSelectedSource("");
      setEpisodes([
        {
          episode_number: 1,
          file: null,
          additional_info: "",
        },
      ]);

      // Navigate to episodes list with fresh data
      router.push("/gcm/episodes");
      router.refresh(); // Force data refresh to show new episodes
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
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/gcm" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Log Episodes</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Log new episodes for approved dramas
          </p>
        </div>
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
                {callReports.map((cr) => {
                  // Get writer names from new writers array, fallback to old writer_name
                  const writerNames = cr.writers && cr.writers.length > 0
                    ? cr.writers.map(w => w.writer_name).join(", ")
                    : cr.writer_name;

                  return (
                    <SelectItem key={cr.id} value={cr.id}>
                      {cr.working_title} - {writerNames}
                    </SelectItem>
                  );
                })}
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
              existingEpisodeNumbers={existingEpisodeNumbers}
              uploadProgress={uploadProgress}
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
            onClick={() => router.push("/gcm")}
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
