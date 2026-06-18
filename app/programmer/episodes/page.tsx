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
    ClipboardCheck,
    Eye,
    CheckCircle2,
    ChevronRight,
    ChevronDown,
    Pencil,
    Info,
} from "lucide-react";
import { formatFileSize } from "@/lib/validations/episodes";
import { EpisodeUploadForm, type EpisodeFormEntry } from "@/components/episodes/episode-upload-form";
import { EpisodeFileUpload } from "@/components/episodes/episode-file-upload";
import { getGradeColorClasses } from "@/lib/validations/episodic-evaluations";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import type { EpisodeWithDetails, EpisodicEvaluationWithDetails } from "@/types";
import { BackButton } from "@/components/ui/back-button";
import { formatDate } from "@/lib/utils/format-date";

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
    [episodeId: string]: { evaluated: boolean; evaluatedByName?: string | null };
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

interface EvaluationProjectGroup {
    projectId: string;
    projectName: string;
    projectType: "call_report" | "story";
    writerName?: string;
    projectStatus?: string;
    evaluations: EpisodicEvaluationWithDetails[];
    totalCount: number;
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

export default function ProgrammerEpisodesPage() {
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
    const [expandedEvalProjects, setExpandedEvalProjects] = useState<Set<string>>(new Set());
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
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

    // My evaluations state
    const [myEvaluations, setMyEvaluations] = useState<EpisodicEvaluationWithDetails[]>([]);
    const [evaluationsLoading, setEvaluationsLoading] = useState(false);

    const fetchEpisodesAndStatus = useCallback(async (page: number = 1, append: boolean = false) => {
        if (page === 1) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            // Fetch user info first (needed for evaluation status)
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

            // Fetch episodes with project-based pagination (20 projects at a time, all their episodes)
            const response = await fetch(
                `/api/episodes?group_by_project=true&project_limit=20&project_page=${page}&include_evaluation_status=true&_t=${Date.now()}`,
                { cache: 'no-store' }
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

            // Build evaluation status from API response (already included)
            const status: EvaluationStatus = {};
            fetchedEpisodes.forEach((ep: any) => {
                status[ep.id] = { evaluated: ep.is_evaluated || false, evaluatedByName: ep.evaluated_by_name ?? null };
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
            console.error("Error fetching episodes:", error);
            toast.error(error.message || "Failed to load episodes");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []); // supabase client is stable, no need to include in dependencies

    // Load more projects
    const loadMoreProjects = useCallback(() => {
        if (!loadingMore && hasMoreProjects) {
            fetchEpisodesAndStatus(projectPage + 1, true);
        }
    }, [loadingMore, hasMoreProjects, projectPage, fetchEpisodesAndStatus]);

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
    }, []); // supabase client is stable, no need to include in dependencies

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

    // Search debounce effect (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
                },
            ]);
        } finally {
            setExistingEpisodesLoading(false);
        }
    }, [selectedSource]);

    useEffect(() => {
        loadExistingEpisodes();
    }, [loadExistingEpisodes]);

    const fetchMyEvaluations = async () => {
        setEvaluationsLoading(true);
        try {
            const response = await fetch(`/api/episodic-evaluations?_t=${Date.now()}`, { cache: 'no-store' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch evaluations");
            }

            setMyEvaluations(data.data || []);
        } catch (error: any) {
            console.error("Error fetching evaluations:", error);
            toast.error(error.message || "Failed to load evaluations");
        } finally {
            setEvaluationsLoading(false);
        }
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (value === "evaluations") {
            fetchMyEvaluations();
        }
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

        const missingFile = newEpisodes.find((ep) => !ep.file);
        if (missingFile) {
            toast.error(`Please attach a file for Episode ${missingFile.episode_number}`);
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

            const response = await fetch("/api/episodes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
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

    // Memoize filtering to avoid re-filtering on every render
    const filteredEpisodes = useMemo(() => {
        if (!debouncedSearchTerm.trim()) return episodes;

        const searchLower = debouncedSearchTerm.toLowerCase();
        return episodes.filter((episode) => (
            episode.episode_number.toString().includes(searchLower) ||
            episode.title?.toLowerCase().includes(searchLower) ||
            episode.call_report?.working_title?.toLowerCase().includes(searchLower) ||
            episode.call_report?.writer_name?.toLowerCase().includes(searchLower) ||
            episode.story?.title?.toLowerCase().includes(searchLower) ||
            episode.logged_by_user?.name?.toLowerCase().includes(searchLower)
        ));
    }, [episodes, debouncedSearchTerm]);

    // Group episodes by project (call_report or story), tracking evaluation progress
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
                const callReport = ep.call_report as any;
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
            if (evaluationStatus[ep.id]?.evaluated) group.evaluatedCount++;
        });

        projectsMap.forEach((group) => {
            group.episodes.sort(
                (a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0)
            );
        });

        return Array.from(projectsMap.values());
    };

    const projects = useMemo(
        () => groupEpisodesByProject(filteredEpisodes),
        [filteredEpisodes, evaluationStatus]
    );

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
                const callReport = ep.call_report as any;
                projectId = `call_report_${ep.call_report_id}`;
                projectName = callReport.working_title;
                const crWriters = callReport.call_report_writers;
                if (crWriters && crWriters.length > 0) {
                    const sorted = [...crWriters].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
                    writerName = sorted.map((w: any) => w.writer?.name).filter(Boolean).join(", ");
                }
                if (!writerName) writerName = callReport.writer_name;
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
            (episode.attachment_name ?? null) !== (episode._originalAttachmentName ?? null)
        );
    };

    const handleSaveExistingEpisode = async (episodeId: string) => {
        const episode = existingEpisodesForSource.find((ep) => ep.id === episodeId);
        if (!episode) return;
        if (!hasEpisodeChanges(episode)) {
            toast.info("No changes to save for this episode.");
            return;
        }

        updateExistingEpisode(episodeId, { _isSaving: true, _error: null });

        try {
            const payload: Record<string, any> = {};
            let attachmentUpdated = false;

            if ((episode.episode_number ?? null) !== (episode._originalEpisodeNumber ?? null)) {
                payload.episode_number = episode.episode_number ?? 1;
            }
            if ((episode.additional_info ?? "") !== (episode._originalAdditionalInfo ?? "")) {
                payload.additional_info = episode.additional_info ?? null;
            }

            if (episode._newFile) {
                const fileExt = episode._newFile.name.split(".").pop();
                const safeExt = fileExt ? `.${fileExt}` : "";
                const storagePath = `${episode.call_report_id || episode.story_id || "episode"}/${episode.id}-${Date.now()}${safeExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("episodes")
                    .upload(storagePath, episode._newFile, { upsert: true });

                if (uploadError) throw new Error(uploadError.message || "Failed to upload file");

                const { data: publicUrlData } = supabase.storage
                    .from("episodes")
                    .getPublicUrl(storagePath);

                payload.attachment_url = publicUrlData.publicUrl;
                payload.attachment_name = episode._newFile.name;
                payload.attachment_type = episode._newFile.type || safeExt || "application/octet-stream";
                attachmentUpdated = true;
            } else if ((episode.attachment_url ?? null) !== (episode._originalAttachmentUrl ?? null)) {
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.details || "Failed to update episode");

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
            });

            toast.success(`Episode ${updatedEpisode.episode_number ?? ""} updated.`);
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
        return (
            episode.logged_by === currentUserId ||
            ["programmer", "evaluator", "content_manager", "admin", "management"].includes(currentUserRole)
        );
    };

    return (
        <div className="mobile-container mobile-section">
            <div className="flex flex-col gap-4 sm:gap-6 mb-8">
                <BackButton fallbackHref="/programmer" variant="outline" size="sm" className="w-fit" />
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">Episodes</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        View, log, and evaluate episodes
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="list">Episodes List</TabsTrigger>
                    <TabsTrigger value="log">Log Episodes</TabsTrigger>
                    <TabsTrigger value="evaluations">My Evaluations</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search episodes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

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
                                {searchTerm ? "No episodes match your search criteria" : "Get started by logging your first episode"}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border shadow-sm">
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
                                                                    {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-600 flex-shrink-0" /> : <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0" />}
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-base">{project.projectName}</span>
                                                                            {project.writerName && <span className="text-sm text-muted-foreground font-normal">by {project.writerName}</span>}
                                                                        </div>
                                                                        {project.projectStatus && <Badge variant="secondary" className="text-xs mt-1">{project.projectStatus}</Badge>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <Badge className={`${progressClass} border`}>{project.evaluatedCount}/{project.totalCount} Evaluated</Badge>
                                                                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleContinueEpisodes(project); }} disabled={project.projectType !== "call_report" || !project.sourceId}>
                                                                        <Plus className="h-3 w-3 mr-1" /> Add Episode
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    {isExpanded && project.episodes.map((episode) => {
                                                        const evalEntry = evaluationStatus[episode.id];
                                                        const isEvaluated = evalEntry?.evaluated;
                                                        const evaluatedByName = evalEntry?.evaluatedByName;
                                                        return (
                                                            <TableRow key={episode.id} className="hover:bg-slate-50">
                                                                <TableCell className="pl-12">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Badge variant="outline">EP {episode.episode_number}</Badge>
                                                                        {episode.version > 1 && (
                                                                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-100 text-blue-700">
                                                                                v{episode.version}
                                                                            </Badge>
                                                                        )}
                                                                        {episode.approval_status && (
                                                                            <Badge className={
                                                                                episode.approval_status === "approved" ? "bg-emerald-100 text-emerald-700 text-[10px] px-1 py-0 h-4" :
                                                                                episode.approval_status === "needs_revision" ? "bg-amber-100 text-amber-700 text-[10px] px-1 py-0 h-4" :
                                                                                "bg-rose-100 text-rose-700 text-[10px] px-1 py-0 h-4"
                                                                            }>
                                                                                {episode.approval_status === "approved" ? "Approved" : episode.approval_status === "needs_revision" ? "Needs Revision" : "Rejected"}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {(() => {
                                                                        const latestRev = (episode as any).latest_revision;
                                                                        const displayUrl = latestRev?.attachment_url || episode.attachment_url;
                                                                        const displayName = latestRev?.attachment_url ? latestRev.attachment_name : episode.attachment_name;
                                                                        return displayUrl ? (
                                                                            <button onClick={() => handleDownload(episode)} className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center gap-1">
                                                                                <FileText className="h-4 w-4" /> {displayName}
                                                                            </button>
                                                                        ) : <span className="text-muted-foreground italic text-sm">No file</span>;
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {isEvaluated ? <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" /> Evaluated{evaluatedByName ? ` by ${evaluatedByName}` : ""}</Badge> : <Badge variant="outline" className="text-amber-700 border-amber-300">Not Evaluated</Badge>}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <Button size="sm" variant={isEvaluated ? "outline" : "default"} onClick={() => router.push(`/programmer/episodes/${episode.id}`)}>
                                                                            {isEvaluated ? <><Pencil className="h-4 w-4 mr-1" /> Edit</> : <><ClipboardCheck className="h-4 w-4 mr-1" /> Evaluate</>}
                                                                        </Button>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" side="bottom" collisionPadding={10} className="z-50 w-56">
                                                                                {canEditEpisode(episode) && (
                                                                                    <DropdownMenuItem onClick={() => router.push(`/programmer/episodes/${episode.id}/edit`)}>
                                                                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                                {(episode.attachment_url || (episode as any).latest_revision?.attachment_url) && (
                                                                                    <DropdownMenuItem onClick={() => handleDownload(episode)}>
                                                                                        <Download className="mr-2 h-4 w-4" /> Download
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

                            <div className="md:hidden divide-y">
                                {projects.map((project) => {
                                    const isExpanded = expandedProjects.has(project.projectId);
                                    const progressPct = (project.evaluatedCount / project.totalCount) * 100;
                                    let progressClass = "bg-gray-100 text-gray-800 border-gray-300";
                                    if (progressPct === 100) progressClass = "bg-green-100 text-green-800 border-green-300";
                                    else if (progressPct > 0) progressClass = "bg-yellow-100 text-yellow-800 border-yellow-300";

                                    return (
                                        <div key={project.projectId}>
                                            <div className="p-4 flex items-center justify-between bg-slate-50" onClick={() => toggleProject(project.projectId)}>
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-600" /> : <ChevronRight className="h-5 w-5 text-slate-600" />}
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{project.projectName}</span>
                                                            {project.writerName && <span className="text-sm text-muted-foreground">by {project.writerName}</span>}
                                                        </div>
                                                        {project.projectStatus && <Badge variant="secondary" className="text-xs mt-1">{project.projectStatus}</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`${progressClass} border`}>{project.evaluatedCount}/{project.totalCount}</Badge>
                                                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleContinueEpisodes(project); }} disabled={project.projectType !== "call_report" || !project.sourceId}>
                                                        <Plus className="h-3 w-3 mr-1" /> Add
                                                    </Button>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="divide-y divide-slate-200">
                                                    {project.episodes.map((episode) => {
                                                        const evalEntry = evaluationStatus[episode.id];
                                                        const isEvaluated = evalEntry?.evaluated;
                                                        const evaluatedByName = evalEntry?.evaluatedByName;
                                                        return (
                                                            <div key={episode.id} className="p-4 flex flex-col gap-3 pl-8 border-l-2 border-slate-200 bg-white">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        <Badge variant="outline">EP {episode.episode_number}</Badge>
                                                                        {episode.version > 1 && (
                                                                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-100 text-blue-700">
                                                                                v{episode.version}
                                                                            </Badge>
                                                                        )}
                                                                        {episode.approval_status && (
                                                                            <Badge className={
                                                                                episode.approval_status === "approved" ? "bg-emerald-100 text-emerald-700 text-[10px] px-1 py-0 h-4" :
                                                                                episode.approval_status === "needs_revision" ? "bg-amber-100 text-amber-700 text-[10px] px-1 py-0 h-4" :
                                                                                "bg-rose-100 text-rose-700 text-[10px] px-1 py-0 h-4"
                                                                            }>
                                                                                {episode.approval_status === "approved" ? "Approved" : episode.approval_status === "needs_revision" ? "Needs Revision" : "Rejected"}
                                                                            </Badge>
                                                                        )}
                                                                        <span className="font-medium text-sm truncate">{episode.title || <span className="text-muted-foreground italic">Untitled</span>}</span>
                                                                    </div>
                                                                    {isEvaluated ? <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">{evaluatedByName ? `By ${evaluatedByName}` : "Done"}</Badge> : <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">Pending</Badge>}
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <Button size="sm" variant={isEvaluated ? "outline" : "default"} onClick={() => router.push(`/programmer/episodes/${episode.id}`)} className="flex-1">
                                                                        {isEvaluated ? <>Edit</> : <>Evaluate</>}
                                                                    </Button>
                                                                    {canEditEpisode(episode) && (
                                                                        <Button size="sm" variant="outline" onClick={() => router.push(`/programmer/episodes/${episode.id}/edit`)}>Edit</Button>
                                                                    )}
                                                                    {episode.attachment_url && (
                                                                        <Button size="sm" variant="ghost" onClick={() => handleDownload(episode)}><Download className="h-4 w-4" /></Button>
                                                                    )}
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

                <TabsContent value="log">
                    <div ref={logSectionRef}>
                        <form onSubmit={handleLogEpisodes} className="space-y-8">
                            <div className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
                                <div className="space-y-2">
                                    <Label htmlFor="source-select">Select a story <span className="text-red-500">*</span></Label>
                                    <Select value={selectedSource} onValueChange={setSelectedSource} disabled={logLoading}>
                                        <SelectTrigger id="source-select"><SelectValue placeholder="Select a story" /></SelectTrigger>
                                        <SelectContent>
                                            {callReports.map((cr) => {
                                                const writerDisplay = cr.writer_names && cr.writer_names.length > 0 ? cr.writer_names.join(", ") : cr.writer_name;
                                                return <SelectItem key={cr.id} value={cr.id}>{cr.working_title} - {writerDisplay}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {selectedSource && (
                                <Card>
                                    <CardHeader><CardTitle className="text-base">Existing Episodes ({existingEpisodesForSource.length})</CardTitle></CardHeader>
                                    <CardContent>
                                        {existingEpisodesLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div> : existingEpisodesForSource.length === 0 ? <p className="text-sm text-muted-foreground">No episodes logged yet.</p> : (
                                            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                                {existingEpisodesForSource.map((episode, idx) => (
                                                    <Card key={episode.id}>
                                                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                                            <CardTitle className="text-base">Episode {episode.episode_number ?? idx + 1}</CardTitle>
                                                            <Badge variant="secondary">By {episode.logged_by_user?.name || "Unknown"}</Badge>
                                                        </CardHeader>
                                                        <CardContent className="space-y-3">
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <div className="space-y-2">
                                                                    <Label>Episode Number</Label>
                                                                    <Input type="number" value={episode.episode_number ?? ""} onChange={(e) => updateExistingEpisode(episode.id, { episode_number: parseInt(e.target.value) || undefined })} />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Attachment</Label>
                                                                    <EpisodeFileUpload
                                                                        file={episode._newFile || null}
                                                                        existingFileName={episode.attachment_name || undefined}
                                                                        existingFileUrl={episode.attachment_url || undefined}
                                                                        onExistingFileDownload={() => handleDownload(episode)}
                                                                        onFileSelect={(file) => updateExistingEpisode(episode.id, { _newFile: file })}
                                                                        onFileRemove={() => updateExistingEpisode(episode.id, { _newFile: null, attachment_url: null, attachment_name: null })}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Additional Info</Label>
                                                                    <Textarea value={episode.additional_info || ""} onChange={(e) => updateExistingEpisode(episode.id, { additional_info: e.target.value })} />
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end pt-2">
                                                                <Button size="sm" onClick={() => handleSaveExistingEpisode(episode.id)} disabled={!hasEpisodeChanges(episode) || episode._isSaving}>
                                                                    {episode._isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Changes"}
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {selectedSource && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold">Log New Episodes</h2>
                                    <EpisodeUploadForm episodes={newEpisodes} onEpisodesChange={setNewEpisodes} disabled={logLoading} existingEpisodeNumbers={existingEpisodeNumbers} />
                                </div>
                            )}

                            <Button type="submit" disabled={logLoading || !selectedSource || newEpisodes.length === 0} className="w-full">
                                {logLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                {newEpisodes.length === 1 ? "Log Episode" : `Log ${newEpisodes.length} Episodes`}
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="evaluations">
                    {evaluationsLoading ? <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div> : myEvaluations.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border">
                            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No evaluations yet</h3>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>EP #</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {evalProjects.map((project) => (
                                            <Fragment key={project.projectId}>
                                                <TableRow className="bg-slate-50 cursor-pointer" onClick={() => toggleEvalProject(project.projectId)}>
                                                    <TableCell colSpan={4} className="font-semibold">
                                                        <div className="flex items-center gap-2">
                                                            {expandedEvalProjects.has(project.projectId) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                            {project.projectName} {project.writerName && <span className="text-muted-foreground font-normal">by {project.writerName}</span>}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedEvalProjects.has(project.projectId) && project.evaluations.map((ev) => (
                                                    <TableRow key={ev.id}>
                                                        <TableCell className="pl-8"><Badge variant="outline">EP {ev.episode?.episode_number}</Badge></TableCell>
                                                        <TableCell><span className="font-bold">{ev.overall_average.toFixed(2)}</span>/10</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{formatDate(ev.submitted_at)}</TableCell>
                                                        <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => router.push(`/programmer/episodes/${ev.episode_id}`)}>View</Button></TableCell>
                                                    </TableRow>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="md:hidden divide-y">
                                {evalProjects.map((project) => (
                                    <div key={project.projectId}>
                                        <div className="p-4 bg-slate-50 font-medium" onClick={() => toggleEvalProject(project.projectId)}>{project.projectName}</div>
                                        {expandedEvalProjects.has(project.projectId) && project.evaluations.map((ev) => (
                                            <div key={ev.id} className="p-4 flex items-center justify-between bg-white">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium">EP {ev.episode?.episode_number}</span>
                                                    <span className="text-xs text-muted-foreground">{ev.overall_average.toFixed(2)}/10</span>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => router.push(`/programmer/episodes/${ev.episode_id}`)}>View</Button>
                                            </div>
                                        ))}
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
