"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Upload,
} from "lucide-react";
import type { EpisodeWithDetails } from "@/types";
import { canEditEpisode as canEditEpisodeUtil } from "@/lib/episodes/permissions";
import { BackButton } from "@/components/ui/back-button";
import { formatDate } from "@/lib/utils/format-date";
import { RevisionEvaluateList } from "@/components/episodes/revision-evaluate-list";
import { EpisodeRevisions } from "@/components/episodes/episode-revisions";
import Link from "next/link";


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
  sourceId?: string;
}


export default function EvaluatorEpisodesPage() {
  const router = useRouter();
  const supabase = createClient();

  // Episodes list state
  const [episodes, setEpisodes] = useState<EpisodeWithDetails[]>([]);
  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus>({});
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
  const [revisionOpenEpisodeId, setRevisionOpenEpisodeId] = useState<string | null>(null);

  // AbortController ref for cancelling in-flight requests
  const episodesAbortRef = useRef<AbortController | null>(null);
  const fetchEpisodesAndStatus = useCallback(async (page: number = 1, append: boolean = false, search: string = "") => {
    // Cancel any in-flight request
    episodesAbortRef.current?.abort();
    const controller = new AbortController();
    episodesAbortRef.current = controller;

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Fetch user info first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || controller.signal.aborted) return;

      setCurrentUserId(user.id);

      // Fetch user role and team
      const { data: userData } = await supabase
        .from("users")
        .select("role, team_id")
        .eq("id", user.id)
        .single();

      if (userData) {
        setCurrentUserRole(userData.role);
        if (userData.team_id) {
          setCurrentTeamId(userData.team_id);
          // Check if user is team head
          const { data: team } = await supabase
            .from("teams")
            .select("team_head_id")
            .eq("id", userData.team_id)
            .single();
          setIsTeamHead(team?.team_head_id === user.id);
        }
      }

      // Fetch episodes with project-based pagination (20 projects at a time, all their episodes)
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `/api/episodes?group_by_project=true&project_limit=20&project_page=${page}&include_evaluation_status=true${searchParam}&_t=${Date.now()}`,
        { cache: 'no-store', signal: controller.signal }
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

      // Build evaluation status from API response
      const status: EvaluationStatus = {};
      fetchedEpisodes.forEach((ep: any) => {
        status[ep.id] = ep.is_evaluated || false;
      });

      if (append) {
        setEvaluationStatus(prev => ({ ...prev, ...status }));
      } else {
        setEvaluationStatus(status);
      }

      // Update pagination state
      setProjectPage(page);
      setHasMoreProjects(data.pagination?.hasMoreProjects || false);
      setTotalProjects(data.pagination?.totalProjects || 0);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Error fetching episodes:", error);
      toast.error(error.message || "Failed to load episodes");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Load more projects
  const loadMoreProjects = useCallback(() => {
    if (!loadingMore && hasMoreProjects) {
      fetchEpisodesAndStatus(projectPage + 1, true, debouncedSearchTerm);
    }
  }, [loadingMore, hasMoreProjects, projectPage, fetchEpisodesAndStatus, debouncedSearchTerm]);

  // Initial load
  useEffect(() => {
    fetchEpisodesAndStatus();

    return () => {
      episodesAbortRef.current?.abort();
    };
  }, [fetchEpisodesAndStatus]);

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
          evaluatedCount: 0,
          totalCount: 0,
          sourceId,
        });
      }

      const group = projectsMap.get(projectId)!;
      group.episodes.push(ep);
      group.totalCount++;
      if (evaluationStatus[ep.id]) group.evaluatedCount++;
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
    [filteredEpisodes, evaluationStatus]
  );

  const toggleProject = (projectId: string) => {
    const next = new Set(expandedProjects);
    if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
    setExpandedProjects(next);
  };


  const canEditEpisode = (episode: EpisodeWithDetails): boolean => {
    if (!currentUserId || !currentUserRole) return false;
    return canEditEpisodeUtil(currentUserId, currentUserRole, episode, currentTeamId);
  };

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Scripts & Episodes</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View episodes, upload revisions, and evaluate
            </p>
          </div>
          <Button asChild className="bg-[#224794] hover:bg-[#1a3670] shrink-0">
            <Link href="/evaluator/log-episodes">
              <Plus className="h-4 w-4 mr-2" />
              Log New Script
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
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
                      className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 cursor-pointer"
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
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                          {project.evaluatedCount}/{project.totalCount} Evaluated
                        </span>
                        <span className="text-xs text-muted-foreground sm:hidden">
                          {project.evaluatedCount}/{project.totalCount}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          asChild
                          disabled={
                            project.projectType !== "call_report" || !project.sourceId
                          }
                        >
                          <Link href="/evaluator/log-episodes" onClick={(e) => e.stopPropagation()}>
                            <Plus className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Add Episode</span>
                            <span className="sm:hidden">Add</span>
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Episode Cards */}
                    {isExpanded && (
                      <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
                        {project.episodes.map((episode) => (
                          <div key={episode.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            {/* Card Header: badges + date + actions */}
                            <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="font-semibold">EP {episode.episode_number}</Badge>
                                {episode.version > 1 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700">
                                    v{episode.version}
                                  </Badge>
                                )}
                                {episode.approval_status && (
                                  <Badge className={
                                    episode.approval_status === "approved" ? "bg-emerald-50 text-emerald-700 text-xs" :
                                    episode.approval_status === "needs_revision" ? "bg-amber-50 text-amber-700 text-xs" :
                                    "bg-rose-50 text-rose-700 text-xs"
                                  }>
                                    {episode.approval_status === "approved" ? "Approved" : episode.approval_status === "needs_revision" ? "Needs Revision" : "Rejected"}
                                  </Badge>
                                )}
                              <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {episode.original_submission_date ? formatDate(episode.original_submission_date) : formatDate(episode.created_at)}
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" side="bottom" collisionPadding={10} className="z-50">
                                    {canEditEpisode(episode) && (
                                      <DropdownMenuItem onClick={() => router.push(`/evaluator/episodes/${episode.id}/edit`)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit Episode
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
                            </div>

                            {/* Card Meta: logged by + initial assessment */}
                            <div className="px-4 sm:px-5 pb-3 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span>Logged by: <span className="text-foreground font-medium">{episode.logged_by_user?.name || "Unknown"}</span></span>
                              {episode.initial_assessment != null && currentUserRole && ["content_manager", "content_creator", "content_head", "admin", "management", "programmer", "gcm", "evaluator"].includes(currentUserRole) && (
                                <span>Initial Assessment: <span className="font-semibold text-blue-700">{episode.initial_assessment}/10</span> <span className="text-muted-foreground font-normal">by {episode.logged_by_user?.name || "Unknown"}</span></span>
                              )}
                            </div>

                            {/* Card Body: RevisionEvaluateList — full width */}
                            <div className="px-4 sm:px-5 pb-3">
                              <RevisionEvaluateList
                                entityId={episode.id}
                                entityType="episode"
                                revisionCount={(episode as any).revision_count || 0}
                                portalPrefix="evaluator"
                                originalFileName={episode.attachment_name}
                                originalDate={episode.original_submission_date || episode.created_at}
                              />
                            </div>

                            {/* Card Footer: action buttons */}
                            <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRevisionOpenEpisodeId(revisionOpenEpisodeId === episode.id ? null : episode.id)}
                              >
                                <Upload className="h-4 w-4 mr-1.5" />
                                Upload Revision
                              </Button>
                              {canEditEpisode(episode) && (
                                <Button size="sm" variant="outline" onClick={() => router.push(`/evaluator/episodes/${episode.id}/edit`)}>
                                  <Pencil className="h-4 w-4 mr-1.5" />
                                  Edit
                                </Button>
                              )}
                              {episode.attachment_url && (
                                <Button size="sm" variant="outline" onClick={() => handleDownload(episode)}>
                                  <Download className="h-4 w-4 mr-1.5" />
                                  Download
                                </Button>
                              )}
                            </div>

                            {/* Inline revision panel */}
                            {revisionOpenEpisodeId === episode.id && (
                              <div className="px-4 sm:px-5 py-4 border-t border-slate-200 bg-slate-50">
                                <EpisodeRevisions
                                  episodeId={episode.id}
                                  canEdit={true}
                                  userRole={currentUserRole || undefined}
                                  evaluateUrl="/evaluator/episodes"
                                />
                              </div>
                            )}
                          </div>
                        ))}
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
      </div>
    </div>
  );
}
