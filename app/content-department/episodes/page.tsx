"use client";

import { useState, useEffect, useCallback, useMemo, Fragment, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  MoreVertical,
  Download,
  FileText,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Info,
  History,
} from "lucide-react";
import { formatFileSize } from "@/lib/validations/episodes";
import { EpisodeUploadForm, type EpisodeFormEntry } from "@/components/episodes/episode-upload-form";
import { EpisodeFileUpload } from "@/components/episodes/episode-file-upload";
import { EpisodeRevisions } from "@/components/episodes/episode-revisions";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import type { EpisodeWithDetails } from "@/types";
import { canEditEpisode as canEditEpisodeUtil } from "@/lib/episodes/permissions";
import { BackButton } from "@/components/ui/back-button";
import { formatDate } from "@/lib/utils/format-date";
import { ShareCrossTeamButton } from "@/components/call-report/share-cross-team-button";

interface CallReportWriter {
  id?: string;
  writer_id: string;
  writer_name: string;
  writer_email?: string;
  writer_phone?: string;
  display_order: number;
}

interface CallReport {
  id: string;
  working_title: string;
  writer_name: string;
  meeting_type: string;
  story_id?: string;
  writer_names?: string[];
  writers?: CallReportWriter[];
}

interface ProjectGroup {
  projectId: string;
  projectName: string;
  projectType: "call_report" | "story";
  writerName?: string;
  projectStatus?: string;
  episodes: EpisodeWithDetails[];
  totalCount: number;
  sourceId?: string;
}

type ExistingEpisodeEdit = EpisodeWithDetails & {
  _newFile?: File | null;
  _isSaving?: boolean;
  _error?: string | null;
  _originalEpisodeNumber?: number | null;
  _originalAttachmentName?: string | null;
  _originalAttachmentUrl?: string | null;
  _originalAttachmentType?: string | null;
  _originalAdditionalInfo?: string | null;
  _originalInitialAssessment?: number | null;
};

