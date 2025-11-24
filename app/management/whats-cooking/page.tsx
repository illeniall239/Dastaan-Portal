import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WhatsCookingDashboard } from "@/components/management/whats-cooking-dashboard";
import { RatingDistributionChart } from "@/components/management/charts/rating-distribution-chart";
import { TimeSlotAllocationChart } from "@/components/management/charts/time-slot-allocation-chart";
import { ContentTypeDistributionChart } from "@/components/management/charts/content-type-distribution-chart";
import { ThemeDistributionChart } from "@/components/management/charts/theme-distribution-chart";
import { DaysActiveChart } from "@/components/management/charts/days-active-chart";
import { getActiveIdeasDetails, calculateEpisodeMetrics, calculateWriterProductivity } from "@/lib/management/active-ideas-details";
import { IdeasByGenreChart } from "@/components/management/charts/ideas-by-genre-chart";
import { EpisodeMetricsCards } from "@/components/management/episode-metrics-cards";
import { WriterProductivityTable } from "@/components/management/writer-productivity-table";
import { ProjectCompletionChart } from "@/components/management/charts/project-completion-chart";

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

  // Calculate writer productivity
  const writerProductivity = calculateWriterProductivity(activeIdeasDetails.details);

  // Process ideas by genre for chart
  const ideasByGenre = activeIdeasDetails.details.reduce((acc: any[], idea) => {
    idea.genre.forEach((genre: string) => {
      const existing = acc.find(item => item.genre === genre);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ genre, count: 1 });
      }
    });
    return acc;
  }, []).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-1 bg-gradient-to-b from-orange-500 to-red-500 rounded-full" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              What's Cooking
            </h1>
          </div>
          <p className="text-slate-600 ml-7">
            Active ideas, preliminary scripts, and projects under consideration
          </p>
          <div className="ml-7 mt-2 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-slate-600">{activeIdeasDetails.total} Active Ideas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-slate-600">Live Pipeline View</span>
            </div>
          </div>
        </div>

        {/* Episode Metrics Summary Cards */}
        <EpisodeMetricsCards metrics={episodeMetrics} />

        {/* Project Completion & Writer Productivity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ProjectCompletionChart metrics={episodeMetrics} />
          <WriterProductivityTable writers={writerProductivity} />
        </div>

        {/* Visual Charts Grid */}
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RatingDistributionChart ideas={activeIdeasDetails.details} />
            <TimeSlotAllocationChart ideas={activeIdeasDetails.details} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IdeasByGenreChart data={ideasByGenre} />
            <ContentTypeDistributionChart ideas={activeIdeasDetails.details} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ThemeDistributionChart ideas={activeIdeasDetails.details} />
            <DaysActiveChart ideas={activeIdeasDetails.details} />
          </div>
        </div>

        {/* Main Dashboard Table */}
        <div>
          <WhatsCookingDashboard ideas={activeIdeasDetails.details} />
        </div>
      </div>
    </div>
  );
}
