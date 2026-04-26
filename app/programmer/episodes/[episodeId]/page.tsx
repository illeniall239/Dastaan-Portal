"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EpisodicEvaluationForm } from "@/components/episodic-evaluations/episodic-evaluation-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { Episode, EpisodicEvaluation } from "@/types";
import type { EpisodicEvaluationFormData } from "@/lib/validations/episodic-evaluations";

interface EpisodePageProps {
    params: Promise<{ episodeId: string }>;
}

export default function ProgrammerEpisodicEvaluationPage({ params }: EpisodePageProps) {
    const router = useRouter();
    const supabase = createClient();

    const [episodeId, setEpisodeId] = useState<string | null>(null);
    const [episode, setEpisode] = useState<Episode | null>(null);
    const [existingEvaluation, setExistingEvaluation] = useState<EpisodicEvaluation | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

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
                .select("role")
                .eq("id", user.id)
                .single();
            if (profile) setCurrentUserRole(profile.role);
        };
        fetchCurrentUser();
    }, [supabase]);

    const fetchEpisodeAndEvaluation = useCallback(async () => {
        if (!episodeId) return;

        setLoading(true);
        try {
            // Fetch episode details
            const episodeResponse = await fetch(`/api/episodes/${episodeId}`);
            const episodeData = await episodeResponse.json();

            if (!episodeResponse.ok) {
                throw new Error(episodeData.error || "Failed to fetch episode");
            }

            setEpisode(episodeData.episode);

            // Check if evaluator has already evaluated this episode
            const evalResponse = await fetch(`/api/episodic-evaluations/episode/${episodeId}`);
            const evalData = await evalResponse.json();

            if (!evalResponse.ok) {
                console.error("Error checking evaluation status:", evalData.error);
            } else if (evalData.evaluation) {
                setExistingEvaluation(evalData.evaluation);
            }
        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast.error(error.message || "Failed to load episode");
            router.push("/programmer/episodes");
        } finally {
            setLoading(false);
        }
    }, [episodeId, router]);

    useEffect(() => {
        if (episodeId) {
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
                    body: JSON.stringify({
                        no_of_pages: formData.no_of_pages,
                        no_of_scenes: formData.no_of_scenes,
                        events: formData.events,
                        conflict_of_content_score: formData.conflict_of_content_score,
                        characterization_score: formData.characterization_score,
                        story_progression_score: formData.story_progression_score,
                        freezes_score: formData.freezes_score,
                        whats_next_element_score: formData.whats_next_element_score,
                    }),
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
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit evaluation");
            }

            toast.success("Evaluation submitted successfully!");

            setTimeout(() => {
                router.push("/programmer/episodes");
            }, 1500);
        } catch (error: any) {
            console.error("Error submitting evaluation:", error);
            throw error;
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
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>
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

            {/* Evaluation Form */}
            <EpisodicEvaluationForm
                episode={episode}
                existingEvaluation={existingEvaluation || undefined}
                onSubmit={handleSubmit}
                disabled={false}
                showSubmit={!existingEvaluation || isEditing}
                viewOnly={!!existingEvaluation && !isEditing}
                currentUserId={currentUserId ?? undefined}
                currentUserRole={currentUserRole ?? undefined}
            />
        </div>
    );
}
