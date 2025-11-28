import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WhatsCookingDashboard } from "@/components/management/whats-cooking-dashboard";
import { getActiveIdeasDetails, calculateEpisodeMetrics } from "@/lib/management/active-ideas-details";
import { FileVideo, CheckCircle2, FolderOpen, TrendingUp } from "lucide-react";
import { TopPicks } from "@/components/management/whats-cooking/top-picks";
import { StageSummary } from "@/components/management/whats-cooking/stage-summary";
import { ThemeGroups } from "@/components/management/whats-cooking/theme-groups";
import { RatingTiers } from "@/components/management/whats-cooking/rating-tiers";
import { GenreDonut } from "@/components/management/whats-cooking/charts/genre-donut";
import { SlotBars } from "@/components/management/whats-cooking/charts/slot-bars";
import { RatingBars } from "@/components/management/whats-cooking/charts/rating-bars";
import { EpisodeProgress } from "@/components/management/whats-cooking/charts/episode-progress";
import { TimelineChart } from "@/components/management/whats-cooking/charts/timeline-chart";

// Add Next.js caching
export const revalidate = 300; // 5 minutes

export default async function WhatsCookingPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch user data
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Check if user has permission (admin, management, executive)
  if (!userData || !["admin", "management", "executive"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch active ideas details
  const activeIdeasDetails = await getActiveIdeasDetails();

  // Calculate episode metrics
  const episodeMetrics = calculateEpisodeMetrics(activeIdeasDetails.details);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            What's Cooking
          </h1>
          <p className="text-gray-500 mt-1">
            Active ideas, preliminary scripts, and projects under consideration
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {activeIdeasDetails.total} active projects
        </div>
      </div>

      {/* Summary Stats - Clean minimal design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FolderOpen className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{episodeMetrics.totalProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileVideo className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Episodes Planned</p>
              <p className="text-2xl font-bold text-gray-900">{episodeMetrics.totalEpisodesPlanned}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Episodes Received</p>
              <p className="text-2xl font-bold text-gray-900">{episodeMetrics.totalEpisodesReceived}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#224794] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/70 font-medium">Completion Rate</p>
              <p className="text-2xl font-bold text-white">{episodeMetrics.overallCompletionPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GenreDonut ideas={activeIdeasDetails.details} />
        <SlotBars ideas={activeIdeasDetails.details} />
        <RatingBars ideas={activeIdeasDetails.details} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EpisodeProgress ideas={activeIdeasDetails.details} />
        <TimelineChart ideas={activeIdeasDetails.details} />
      </div>

      {/* Top Picks - What's Hot */}
      <TopPicks ideas={activeIdeasDetails.details} />

      {/* Pipeline by Stage */}
      <StageSummary ideas={activeIdeasDetails.details} />

      {/* Two column layout for Theme and Rating */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Theme */}
        <ThemeGroups ideas={activeIdeasDetails.details} />

        {/* By Rating */}
        <RatingTiers ideas={activeIdeasDetails.details} />
      </div>

      {/* Detailed Project Table */}
      <WhatsCookingDashboard ideas={activeIdeasDetails.details} />
    </div>
  );
}