export default function ContentDepartmentEpisodesPage() {
  const router = useRouter();
  const supabase = createClient();

  // Episodes list state
  const [episodes, setEpisodes] = useState<EpisodeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Project-based pagination state
  const [projectPage, setProjectPage] = useState(1);
  const [hasMoreProjects, setHasMoreProjects] = useState(false);
  const [totalProjects, setTotalProjects] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isTeamHead, setIsTeamHead] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const logSectionRef = useRef<HTMLDivElement | null>(null);

  // Log episodes state
  const [logLoading, setLogLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [callReports, setCallReports] = useState<CallReport[]>([]);
  const [existingEpisodesForSource, setExistingEpisodesForSource] = useState<ExistingEpisodeEdit[]>([]);
  const [existingEpisodeNumbers, setExistingEpisodeNumbers] = useState<number[]>([]);
  const [existingEpisodesLoading, setExistingEpisodesLoading] = useState(false);

  const [newEpisodes, setNewEpisodes] = useState<EpisodeFormEntry[]>([
    {
      episode_number: 1,
      file: null,
      additional_info: "",
      initial_assessment: 5,
    },
  ]);

  const searchAbortRef = useRef<AbortController | null>(null);
  const fetchEpisodesAndStatus = useCallback(async (page: number = 1, append: boolean = false, search: string = "") => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Fetch user info first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Fetch user role and team
      const { data: userData } = await supabase
        .from("users")
        .select("team_id, role")
        .eq("id", user.id)
        .single();

      if (userData) {
        setCurrentUserRole(userData.role);
        if (userData.team_id) {
          setCurrentTeamId(userData.team_id);
          const { data: team } = await supabase
            .from("teams")
            .select("team_head_id")
            .eq("id", userData.team_id)
            .single();
          setIsTeamHead(team?.team_head_id === user.id);
        }
      }

      // Cancel previous search request
      if (search && searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      const abortController = new AbortController();
      if (search) searchAbortRef.current = abortController;

      // Fetch episodes with project-based pagination (20 projects at a time, all their episodes)
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `/api/episodes?group_by_project=true&project_limit=20&project_page=${page}${searchParam}&_t=${Date.now()}`,
        { cache: 'no-store', signal: abortController.signal }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch episodes");
      }

      const fetchedEpisodes = data.data || [];

      // Update episodes state (append for "load more")
      if (append) {
        setEpisodes(prev => [...prev, ...fetchedEpisodes]);
      } else {
        setEpisodes(fetchedEpisodes);
      }

      // Update pagination state
      setProjectPage(page);
      setHasMoreProjects(data.pagination?.hasMoreProjects || false);
      setTotalProjects(data.pagination?.totalProjects || 0);
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Error fetching episodes:", error);
      toast.error(error.message || "Failed to load episodes");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Load more projects
  const loadMoreProjects = useCallback(() => {
    if (!loadingMore && hasMoreProjects) {
      fetchEpisodesAndStatus(projectPage + 1, true, debouncedSearchTerm);
    }
  }, [loadingMore, hasMoreProjects, projectPage, fetchEpisodesAndStatus]);

  const fetchCallReports = useCallback(async () => {
    setFetchingData(true);
    try {
      // Get current user's team context for team isolation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentUser } = await supabase
        .from("users")
        .select("team_id, role")
        .eq("id", user.id)
        .single();

      const hasGlobalAccess = currentUser?.role && ['admin', 'management'].includes(currentUser.role);

      // Build query with team filter
      let callReportsQuery = supabase
        .from("call_reports")
        .select(`
          id,
          working_title,
          writer_name,
          meeting_type,
          story_id,
          team_id,
          call_report_writers:call_report_writers (
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

      // TEAM ISOLATION: Apply filter
      if (!hasGlobalAccess && currentUser?.team_id) {
        callReportsQuery = callReportsQuery.eq("team_id", currentUser.team_id);
      }

      const { data: callReportsData, error: crError } = await callReportsQuery;

      if (crError) {
        console.error("Error fetching call reports:", crError);
      } else if (callReportsData) {
        const transformedReports = callReportsData.map((report: any) => {
          const writers: CallReportWriter[] =
            report.call_report_writers?.map((w: any) => ({
              writer_id: w.writer_id,
              writer_name: w.writer?.name || "",
              writer_email: w.writer_email,
              writer_phone: w.writer_phone,
              display_order: w.display_order ?? 0,
            })) || [];

          const sortedWriters = writers.sort(
            (a: CallReportWriter, b: CallReportWriter) =>
              a.display_order - b.display_order
          );

          return {
            ...report,
            writers: sortedWriters,
            writer_names: sortedWriters
              .map((w) => w.writer_name)
              .filter((name) => !!name),
          };
        });

        setCallReports(transformedReports);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setFetchingData(false);
    }
  }, []);

  // Initial load - only fetch episodes, call reports loaded when Log tab is active
  useEffect(() => {
    fetchEpisodesAndStatus();
  }, [fetchEpisodesAndStatus]);

  // Lazy load call reports only when Log tab is active
  useEffect(() => {
    if (activeTab === "log" && callReports.length === 0) {
      fetchCallReports();
    }
  }, [activeTab, callReports.length, fetchCallReports]);

  // Server-side search: debounce input, then re-fetch from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const prevSearchRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSearchRef.current === null) {
      prevSearchRef.current = debouncedSearchTerm;
      return;
    }
    if (prevSearchRef.current === debouncedSearchTerm) return;
    prevSearchRef.current = debouncedSearchTerm;
    fetchEpisodesAndStatus(1, false, debouncedSearchTerm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const numbers = existingEpisodesForSource
      .map((ep) => ep.episode_number)
      .filter((num): num is number => typeof num === "number");

    // Only update if numbers actually changed to prevent unnecessary re-renders
    setExistingEpisodeNumbers((prev) => {
      if (prev.length !== numbers.length) return numbers;
      if (prev.every((num, idx) => num === numbers[idx])) return prev;
      return numbers;
    });

    // Calculate next episode number for new episodes
    const nextEpisodeNumber = numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1;

    // Update initial episode state with calculated number
    setNewEpisodes([
      {
        episode_number: nextEpisodeNumber,
        file: null,
        additional_info: "",
        initial_assessment: 5,
      },
    ]);
  }, [existingEpisodesForSource]);

  const loadExistingEpisodes = useCallback(async () => {
    if (!selectedSource) {
      setExistingEpisodesForSource([]);
      setExistingEpisodeNumbers([]);
      // Reset to episode 1 when no source selected
      setNewEpisodes([
        {
          episode_number: 1,
          file: null,
          additional_info: "",
          initial_assessment: 5,
        },
      ]);
      return;
    }

    setExistingEpisodesLoading(true);
    try {
      const response = await fetch(
        `/api/episodes?call_report_id=${selectedSource}&limit=100`,
        { cache: 'no-store' }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch episodes");
      }

      const episodesList: ExistingEpisodeEdit[] = (data.data || [])
        .sort(
          (a: EpisodeWithDetails, b: EpisodeWithDetails) =>
            (a.episode_number ?? 0) - (b.episode_number ?? 0)
        )
        .map((episode: EpisodeWithDetails) => ({
          ...episode,
          _newFile: null,
          _isSaving: false,
          _error: null,
          _originalEpisodeNumber: episode.episode_number ?? null,
          _originalAttachmentName: episode.attachment_name ?? null,
          _originalAttachmentUrl: episode.attachment_url ?? null,
          _originalAttachmentType: episode.attachment_type ?? null,
          _originalAdditionalInfo: episode.additional_info ?? null,
          _originalInitialAssessment: episode.initial_assessment ?? null,
        }));

      setExistingEpisodesForSource(episodesList);
    } catch (error) {
      console.error("Error fetching existing episodes:", error);
      toast.error("Failed to fetch existing episodes");
      setExistingEpisodesForSource([]);
      setExistingEpisodeNumbers([]);
      // Reset to episode 1 on error
      setNewEpisodes([
        {
          episode_number: 1,
          file: null,
          additional_info: "",
          initial_assessment: 5,
        },
      ]);
    } finally {
      setExistingEpisodesLoading(false);
    }
  }, [selectedSource]);

  useEffect(() => {
    loadExistingEpisodes();
  }, [loadExistingEpisodes]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "log") {
      setTimeout(() => {
        logSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  const focusEpisodeInput = (episodeNumber: number) => {
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        `[data-episode-number="${episodeNumber}"]`
      );
      if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        input.focus();
      }
    }, 200);
  };

  const handleDownload = async (episode: EpisodeWithDetails) => {
    if (!episode.attachment_url) {
      toast.error("No file attached to this episode");
      return;
    }

    try {
      // Use signed URL endpoint for secure file access
      window.open(`/api/episodes/download/${episode.id}`, "_blank");
      toast.success("Opening file...");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  const handleLogEpisodes = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSource) {
      toast.error("Please select a story");
      return;
    }

    if (newEpisodes.length === 0) {
      toast.error("Please add at least one episode");
      return;
    }

    setLogLoading(true);

    try {
      const episodesData = await Promise.all(
        newEpisodes.map(async (episode) => {
          let attachment_url = null;
          let attachment_name = null;
          let attachment_type = null;

          if (episode.file) {
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

            const { data: urlData } = supabase.storage
              .from("episodes")
              .getPublicUrl(filePath);

            attachment_url = urlData.publicUrl;
            attachment_name = episode.file.name;
            attachment_type = episode.file.type;
          }

          return {
            episode_number: episode.episode_number,
            attachment_url,
            attachment_name,
            attachment_type,
            additional_info: episode.additional_info || null,
            initial_assessment: episode.initial_assessment || null,
          };
        })
      );

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
        console.error("API Error Response:", result);
        // Handle validation errors (Zod format)
        if (result.error && typeof result.error === 'object') {
          const errorMessage = result.details || JSON.stringify(result.error);
          throw new Error(errorMessage);
        }
        throw new Error(result.error || result.details || "Failed to create episodes");
      }

      toast.success(`Successfully logged ${newEpisodes.length} episode(s)`);

      // Reset form
      setSelectedSource("");
      setNewEpisodes([
        {
          episode_number: 1,
          file: null,
          additional_info: "",
          initial_assessment: 5,
        },
      ]);

      // Small delay to ensure database writes are committed, then refresh
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchEpisodesAndStatus();
      setActiveTab("list");
    } catch (error: any) {
      console.error("Error creating episodes:", error);
      toast.error(error.message || "Failed to log episodes");
    } finally {
      setLogLoading(false);
    }
  };

  // Episodes are already filtered server-side when search is active
  const filteredEpisodes = episodes;

  // Group episodes by project (call_report or story)
  const groupEpisodesByProject = (episodeList: EpisodeWithDetails[]): ProjectGroup[] => {
    const projectsMap = new Map<string, ProjectGroup>();

    episodeList.forEach((ep) => {
      let projectId: string;
      let projectName: string;
      let projectType: "call_report" | "story";
      let writerName: string | undefined;
      let projectStatus: string | undefined;
      let sourceId: string | undefined;

      if (ep.call_report_id && ep.call_report) {
        projectId = `call_report_${ep.call_report_id}`;
        projectName = ep.call_report.working_title;
        // Support multiple writers - use writer_names array if available, fallback to single writer_name
        const callReport = ep.call_report as any; // Type assertion for writer_names field
        writerName = callReport.writer_names && callReport.writer_names.length > 0
          ? callReport.writer_names.join(", ")
          : ep.call_report.writer_name;
        projectType = "call_report";
        sourceId = ep.call_report_id;
      } else if (ep.story_id && ep.story) {
        projectId = `story_${ep.story_id}`;
        projectName = ep.story.title;
        projectStatus = ep.story.status;
        projectType = "story";
        sourceId = ep.story_id;
      } else {
        projectId = `episode_${ep.id}`;
        projectName = ep.title || "Untitled Episode";
        projectType = "call_report";
        sourceId = ep.call_report_id || undefined;
      }

      if (!projectsMap.has(projectId)) {
        projectsMap.set(projectId, {
          projectId,
          projectName,
          projectType,
          writerName,
          projectStatus,
          episodes: [],
          totalCount: 0,
          sourceId,
        });
      }

      const group = projectsMap.get(projectId)!;
      group.episodes.push(ep);
      group.totalCount++;
    });

    projectsMap.forEach((group) => {
      group.episodes.sort(
        (a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0)
      );
    });

    return Array.from(projectsMap.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  };

  // Memoize grouping operation to avoid re-grouping on every render
  const projects = useMemo(
    () => groupEpisodesByProject(filteredEpisodes),
    [filteredEpisodes]
  );

  const toggleProject = (projectId: string) => {
    const next = new Set(expandedProjects);
    if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
    setExpandedProjects(next);
  };

  const handleContinueEpisodes = (project: ProjectGroup) => {
    if (project.projectType !== "call_report" || !project.sourceId) {
      toast.error("Episodes can only be logged for writer engagement reports.");
      return;
    }

    const existingNumbers = project.episodes
      .map((ep) => ep.episode_number)
      .filter((num): num is number => typeof num === "number");

    const nextNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    setSelectedSource(project.sourceId);
    setNewEpisodes([
      {
        episode_number: nextNumber,
        file: null,
        additional_info: "",
        initial_assessment: 5,
      },
    ]);
    setActiveTab("log");
    logSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    focusEpisodeInput(nextNumber);
  };

  const updateExistingEpisode = (episodeId: string, updates: Partial<ExistingEpisodeEdit>) => {
    setExistingEpisodesForSource((prev) =>
      prev.map((episode) => (episode.id === episodeId ? { ...episode, ...updates } : episode))
    );
  };

  const hasEpisodeChanges = (episode: ExistingEpisodeEdit) => {
    return (
      episode._newFile ||
      (episode.episode_number ?? null) !== (episode._originalEpisodeNumber ?? null) ||
      (episode.additional_info ?? "") !== (episode._originalAdditionalInfo ?? "") ||
      (episode.attachment_url ?? null) !== (episode._originalAttachmentUrl ?? null) ||
      (episode.attachment_name ?? null) !== (episode._originalAttachmentName ?? null) ||
      (episode.initial_assessment ?? null) !== (episode._originalInitialAssessment ?? null)
    );
  };

  const handleSaveExistingEpisode = async (episodeId: string) => {
    const episode = existingEpisodesForSource.find((ep) => ep.id === episodeId);
    if (!episode) {
      return;
    }

    if (!hasEpisodeChanges(episode)) {
      toast.info("No changes to save for this episode.");
      return;
    }

    updateExistingEpisode(episodeId, { _isSaving: true, _error: null });

    try {
      const payload: Record<string, any> = {};
      let attachmentUpdated = false;

      if (
        (episode.episode_number ?? null) !== (episode._originalEpisodeNumber ?? null)
      ) {
        payload.episode_number = episode.episode_number ?? 1;
      }

      if (
        (episode.additional_info ?? "") !== (episode._originalAdditionalInfo ?? "")
      ) {
        payload.additional_info = episode.additional_info ?? null;
      }

      if (
        (episode.initial_assessment ?? null) !== (episode._originalInitialAssessment ?? null)
      ) {
        payload.initial_assessment = episode.initial_assessment ?? null;
      }

      if (episode._newFile) {
        const fileExt = episode._newFile.name.split(".").pop();
        const safeExt = fileExt ? `.${fileExt}` : "";
        const storagePath = `${episode.call_report_id || episode.story_id || "episode"
          }/${episode.id}-${Date.now()}${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from("episodes")
          .upload(storagePath, episode._newFile, {
            upsert: true,
          });

        if (uploadError) {
          throw new Error(uploadError.message || "Failed to upload file");
        }

        const { data: publicUrlData } = supabase.storage
          .from("episodes")
          .getPublicUrl(storagePath);

        payload.attachment_url = publicUrlData.publicUrl;
        payload.attachment_name = episode._newFile.name;
        payload.attachment_type =
          episode._newFile.type || safeExt || "application/octet-stream";
        attachmentUpdated = true;
      } else if (
        (episode.attachment_url ?? null) !== (episode._originalAttachmentUrl ?? null)
      ) {
        payload.attachment_url = episode.attachment_url ?? null;
        payload.attachment_name = episode.attachment_name ?? null;
        payload.attachment_type = episode.attachment_type ?? null;
        attachmentUpdated = true;
      }

      if (Object.keys(payload).length === 0 && !attachmentUpdated) {
        updateExistingEpisode(episodeId, { _isSaving: false });
        toast.info("No changes to save for this episode.");
        return;
      }

      const response = await fetch(`/api/episodes/${episodeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || "Failed to update episode");
      }

      const updatedEpisode: EpisodeWithDetails = result.episode;
      updateExistingEpisode(episodeId, {
        ...updatedEpisode,
        _newFile: null,
        _isSaving: false,
        _error: null,
        _originalEpisodeNumber: updatedEpisode.episode_number ?? null,
        _originalAttachmentName: updatedEpisode.attachment_name ?? null,
        _originalAttachmentUrl: updatedEpisode.attachment_url ?? null,
        _originalAttachmentType: updatedEpisode.attachment_type ?? null,
        _originalAdditionalInfo: updatedEpisode.additional_info ?? null,
        _originalInitialAssessment: updatedEpisode.initial_assessment ?? null,
      });

      toast.success(`Episode ${updatedEpisode.episode_number ?? ""} updated.`);
      // Fetch updates
      fetchEpisodesAndStatus();
    } catch (error: any) {
      console.error("Error updating episode:", error);
      updateExistingEpisode(episodeId, {
        _isSaving: false,
        _error: error.message || "Failed to save episode changes",
      });
      toast.error(error.message || "Failed to save episode changes");
    }
  };

  const canEditEpisode = (episode: EpisodeWithDetails): boolean => {
    if (!currentUserId || !currentUserRole) return false;
    return canEditEpisodeUtil(currentUserId, currentUserRole, episode, currentTeamId);
  };

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/content-department" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Episodes</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View, log, and manage episodes
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4 sm:space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">Episodes List</TabsTrigger>
          <TabsTrigger value="log">Log Episodes</TabsTrigger>
        </TabsList>

        {/* Episodes List Tab */}
        <TabsContent value="list" className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search episodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Episodes Table */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredEpisodes.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-white rounded-lg border">
              <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No episodes found</h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-3 sm:mb-4 px-3">
                {searchTerm
                  ? "No episodes match your search criteria"
                  : "Get started by logging your first episode"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const isExpanded = expandedProjects.has(project.projectId);

                return (
                  <div key={project.projectId} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    {/* Project Header */}
                    <div
                      className="p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 cursor-pointer"
                      onClick={() => toggleProject(project.projectId)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base">{project.projectName}</span>
                            {project.writerName && (
                              <span className="text-sm text-muted-foreground font-normal">by {project.writerName}</span>
                            )}
                          </div>
                          {project.projectStatus && (
                            <Badge variant="secondary" className="text-xs mt-1">{project.projectStatus}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {project.totalCount} {project.totalCount === 1 ? "Episode" : "Episodes"}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContinueEpisodes(project);
                          }}
                          disabled={project.projectType !== "call_report" || !project.sourceId}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Add Episode</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                      </div>
                    </div>

                    {/* Episode Cards */}
                    {isExpanded && (
                      <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
                        {project.episodes.map((episode) => {
                          const latestRev = episode.latest_revision;
                          const showRevised = !!latestRev?.attachment_url;
                          const displayUrl = showRevised ? latestRev!.attachment_url : episode.attachment_url;
                          const displayName = showRevised ? latestRev!.attachment_name : episode.attachment_name;

                          return (
                            <Card key={episode.id} className="border-slate-200">
                              <CardContent className="p-4 space-y-3">
                                {/* Row 1: Badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="font-semibold">EP {episode.episode_number}</Badge>
                                  {episode.revision_count != null && episode.revision_count > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      <History className="h-3 w-3 mr-0.5" />
                                      {episode.revision_count} rev
                                    </Badge>
                                  )}
                                </div>

                                {/* Row 2: Attachment */}
                                <div className="text-sm">
                                  {displayUrl ? (
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        onClick={() => handleDownload(episode)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 w-fit"
                                      >
                                        <FileText className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{displayName}</span>
                                      </button>
                                      {showRevised && (
                                        <span className="text-xs text-amber-600 font-medium ml-5.5">
                                          Revision #{latestRev!.revision_number}
                                        </span>
                                      )}
                                      {showRevised && latestRev!.initial_assessment != null && (
                                        <span className="text-xs text-blue-600 font-medium ml-5.5">
                                          Revision Assessment: {latestRev!.initial_assessment}/10{latestRev!.assessed_by_name ? ` by ${latestRev!.assessed_by_name}` : ""}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic">No file attached</span>
                                  )}
                                </div>

                                {/* Row 3: Info */}
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  {episode.initial_assessment != null && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-blue-700">
                                        Initial Assessment: {episode.initial_assessment}/10
                                      </span>
                                      <span>by {episode.logged_by_user?.name || "Unknown"}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4">
                                    <span>Logged by: {episode.logged_by_user?.name || "Unknown"}</span>
                                    <span>
                                      {(episode.original_submission_date || episode.call_report?.original_submission_date) ? (
                                        <>Original: {formatDate(episode.original_submission_date || episode.call_report?.original_submission_date)}</>
                                      ) : (
                                        formatDate(episode.created_at)
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Row 4: Actions */}
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap">
                                  {isTeamHead && (
                                    <ShareCrossTeamButton
                                      callReportId={episode.call_report_id || ""}
                                      currentTeamId={currentTeamId || undefined}
                                      episodeId={episode.id}
                                      callReportTitle={project.projectName}
                                    />
                                  )}
                                  {canEditEpisode(episode) && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => router.push(`/content-department/episodes/${episode.id}/edit`)}>
                                        <Pencil className="h-4 w-4 mr-1" />
                                        Edit
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => router.push(`/content-department/episodes/${episode.id}/edit`)}>
                                        <History className="h-4 w-4 mr-1" />
                                        Revisions
                                      </Button>
                                    </>
                                  )}
                                  {displayUrl && (
                                    <Button size="sm" variant="outline" onClick={() => handleDownload(episode)}>
                                      <Download className="h-4 w-4 mr-1" />
                                      Download
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredEpisodes.length > 0 && debouncedSearchTerm && (
            <div className="text-sm text-muted-foreground">
              Found {filteredEpisodes.length} matching episode(s)
            </div>
          )}

          {/* Load More Projects button */}
          {!debouncedSearchTerm && hasMoreProjects && (
            <div className="flex flex-col items-center gap-2 pt-4">
              <Button
                variant="outline"
                onClick={loadMoreProjects}
                disabled={loadingMore}
                className="w-full max-w-xs"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more projects...
                  </>
                ) : (
                  "Load More Projects"
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Showing {projects.length} of {totalProjects} projects
              </p>
            </div>
          )}
        </TabsContent>

        {/* Log Episodes Tab */}
        <TabsContent value="log">
          <div ref={logSectionRef}>
            <form onSubmit={handleLogEpisodes} className="space-y-8">
              {/* Select a story (backed by logged call reports) */}
              <div className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="source-select">
                    Select a story <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedSource}
                    onValueChange={setSelectedSource}
                    disabled={logLoading}
                  >
                    <SelectTrigger id="source-select">
                      <SelectValue placeholder="Select a story" />
                    </SelectTrigger>
                    <SelectContent>
                      {callReports.map((cr) => {
                        const writerDisplay =
                          cr.writer_names && cr.writer_names.length > 0
                            ? cr.writer_names.join(", ")
                            : cr.writer_name;
                        return (
                          <SelectItem key={cr.id} value={cr.id}>
                            {cr.working_title} - {writerDisplay}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSource && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Existing Episodes ({existingEpisodesForSource.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {existingEpisodesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading existing episodes...
                      </div>
                    ) : existingEpisodesForSource.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No episodes logged yet for this story.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <Card className="bg-slate-50 border-dashed">
                          <CardHeader className="flex flex-row items-center justify-between py-3">
                            <div>
                              <CardTitle className="text-sm font-semibold">
                                Info & edit existing episodes
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                Update numbers or re-upload files below. Add-ons appear at the bottom.
                              </p>
                            </div>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                        </Card>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                          {existingEpisodesForSource.map((episode, idx) => (
                            <Card key={episode.id}>
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <CardTitle className="text-base font-semibold">
                                    Episode {episode.episode_number ?? "—"}
                                  </CardTitle>
                                  <Badge variant="secondary">
                                    Logged by {episode.logged_by_user?.name || "Unknown"}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`existing-episode-${episode.id}-number`}>
                                    Episode Number
                                  </Label>
                                  <Input
                                    id={`existing-episode-${episode.id}-number`}
                                    type="number"
                                    value={episode.episode_number ?? idx + 1}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const numValue = parseInt(value);
                                      updateExistingEpisode(episode.id, {
                                        episode_number: value === "" ? undefined : (isNaN(numValue) ? undefined : numValue),
                                      });
                                    }}
                                    onBlur={(e) => {
                                      const value = parseInt(e.target.value);
                                      if (!value || value < 1) {
                                        updateExistingEpisode(episode.id, {
                                          episode_number: episode._originalEpisodeNumber ?? 1,
                                        });
                                      }
                                    }}
                                    data-episode-number={episode.episode_number ?? idx + 1}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Attachment</Label>
                                  <EpisodeFileUpload
                                    file={episode._newFile || null}
                                    existingFileName={episode.attachment_name || undefined}
                                    existingFileUrl={episode.attachment_url || undefined}
                                    onExistingFileDownload={() => handleDownload(episode)}
                                    onFileSelect={(file) =>
                                      updateExistingEpisode(episode.id, { _newFile: file })
                                    }
                                    onFileRemove={() =>
                                      updateExistingEpisode(episode.id, {
                                        _newFile: null,
                                        attachment_url: null,
                                        attachment_name: null,
                                        attachment_type: null,
                                      })
                                    }
                                    disabled={episode._isSaving}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`existing-episode-${episode.id}-info`}>
                                    Additional Information
                                  </Label>
                                  <Textarea
                                    id={`existing-episode-${episode.id}-info`}
                                    rows={3}
                                    value={episode.additional_info || ""}
                                    onChange={(e) =>
                                      updateExistingEpisode(episode.id, {
                                        additional_info: e.target.value,
                                      })
                                    }
                                  />
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {episode.additional_info?.length || 0}/5000 characters
                                  </div>
                                </div>

                                {/* Initial Assessment */}
                                <div className="space-y-2">
                                  <Label>Initial Assessment</Label>
                                  <ScoreCard
                                    label="Initial Assessment"
                                    description="Your initial rating of this episode (1-10)"
                                    score={episode.initial_assessment ?? 5}
                                    onChange={(score) =>
                                      updateExistingEpisode(episode.id, {
                                        initial_assessment: score,
                                      })
                                    }
                                    disabled={episode._isSaving}
                                  />
                                </div>

                                {/* Revisions */}
                                <EpisodeRevisions
                                  episodeId={episode.id}
                                  sourceId={selectedSource}
                                  canEdit={true}
                                  userRole={currentUserRole || undefined}
                                  evaluateUrl="/evaluator/episodes"
                                />

                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
                                  {episode._error && (
                                    <p className="text-xs text-destructive">{episode._error}</p>
                                  )}
                                  <div className="ml-auto">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!hasEpisodeChanges(episode) || episode._isSaving}
                                      onClick={() => handleSaveExistingEpisode(episode.id)}
                                    >
                                      {episode._isSaving ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          Saving...
                                        </>
                                      ) : (
                                        "Save Changes"
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Episodes Form */}
              {selectedSource && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Episodes</h2>
                  <EpisodeUploadForm
                    episodes={newEpisodes}
                    onEpisodesChange={setNewEpisodes}
                    disabled={logLoading}
                    existingEpisodeNumbers={existingEpisodeNumbers}
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={logLoading || !selectedSource || newEpisodes.length === 0}
                  className="flex-1"
                >
                  {logLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging Episodes...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      {newEpisodes.length === 1 ? "Log Episode" : `Log ${newEpisodes.length} Episodes`}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
