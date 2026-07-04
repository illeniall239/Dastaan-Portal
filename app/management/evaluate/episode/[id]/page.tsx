"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EpisodicEvaluationForm } from "@/components/episodic-evaluations/episodic-evaluation-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileText, FilePenLine } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { EpisodeRevisions } from "@/components/episodes/episode-revisions";
import type { Episode, EpisodicEvaluation } from "@/types";
import type { EpisodicEvaluationFormData } from "@/lib/validations/episodic-evaluations";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

export default function ManagementEvaluateEpisodePage({ params }: EpisodePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revisionId = searchParams.get("revision_id") || undefined;
  const supabase = createClient();

  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [existingEvaluation, setExistingEvaluation] = useState<EpisodicEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMandatoryApprover, setIsMandatoryApprover] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setEpisodeId(resolvedParams.id);
    });
  }, [params]);

  // Check user role
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role, email")
        .eq("id", user.id)
        .single();

      if (!userData || !["admin", "management", "executive"].includes(userData.role)) {
        router.push("/unauthorized");
        return;
      }

      setCurrentUserId(user.id);
      setUserRole(userData.role);
      setIsMandatoryApprover(MANDATORY_APPROVER_EMAILS.includes(userData.email || ""));
    }

    checkUser();
  }, [router, supabase]);

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

      // Check if user has already evaluated this episode
      const evalParams = new URLSearchParams();
      if (revisionId) evalParams.set("revision_id", revisionId);
      const evalBaseUrl = `/api/episodic-evaluations/episode/${episodeId}${evalParams.toString() ? `?${evalParams}` : ""}`;
      const evalResponse = await fetch(`${evalBaseUrl}${evalBaseUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, { cache: 'no-store' });
      const evalData = await evalResponse.json();

      if (!evalResponse.ok) {
        console.error("Error checking evaluation status:", evalData.error);
      } else if (evalData.evaluation) {
        setExistingEvaluation(evalData.evaluation);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(error.message || "Failed to load episode");
      router.push("/management");
    } finally {
      setLoading(false);
    }
  }, [episodeId, revisionId, router]);

  useEffect(() => {
    if (episodeId && userRole) {
      fetchEpisodeAndEvaluation();
    }
  }, [episodeId, userRole, fetchEpisodeAndEvaluation]);

  const handleSubmit = async (formData: EpisodicEvaluationFormData) => {
    try {
      // Management users can only create new evaluations, not edit existing ones
      if (existingEvaluation) {
        toast.error("You have already evaluated this episode");
        return;
      }

      // Create new evaluation
      const response = await fetch("/api/episodic-evaluations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          episode_id: episodeId,
          revision_id: revisionId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit evaluation");
      }

      // Sync decision to episode.approval_status — only for mandatory approvers (Humera & Salman)
      if (formData.decision && episodeId && isMandatoryApprover) {
        const approvalStatus =
          formData.decision === "approve" ? "approved" :
          formData.decision === "reject" ? "rejected" :
          "needs_revision";
        await fetch(`/api/episodes/${episodeId}/approval`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approval_status: approvalStatus }),
        });
      }

      toast.success("Management evaluation submitted successfully!");

      setTimeout(() => {
        router.push("/management/pending-evaluations?tab=episodes");
      }, 1500);
    } catch (error: any) {
      console.error("Error submitting evaluation:", error);
      throw error;
    }
  };

  if (loading || !userRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Episode Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The episode you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <BackButton fallbackHref="/management" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/management" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Evaluate Episode {episode.episode_number}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {episode.title || "Untitled Episode"}
          </p>
        </div>
      </div>

      {/* Revision evaluation banner */}
      {revisionId && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 mb-6">
          <FilePenLine className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Evaluating a <span className="font-semibold">specific revision</span> of this episode
          </p>
        </div>
      )}

      {/* Episode Revisions */}
      {episodeId && (
        <div className="mb-6">
          <EpisodeRevisions
            episodeId={episodeId}
            canEdit={false}
            userRole={userRole || undefined}
          />
        </div>
      )}

      <EpisodicEvaluationForm
        episode={episode}
        onSubmit={handleSubmit}
        existingEvaluation={existingEvaluation || undefined}
        disabled={!!existingEvaluation}
        currentUserId={currentUserId ?? undefined}
        currentUserRole={userRole ?? undefined}
      />
    </div>
  );
}
