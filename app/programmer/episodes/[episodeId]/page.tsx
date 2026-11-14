"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EpisodicEvaluationForm } from "@/components/episodic-evaluations/episodic-evaluation-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileText, Trash2, FilePenLine } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { EpisodeRevisions } from "@/components/episodes/episode-revisions";
import { EvaluatingVersionBanner } from "@/components/ui/evaluating-version-banner";
import { EpisodeNav } from "@/components/episodes/episode-nav";
import { canUploadRevision } from "@/lib/episodes/permissions";
import type { Episode, EpisodicEvaluation } from "@/types";
import type { EpisodicEvaluationFormData } from "@/lib/validations/episodic-evaluations";

interface EpisodePageProps {
    params: Promise<{ episodeId: string }>;
}

export default function ProgrammerEpisodicEvaluationPage({ params }: EpisodePageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const revisionId = searchParams.get("revision_id") || undefined;
    const supabase = createClient();

    const [episodeId, setEpisodeId] = useState<string | null>(null);
    const [episode, setEpisode] = useState<Episode | null>(null);
    const [existingEvaluation, setExistingEvaluation] = useState<EpisodicEvaluation | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [currentUserTeamId, setCurrentUserTeamId] = useState<string | null>(null);
    const [canEvaluate, setCanEvaluate] = useState(true);
    const [deleting, setDeleting] = useState(false);
    // Set after submitting this episode's evaluation: shows the "evaluate next" bar
    const [justEvaluated, setJustEvaluated] = useState(false);

    useEffect(() => {
        params.then((resolvedParams) => {
            setEpisodeId(resolvedParams.episodeId);
        });
    }, [params]);

    // Fetch current user info for the discussion thread
    useEffect(() => {
        const fetchCurrentUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);
            const { data: profile } = await supabase
                .from("users")
                .select("role, can_evaluate, team_id")
                .eq("id", user.id)
                .single();
            if (profile) {
                setCurrentUserRole(profile.role);
                setCanEvaluate((profile as any).can_evaluate !== false);
                setCurrentUserTeamId((profile as any).team_id || null);
            }
        };
        fetchCurrentUser();
    }, [supabase]);

    const fetchEpisodeAndEvaluation = useCallback(async () => {
        if (!episodeId) return;

        setLoading(true);
        // Moving between episodes can keep this page mounted: never show the previous one's evaluation
        setExistingEvaluation(null);
        setIsEditing(false);
        try {
            // Fetch episode details
            const episodeResponse = await fetch(`/api/episodes/${episodeId}`);
            const episodeData = await episodeResponse.json();

            if (!episodeResponse.ok) {
                throw new Error(episodeData.error || "Failed to fetch episode");
            }

            setEpisode(episodeData.episode);

            // Check if evaluator has already evaluated this episode
            const evalParams = new URLSearchParams();
            if (revisionId) evalParams.set("revision_id", revisionId);
            const evalBaseUrl = `/api/episodic-evaluations/episode/${episodeId}${evalParams.toString() ? `?${evalParams}` : ""}`;
            const evalResponse = await fetch(`${evalBaseUrl}${evalBaseUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, { cache: 'no-store' });
            const evalData = await evalResponse.json();

            if (!evalResponse.ok) {
                console.error("Error checking evaluation status:", evalData.error);
            } else {
                setExistingEvaluation(evalData.evaluation || null);
            }
        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast.error(error.message || "Failed to load episode");
            router.push("/programmer/episodes");
        } finally {
            setLoading(false);
        }
    }, [episodeId, revisionId, router]);

    useEffect(() => {
        if (episodeId) {
            setJustEvaluated(false);
            fetchEpisodeAndEvaluation();
        }
    }, [episodeId, fetchEpisodeAndEvaluation]);

    const handleSubmit = async (formData: EpisodicEvaluationFormData) => {
        try {
            if (existingEvaluation && isEditing) {
                // Update existing evaluation
                const patchResponse = await fetch(`/api/episodic-evaluations/${existingEvaluation.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });
                const patchData = await patchResponse.json();
                if (!patchResponse.ok) {
                    throw new Error(patchData.error || "Failed to update evaluation");
                }
                toast.success("Evaluation updated successfully!");
                setIsEditing(false);
                await fetchEpisodeAndEvaluation();
                return;
            }

            // Create new evaluation
            const response = await fetch("/api/episodic-evaluations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...formData, revision_id: revisionId || null }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit evaluation");
            }

            toast.success("Evaluation submitted successfully!");
            await fetchEpisodeAndEvaluation();
            setJustEvaluated(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error: any) {
            console.error("Error submitting evaluation:", error);
            throw error;
        }
    };

    const handleDeleteEvaluation = async () => {
        if (!existingEvaluation) return;
        if (!window.confirm("Are you sure you want to delete this evaluation? This cannot be undone.")) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/episodic-evaluations/${existingEvaluation.id}`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to delete evaluation");
            toast.success("Evaluation deleted — you can re-evaluate this episode now");
            setExistingEvaluation(null);
            setIsEditing(false);
        } catch (error: any) {
            console.error("Error deleting evaluation:", error);
            toast.error(error.message || "Failed to delete evaluation");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!episode) {
        return (
            <div className="mobile-container mobile-section">
                <Card className="p-12 text-center">
                    <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Episode Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        The episode you&apos;re looking for doesn&apos;t exist or has been removed.
                    </p>
                    <BackButton fallbackHref="/programmer/episodes" />
                </Card>
            </div>
        );
    }

    return (
        <div className="mobile-container mobile-section space-y-4 sm:space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:gap-6 mb-8">
                <div className="flex items-center justify-between">
                    <BackButton fallbackHref="/programmer/episodes" variant="outline" size="sm" className="w-fit" />
                    {existingEvaluation && !isEditing && (
                        <div className="flex items-center gap-3">
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                                Evaluated{existingEvaluation.evaluator?.name ? ` by ${existingEvaluation.evaluator.name}` : ""}
                            </Badge>
                            {canEvaluate && (
                                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                                    Edit
                                </Button>
                            )}
                            {/* Delete button hidden — uncomment if needed
                            <Button size="sm" variant="destructive" disabled={deleting} onClick={handleDeleteEvaluation}>
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" /> Delete</>}
                            </Button>
                            */}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                        {existingEvaluation ? (isEditing ? "Edit Evaluation" : "View Evaluation") : "Evaluate Episode"}
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        {existingEvaluation
                            ? (isEditing ? "Update and resubmit the team evaluation" : "Programming team evaluation for this episode")
                            : "Complete the episodic evaluation form below"}
                    </p>
                </div>
            </div>

            <EpisodeNav
                episode={episode}
                revisionId={revisionId}
                projectTitle={(episode as any).call_report?.working_title}
                hrefFor={(id, rev) => rev ? `/programmer/episodes/${id}?revision_id=${rev}` : `/programmer/episodes/${id}`}
                backHref="/programmer/episodes"
                justEvaluated={justEvaluated}
            />

            {/* Which version is being evaluated: the revision (with its file) or the original */}
            <EvaluatingVersionBanner
                apiBasePath="/api/episodes"
                storageBucket="episodes"
                entityId={episode.id}
                revisionId={revisionId}
                entityLabel={`EP${episode.episode_number}`}
            />

            {/* Episode Revisions */}
            {episodeId && (
                <EpisodeRevisions
                    episodeId={episodeId}
                    activeRevisionId={revisionId}
                    canEdit={!!(currentUserId && currentUserRole && episode && canUploadRevision(currentUserId, currentUserRole, episode, currentUserTeamId))}
                    userRole={currentUserRole || undefined}
                />
            )}

            {/* Evaluation Form */}
            <EpisodicEvaluationForm
                key={`${episode.id}:${revisionId ?? ""}`}
                episode={episode}
                revisionId={revisionId}
                existingEvaluation={existingEvaluation || undefined}
                onSubmit={handleSubmit}
                disabled={false}
                showSubmit={(!existingEvaluation || isEditing) && canEvaluate}
                viewOnly={!!existingEvaluation && !isEditing || !canEvaluate}
                currentUserId={currentUserId ?? undefined}
                currentUserRole={currentUserRole ?? undefined}
            />
        </div>
    );
}
