"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  Loader2,
  MoreVertical,
  Download,
  FileText,
  Plus,
  Search,
  ClipboardCheck,
  Eye,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { formatFileSize } from "@/lib/validations/episodes";
import { EpisodeUploadForm, type EpisodeFormEntry } from "@/components/episodes/episode-upload-form";
import { getGradeColorClasses } from "@/lib/validations/episodic-evaluations";
import type { EpisodeWithDetails, EpisodicEvaluationWithDetails } from "@/types";
import { BackButton } from "@/components/ui/back-button";

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

interface Story {
  id: string;
  title: string;
  status: string;
}

interface EvaluationStatus {
  [episodeId: string]: boolean;
}

interface ProjectGroup {
  projectId: string;
  projectName: string;
  projectType: "call_report" | "story";
  writerName?: string;
  projectStatus?: string;
  episodes: EpisodeWithDetails[];
  evaluatedCount: number;
  totalCount: number;
}

interface EvaluationProjectGroup {
  projectId: string;
  projectName: string;
  projectType: "call_report" | "story";
  writerName?: string;
  projectStatus?: string;
  evaluations: EpisodicEvaluationWithDetails[];
  totalCount: number;
}

export default function EvaluatorEpisodesPage() {
  const router = useRouter();
  const supabase = createClient();

  // Episodes list state
  const [episodes, setEpisodes] = useState<EpisodeWithDetails[]>([]);
  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedEvalProjects, setExpandedEvalProjects] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);


  // Log episodes state
  const [logLoading, setLogLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [callReports, setCallReports] = useState<CallReport[]>([]);
  
  const [newEpisodes, setNewEpisodes] = useState<EpisodeFormEntry[]>([
    {
      episode_number: 1,
      file: null,
      additional_info: "",
    },
  ]);

  // My evaluations state
  const [myEvaluations, setMyEvaluations] = useState<EpisodicEvaluationWithDetails[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);

  const fetchEpisodesAndStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/episodes?limit=100");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch episodes");
      }

      setEpisodes(data.data || []);

      // Fetch evaluation status for each episode and user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Fetch user role
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userData) {
        setCurrentUserRole(userData.role);
      }

      const status: EvaluationStatus = {};
      for (const episode of data.data || []) {
        const { data: evaluation } = await supabase
          .from("episodic_evaluations")
          .select("id")
          .eq("episode_id", episode.id)
          .eq("evaluator_id", user.id)
          .maybeSingle();

        status[episode.id] = !!evaluation;
      }

      setEvaluationStatus(status);
    } catch (error: any) {
      console.error("Error fetching episodes:", error);
      toast.error(error.message || "Failed to load episodes");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchCallReports = useCallback(async () => {
    setFetchingData(true);
    try {
      const { data: callReportsData, error: crError } = await supabase
        .from("call_reports")
        .select(`
          id,
          working_title,
          writer_name,
          meeting_type,
          story_id,
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
  }, [supabase]);

  useEffect(() => {
    fetchEpisodesAndStatus();
    fetchCallReports();
  }, [fetchEpisodesAndStatus, fetchCallReports]);

  const fetchMyEvaluations = async () => {
    setEvaluationsLoading(true);
    try {
      const response = await fetch("/api/episodic-evaluations");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch evaluations");
      }

      setMyEvaluations(data.evaluations || []);
    } catch (error: any) {
      console.error("Error fetching evaluations:", error);
      toast.error(error.message || "Failed to load evaluations");
    } finally {
      setEvaluationsLoading(false);
    }
  };

  

  const handleDownload = async (episode: EpisodeWithDetails) => {
    if (!episode.attachment_url) {
      toast.error("No file attached to this episode");
      return;
    }

    try {
      window.open(episode.attachment_url, "_blank");
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
          };
        })
      );

      const payload = {
        call_report_id: selectedSource,
        episodes: episodesData,
      };

      console.log("Sending payload:", JSON.stringify(payload, null, 2));

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
        },
      ]);

      // Refresh episodes list
      fetchEpisodesAndStatus();
    } catch (error: any) {
      console.error("Error creating episodes:", error);
      toast.error(error.message || "Failed to log episodes");
    } finally {
      setLogLoading(false);
    }
  };

  const filteredEpisodes = episodes.filter((episode) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      episode.episode_number.toString().includes(searchLower) ||
      episode.title?.toLowerCase().includes(searchLower) ||
      episode.call_report?.working_title?.toLowerCase().includes(searchLower) ||
      episode.call_report?.writer_name?.toLowerCase().includes(searchLower) ||
      episode.story?.title?.toLowerCase().includes(searchLower) ||
      episode.logged_by_user?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Group episodes by project (call_report or story), tracking evaluation progress
  const groupEpisodesByProject = (episodeList: EpisodeWithDetails[]): ProjectGroup[] => {
    const projectsMap = new Map<string, ProjectGroup>();

    episodeList.forEach((ep) => {
      let projectId: string;
      let projectName: string;
      let projectType: "call_report" | "story";
      let writerName: string | undefined;
      let projectStatus: string | undefined;

      if (ep.call_report_id && ep.call_report) {
        projectId = `call_report_${ep.call_report_id}`;
        projectName = ep.call_report.working_title;
        writerName = ep.call_report.writer_name;
        projectType = "call_report";
      } else if (ep.story_id && ep.story) {
        projectId = `story_${ep.story_id}`;
        projectName = ep.story.title;
        projectStatus = ep.story.status;
        projectType = "story";
      } else {
        projectId = `episode_${ep.id}`;
        projectName = ep.title || "Untitled Episode";
        projectType = "call_report";
      }

      if (!projectsMap.has(projectId)) {
        projectsMap.set(projectId, {
          projectId,
          projectName,
          projectType,
          writerName,
          projectStatus,
          episodes: [],
          evaluatedCount: 0,
          totalCount: 0,
        });
      }

      const group = projectsMap.get(projectId)!;
      group.episodes.push(ep);
      group.totalCount++;
      if (evaluationStatus[ep.id]) group.evaluatedCount++;
    });

    return Array.from(projectsMap.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  };

  const projects = groupEpisodesByProject(filteredEpisodes);

  // Group my evaluations by project for collapsible UI in My Evaluations tab
  const groupMyEvaluationsByProject = (
    evalList: EpisodicEvaluationWithDetails[]
  ): EvaluationProjectGroup[] => {
    const map = new Map<string, EvaluationProjectGroup>();
    evalList.forEach((e) => {
      const ep = e.episode;
      if (!ep) return;
      let projectId: string;
      let projectName: string;
      let projectType: "call_report" | "story";
      let writerName: string | undefined;
      let projectStatus: string | undefined;

      if (ep.call_report_id && ep.call_report) {
        projectId = `call_report_${ep.call_report_id}`;
        projectName = ep.call_report.working_title;
        writerName = ep.call_report.writer_name;
        projectType = "call_report";
      } else if (ep.story_id && ep.story) {
        projectId = `story_${ep.story_id}`;
        projectName = ep.story.title;
        projectStatus = ep.story.status;
        projectType = "story";
      } else {
        projectId = `episode_${ep.id}`;
        projectName = ep.title || "Untitled Episode";
        projectType = "call_report";
      }

      if (!map.has(projectId)) {
        map.set(projectId, {
          projectId,
          projectName,
          projectType,
          writerName,
          projectStatus,
          evaluations: [],
          totalCount: 0,
        });
      }
      const group = map.get(projectId)!;
      group.evaluations.push(e);
      group.totalCount++;
    });

    return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  };

  const evalProjects = groupMyEvaluationsByProject(myEvaluations);

  const toggleProject = (projectId: string) => {
    const next = new Set(expandedProjects);
    if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
    setExpandedProjects(next);
  };

  const toggleEvalProject = (projectId: string) => {
    const next = new Set(expandedEvalProjects);
    if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
    setExpandedEvalProjects(next);
  };

  const canEditEpisode = (episode: EpisodeWithDetails): boolean => {
    if (!currentUserId || !currentUserRole) return false;
    return (
      episode.logged_by === currentUserId ||
      ["content_manager", "admin"].includes(currentUserRole)
    );
  };

  return (
    <div className="mobile-container mobile-section">
      <BackButton fallbackHref="/evaluator" variant="outline" size="sm" />

      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Episodes</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          View, log, and evaluate episodes
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="list">Episodes List</TabsTrigger>
          <TabsTrigger value="log">Log Episodes</TabsTrigger>
          <TabsTrigger value="evaluations" onClick={() => fetchMyEvaluations()}>
            My Evaluations
          </TabsTrigger>
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
            <div className="bg-white rounded-lg border shadow-sm">
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Attachment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => {
                      const isExpanded = expandedProjects.has(project.projectId);
                      const progressPct = (project.evaluatedCount / project.totalCount) * 100;
                      let progressClass = "bg-gray-100 text-gray-800 border-gray-300";
                      if (progressPct === 100) progressClass = "bg-green-100 text-green-800 border-green-300";
                      else if (progressPct > 0) progressClass = "bg-yellow-100 text-yellow-800 border-yellow-300";

                      return (
                        <Fragment key={project.projectId}>
                          <TableRow
                            className="bg-slate-50 hover:bg-slate-100 cursor-pointer border-t-2 border-slate-200"
                            onClick={() => toggleProject(project.projectId)}
                          >
                            <TableCell colSpan={4} className="font-semibold py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-slate-600 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0" />
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">{project.projectName}</span>
                                      {project.writerName && (
                                        <span className="text-sm text-muted-foreground font-normal">by {project.writerName}</span>
                                      )}
                                    </div>
                                    {project.projectStatus && (
                                      <Badge variant="secondary" className="text-xs mt-1">{project.projectStatus}</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge className={`${progressClass} border`}>
                                    {project.evaluatedCount}/{project.totalCount} Episodes Evaluated
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {project.totalCount} {project.totalCount === 1 ? "Episode" : "Episodes"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>

                          {isExpanded &&
                            project.episodes.map((episode) => {
                              const isEvaluated = evaluationStatus[episode.id];
                              return (
                                <TableRow key={episode.id} className="hover:bg-slate-50">
                                  <TableCell className="pl-12">
                                    <Badge variant="outline">EP {episode.episode_number}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {episode.attachment_url ? (
                                      <button
                                        onClick={() => handleDownload(episode)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center gap-1"
                                      >
                                        <FileText className="h-4 w-4" />
                                        {episode.attachment_name}
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground italic text-sm">No file</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {isEvaluated ? (
                                      <Badge className="bg-green-100 text-green-800 border-green-300">
                                       <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Evaluated
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                                        Not Evaluated
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {isEvaluated ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => router.push(`/evaluator/episodes/${episode.id}`)}
                                      >
                                          <Eye className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                      ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => router.push(`/evaluator/episodes/${episode.id}`)}
                                      >
                                          <ClipboardCheck className="h-4 w-4 mr-1" />
                                          Evaluate
                                        </Button>
                                      )}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" side="bottom" collisionPadding={10} className="z-50 w-[calc(100vw-2rem)] max-w-64 md:max-w-none md:w-56">
                                          {canEditEpisode(episode) && (
                                            <DropdownMenuItem onClick={() => router.push(`/evaluator/episodes/${episode.id}/edit`)}>
                                              <Pencil className="mr-2 h-4 w-4" />
                                              Edit
                                            </DropdownMenuItem>
                                          )}
                                          {episode.attachment_url && (
                                            <DropdownMenuItem onClick={() => handleDownload(episode)}>
                                              <Download className="mr-2 h-4 w-4" />
                                              Download
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {projects.map((project) => {
                  const isExpanded = expandedProjects.has(project.projectId);
                  const progressPct = (project.evaluatedCount / project.totalCount) * 100;
                  let progressClass = "bg-gray-100 text-gray-800 border-gray-300";
                  if (progressPct === 100) progressClass = "bg-green-100 text-green-800 border-green-300";
                  else if (progressPct > 0) progressClass = "bg-yellow-100 text-yellow-800 border-yellow-300";

                  return (
                    <div key={project.projectId} className="">
                      <div
                        className="p-4 flex items-center justify-between bg-slate-50"
                        onClick={() => toggleProject(project.projectId)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-slate-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-600" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{project.projectName}</span>
                              {project.writerName && (
                                <span className="text-sm text-muted-foreground">by {project.writerName}</span>
                              )}
                            </div>
                            {project.projectStatus && (
                              <Badge variant="secondary" className="text-xs mt-1">{project.projectStatus}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${progressClass} border`}>
                            {project.evaluatedCount}/{project.totalCount}
                          </Badge>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="divide-y divide-slate-200">
                          {project.episodes.map((episode) => {
                            const isEvaluated = evaluationStatus[episode.id];
                            return (
                              <div key={episode.id} className="p-4 flex flex-col gap-3 pl-8 border-l-2 border-slate-200 bg-white">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Badge variant="outline" className="flex-shrink-0">EP {episode.episode_number}</Badge>
                                      <span className="font-medium text-sm truncate">
                                        {episode.title || (
                                          <span className="text-muted-foreground italic">Untitled</span>
                                        )}
                                      </span>
                                    </div>
                                    {isEvaluated ? (
                                      <Badge className="bg-green-100 text-green-800 border-green-300 text-xs flex-shrink-0">Done</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs flex-shrink-0">Pending</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                  <div className="text-sm min-w-0">
                                    {episode.attachment_url ? (
                                      <button
                                        onClick={() => handleDownload(episode)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 w-full"
                                      >
                                        <FileText className="h-4 w-4 flex-shrink-0" /> 
                                        <span className="truncate">{episode.attachment_name}</span>
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground italic">No file</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isEvaluated ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => router.push(`/evaluator/episodes/${episode.id}`)}
                                        className="touch-target flex-1 sm:flex-initial"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => router.push(`/evaluator/episodes/${episode.id}`)}
                                        className="touch-target flex-1 sm:flex-initial"
                                      >
                                        <ClipboardCheck className="h-4 w-4 mr-1" />
                                        Evaluate
                                      </Button>
                                    )}
                                    {canEditEpisode(episode) && (
                                      <Button size="sm" variant="outline" onClick={() => router.push(`/evaluator/episodes/${episode.id}/edit`)} className="touch-target">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {episode.attachment_url && (
                                      <Button size="sm" variant="ghost" onClick={() => handleDownload(episode)} className="touch-target">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredEpisodes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredEpisodes.length} of {episodes.length} episode(s)
            </div>
          )}
        </TabsContent>

        {/* Log Episodes Tab */}
        <TabsContent value="log">
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

            {/* Episodes Form */}
            {selectedSource && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Episodes</h2>
                <EpisodeUploadForm
                  episodes={newEpisodes}
                  onEpisodesChange={setNewEpisodes}
                  disabled={logLoading}
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
        </TabsContent>

        {/* My Evaluations Tab */}
        <TabsContent value="evaluations">
          {evaluationsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : myEvaluations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No evaluations yet</h3>
              <p className="text-muted-foreground">
                Start evaluating episodes to see your submissions here
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm">
              {/* Desktop grouped table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Episode #</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evalProjects.map((project) => (
                      <Fragment key={project.projectId}>
                        <TableRow
                          className="bg-slate-50 hover:bg-slate-100 cursor-pointer border-t-2 border-slate-200"
                          onClick={() => toggleEvalProject(project.projectId)}
                        >
                          <TableCell colSpan={6} className="font-semibold py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {expandedEvalProjects.has(project.projectId) ? (
                                  <ChevronDown className="h-5 w-5 text-slate-600 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{project.projectName}</span>
                                    {project.writerName && (
                                      <span className="text-sm text-muted-foreground font-normal">by {project.writerName}</span>
                                    )}
                                  </div>
                                  {project.projectStatus && (
                                    <Badge variant="secondary" className="text-xs mt-1">{project.projectStatus}</Badge>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {project.totalCount} {project.totalCount === 1 ? "Evaluation" : "Evaluations"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>

                        {expandedEvalProjects.has(project.projectId) &&
                          project.evaluations.map((evaluation) => (
                            <TableRow key={evaluation.id} className="hover:bg-slate-50">
                              <TableCell className="pl-12">
                                <Badge variant="outline">EP {evaluation.episode?.episode_number}</Badge>
                              </TableCell>
                              <TableCell>{/* Project in header */}</TableCell>
                              <TableCell>
                                <span className="font-bold text-lg">{evaluation.overall_average.toFixed(2)}</span>
                                <span className="text-sm text-muted-foreground">/10</span>
                              </TableCell>
                              <TableCell>
                                <Badge className={`bg-orange-500 text-white border-orange-600 font-bold`}>
                                  {evaluation.overall_grade}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(evaluation.submitted_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/evaluator/episodes/${evaluation.episode_id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile grouped cards */}
              <div className="md:hidden divide-y">
                {evalProjects.map((project) => (
                  <div key={project.projectId}>
                    <div
                      className="p-4 flex items-center justify-between bg-slate-50"
                      onClick={() => toggleEvalProject(project.projectId)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedEvalProjects.has(project.projectId) ? (
                          <ChevronDown className="h-5 w-5 text-slate-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-600" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{project.projectName}</span>
                            {project.writerName && (
                              <span className="text-sm text-muted-foreground">by {project.writerName}</span>
                            )}
                          </div>
                          {project.projectStatus && (
                            <Badge variant="secondary" className="text-xs mt-1">{project.projectStatus}</Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{project.totalCount}</span>
                    </div>

                    {expandedEvalProjects.has(project.projectId) && (
                      <div className="divide-y divide-slate-200">
                        {project.evaluations.map((evaluation) => (
                          <div key={evaluation.id} className="p-4 flex flex-col gap-3 items-center text-center bg-white">
                            <div className="flex flex-col items-center gap-2 w-full">
                              <Badge variant="outline" className="text-sm">EP {evaluation.episode?.episode_number}</Badge>
                              <span className="font-medium text-base">
                                {evaluation.episode?.title || (
                                  <span className="text-muted-foreground italic">Untitled</span>
                                )}
                              </span>
                            </div>
                            <Badge className={`bg-orange-500 text-white border-orange-600 font-bold text-sm px-4 py-1`}>
                              {evaluation.overall_grade}
                            </Badge>
                            <div className="text-lg font-bold">
                              {evaluation.overall_average.toFixed(2)}<span className="text-muted-foreground text-base">/10</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/evaluator/episodes/${evaluation.episode_id}`)}
                              className="touch-target w-full max-w-xs"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
