"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEpisodeClient } from "@/lib/episodes/client";
import { EpisodeEditForm } from "@/components/episodes/episode-edit-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { Episode } from "@/types";

interface EpisodeEditPageProps {
  params: Promise<{ id: string }>;
}

export default function ContentDepartmentEpisodeEditPage({ params }: EpisodeEditPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setEpisodeId(resolvedParams.id);
    });
  }, [params]);

  const fetchEpisode = useCallback(async () => {
    if (!episodeId) return;

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Unauthorized");
        router.push("/login");
        return;
      }

      // Get user role and team
      const { data: userData } = await supabase
        .from("users")
        .select("role, team_id")
        .eq("id", user.id)
        .single();

      if (!userData || !["content_creator", "content_manager", "evaluator", "admin"].includes(userData.role)) {
        toast.error("Forbidden - Insufficient permissions");
        router.push("/content-department");
        return;
      }

      // Fetch episode
      const episodeData = await getEpisodeClient(episodeId);
      setEpisode(episodeData);

      // Get the team_id from the linked call report
      let episodeTeamId: string | null = null;
      if (episodeData.call_report_id) {
        const { data: crData } = await supabase
          .from("call_reports")
          .select("team_id")
          .eq("id", episodeData.call_report_id)
          .single();
        episodeTeamId = crData?.team_id || null;
      }

      // Check permissions: owner, manager/admin, or same team
      const hasEditPermission =
        episodeData.logged_by === user.id ||
        ["content_manager", "admin"].includes(userData.role) ||
        (episodeTeamId && userData.team_id && episodeTeamId === userData.team_id);

      if (!hasEditPermission) {
        toast.error("You don't have permission to edit this episode");
        router.push("/content-department/episodes");
        return;
      }

      setCanEdit(true);
    } catch (error: any) {
      console.error("Error fetching episode:", error);
      toast.error(error.message || "Failed to load episode");
      router.push("/content-department/episodes");
    } finally {
      setLoading(false);
    }
  }, [episodeId, router, supabase]);

  useEffect(() => {
    if (episodeId) {
      fetchEpisode();
    }
  }, [episodeId, fetchEpisode]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!episode || !canEdit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Episode Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The episode you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to edit it.
          </p>
          <BackButton fallbackHref="/content-department/episodes" />
        </Card>
      </div>
    );
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/content-department/episodes" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Episode</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Update episode details and information
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <EpisodeEditForm
        episode={episode}
        onSuccess={() => {
          router.push("/content-department/episodes");
          router.refresh(); // Force data refresh to show updated episode
        }}
      />
    </div>
  );
}
