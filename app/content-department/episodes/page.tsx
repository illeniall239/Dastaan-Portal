"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, MoreVertical, Download, FileText, Plus, Search, ChevronRight, ChevronDown, Pencil } from "lucide-react";
import { formatFileSize } from "@/lib/validations/episodes";
import type { EpisodeWithDetails } from "@/types";

export default function EpisodesListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [episodes, setEpisodes] = useState<EpisodeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);


  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/episodes?limit=100");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch episodes");
      }

      setEpisodes(data.data || []);

      // Fetch current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
      }
    } catch (error: any) {
      console.error("Error fetching episodes:", error);
      toast.error(error.message || "Failed to load episodes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, []);

  

  const handleDownload = async (episode: EpisodeWithDetails) => {
    if (!episode.attachment_url) {
      toast.error("No file attached to this episode");
      return;
    }

    try {
      // Open file in new tab for download
      window.open(episode.attachment_url, "_blank");
      toast.success("Opening file...");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  // Filter episodes based on search term
  const filteredEpisodes = episodes.filter((episode) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      episode.episode_number.toString().includes(searchLower) ||
      episode.call_report?.working_title?.toLowerCase().includes(searchLower) ||
      episode.call_report?.writer_name?.toLowerCase().includes(searchLower) ||
      episode.story?.title?.toLowerCase().includes(searchLower) ||
      episode.logged_by_user?.name?.toLowerCase().includes(searchLower)
    );
  });

  interface ProjectGroup {
    projectId: string;
    projectName: string;
    projectType: "call_report" | "story";
    writerName?: string;
    projectStatus?: string;
    episodes: EpisodeWithDetails[];
    totalCount: number;
  }

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
        // Support multiple writers - use writer_names array if available, fallback to single writer_name
        const callReport = ep.call_report as any; // Type assertion for writer_names field
        writerName = callReport.writer_names && callReport.writer_names.length > 0
          ? callReport.writer_names.join(", ")
          : ep.call_report.writer_name;
        projectType = "call_report";
      } else if (ep.story_id && ep.story) {
        projectId = `story_${ep.story_id}`;
        projectName = ep.story.title;
        projectStatus = ep.story.status;
        projectType = "story";
      } else {
        projectId = `episode_${ep.id}`;
        projectName = "Untitled Episode";
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
          totalCount: 0,
        });
      }

      const group = projectsMap.get(projectId)!;
      group.episodes.push(ep);
      group.totalCount++;
    });

    // Sort episodes within each project by episode_number
    projectsMap.forEach((group) => {
      group.episodes.sort(
        (a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0)
      );
    });

    return Array.from(projectsMap.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  };

  const projects = groupEpisodesByProject(filteredEpisodes);

  const toggleProject = (projectId: string) => {
    const next = new Set(expandedProjects);
    if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
    setExpandedProjects(next);
  };

  const canEditEpisode = (episode: EpisodeWithDetails): boolean => {
    if (!currentUserId || !currentUserRole) return false;
    return (
      episode.logged_by === currentUserId ||
      ["evaluator", "content_manager", "admin"].includes(currentUserRole)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6 md:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Episodes</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View and manage logged episodes
          </p>
        </div>
        <Button onClick={() => router.push("/content-department/log-episodes")} className="touch-target w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Log Episodes</span>
          <span className="sm:hidden">Log</span>
        </Button>
      </div>

      {/* Search */}
      <div className="mb-3 sm:mb-4 md:mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search episodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Episodes Table */}
      {filteredEpisodes.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white rounded-lg border">
          <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">No episodes found</h3>
          <p className="text-muted-foreground text-sm sm:text-base mb-3 sm:mb-4 px-3">
            {searchTerm
              ? "No episodes match your search criteria"
              : "Get started by logging your first episode"}
          </p>
          {!searchTerm && (
            <Button onClick={() => router.push("/content-department/log-episodes")} className="touch-target">
              <Plus className="mr-2 h-4 w-4" />
              Log Episodes
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead>Logged By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <Fragment key={project.projectId}>
                    <TableRow
                      className="bg-slate-50 hover:bg-slate-100 cursor-pointer border-t-2 border-slate-200"
                      onClick={() => toggleProject(project.projectId)}
                    >
                      <TableCell colSpan={5} className="font-semibold py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedProjects.has(project.projectId) ? (
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
                            {project.totalCount} {project.totalCount === 1 ? "Episode" : "Episodes"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedProjects.has(project.projectId) &&
                      project.episodes.map((episode) => (
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
                            {episode.logged_by_user?.name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {new Date(episode.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" side="bottom" collisionPadding={10} className="z-50 w-[calc(100vw-2rem)] max-w-64 md:max-w-none md:w-56">
                                {canEditEpisode(episode) && (
                                  <DropdownMenuItem onClick={() => router.push(`/content-department/episodes/${episode.id}/edit`)}>
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
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {projects.map((project) => (
              <div key={project.projectId}>
                <div
                  className="p-4 flex items-center justify-between bg-slate-50"
                  onClick={() => toggleProject(project.projectId)}
                >
                  <div className="flex items-center gap-2">
                    {expandedProjects.has(project.projectId) ? (
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

                {expandedProjects.has(project.projectId) && (
                  <div className="divide-y divide-slate-200">
                    {project.episodes.map((episode) => (
                      <div key={episode.id} className="p-4 flex flex-col gap-3 pl-8 border-l-2 border-slate-200 bg-white">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Badge variant="outline" className="flex-shrink-0">EP {episode.episode_number}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(episode.created_at).toLocaleDateString()}</span>
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
                            <span className="text-sm text-muted-foreground flex-1">
                              By: {episode.logged_by_user?.name || "Unknown"}
                            </span>
                            {canEditEpisode(episode) && (
                              <Button size="sm" variant="outline" onClick={() => router.push(`/content-department/episodes/${episode.id}/edit`)} className="touch-target">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {episode.attachment_url && (
                              <Button size="sm" variant="outline" onClick={() => handleDownload(episode)} className="touch-target">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination info */}
      {filteredEpisodes.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredEpisodes.length} of {episodes.length} episode(s)
        </div>
      )}
    </div>
  );
}
