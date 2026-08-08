"use client";

/**
 * Dynamic Imports for Heavy Client Components
 * Reduces initial bundle size by lazy loading heavy components
 * Only loads when needed, improving Time to Interactive (TTI)
 */

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Loading fallback for charts
const ChartLoader = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-end justify-around gap-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-t"
            style={{ height: `${Math.random() * 70 + 30}%` }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

// Loading fallback for tables
const TableLoader = () => (
  <Card className="animate-pulse">
    <CardContent className="p-4">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border-b">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Loading fallback for complex widgets
const WidgetLoader = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64 mt-2" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Charts - Heavy Recharts library
 */
export const DynamicArchiveGenreChart = dynamic(
  () => import("@/components/management/charts/archive-genre-chart").then((mod) => mod.ArchiveGenreChart),
  {
    loading: () => <ChartLoader />,
    ssr: false, // Disable SSR for client-only chart libraries
  }
);

export const DynamicEventAnalysisChart = dynamic(
  () => import("@/components/management/charts/event-analysis-chart").then((mod) => mod.EventAnalysisChart),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * Complex Data Tables
 */
export const DynamicEvaluatorLeaderboard = dynamic(
  () => import("@/components/management/evaluator-leaderboard").then((mod) => mod.EvaluatorLeaderboard),
  {
    loading: () => <TableLoader />,
    ssr: false,
  }
);

/**
 * Heavy Widgets with Complex Logic
 */
export const DynamicTopTeamsWidget = dynamic(
  () => import("@/components/management/team-performance/top-teams-widget").then((mod) => mod.TopTeamsWidget),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

export const DynamicWriterFinancialSummaryWidget = dynamic(
  () => import("@/components/management/writer-financial-summary-widget").then((mod) => mod.WriterFinancialSummaryWidget),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

export const DynamicContractTermsOverview = dynamic(
  () => import("@/components/management/contract-terms-overview").then((mod) => mod.ContractTermsOverview),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

export const DynamicScriptingPhase = dynamic(
  () => import("@/components/management/scripting-phase").then((mod) => mod.ScriptingPhase),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

export const DynamicEvaluatorPipelineEpisodes = dynamic(
  () => import("@/components/management/evaluator-pipeline-episodes").then((mod) => mod.EvaluatorPipelineEpisodes),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

/**
 * Card Components
 */
export const DynamicCriticalAlertsCard = dynamic(
  () => import("@/components/management/cards/critical-alerts-card").then((mod) => mod.CriticalAlertsCard),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

export const DynamicPipelineOverviewCards = dynamic(
  () => import("@/components/management/cards/pipeline-overview-cards").then((mod) => mod.PipelineOverviewCards),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

export const DynamicRecentActivityCard = dynamic(
  () => import("@/components/management/cards/recent-activity-card").then((mod) => mod.RecentActivityCard),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

export const DynamicTeamWiseProjects = dynamic(
  () => import("@/components/management/team-projects/team-wise-projects").then((mod) => mod.TeamWiseProjects),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

/**
 * Active Projects Charts (from whats-cooking)
 */
export const DynamicGenreDonut = dynamic(
  () => import("@/components/management/whats-cooking/charts/genre-donut").then((mod) => mod.GenreDonut),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

export const DynamicSlotBars = dynamic(
  () => import("@/components/management/whats-cooking/charts/slot-bars").then((mod) => mod.SlotBars),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

export const DynamicRatingBars = dynamic(
  () => import("@/components/management/whats-cooking/charts/rating-bars").then((mod) => mod.RatingBars),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

export const DynamicEpisodeProgress = dynamic(
  () => import("@/components/management/whats-cooking/charts/episode-progress").then((mod) => mod.EpisodeProgress),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

export const DynamicTimelineChart = dynamic(
  () => import("@/components/management/whats-cooking/charts/timeline-chart").then((mod) => mod.TimelineChart),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * Evaluator Bias / Rating Differential
 */
export const DynamicBiasPageClient = dynamic(
  () => import("@/components/management/evaluator-bias/bias-page-client").then((mod) => mod.BiasPageClient),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

/**
 * Pending by Person
 */
export const DynamicPendingByPerson = dynamic(
  () => import("@/components/management/pending-by-person").then((mod) => mod.PendingByPerson),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

/**
 * Rating Comparison (One-liner vs Episode)
 */
export const DynamicRatingComparison = dynamic(
  () => import("@/components/management/rating-comparison").then((mod) => mod.RatingComparison),
  {
    loading: () => <TableLoader />,
    ssr: false,
  }
);

/**
 * Dept Output Ranking
 */
export const DynamicDeptOutputRanking = dynamic(
  () => import("@/components/management/dept-output-ranking").then((mod) => mod.DeptOutputRanking),
  {
    loading: () => <TableLoader />,
    ssr: false,
  }
);

/**
 * Production Phases (Pre Cast / Pre Production / Production Start)
 */
export const DynamicProductionPhases = dynamic(
  () => import("@/components/management/production-phases").then((mod) => mod.ProductionPhases),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

/**
 * Genre / Theme Breakdown (Commercial Positioning + Subject Matter)
 */
export const DynamicGenreThemeBreakdown = dynamic(
  () => import("@/components/management/genre-theme-breakdown").then((mod) => mod.GenreThemeBreakdown),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * Revision Ranking by Dept (fewest changes = best)
 */
export const DynamicRevisionRanking = dynamic(
  () => import("@/components/management/revision-ranking").then((mod) => mod.RevisionRanking),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * POV / Audience Focus Breakdown
 */
export const DynamicPovBreakdown = dynamic(
  () => import("@/components/management/pov-breakdown").then((mod) => mod.PovBreakdown),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * Delay Tracker (Commitment vs Actual Pace)
 */
export const DynamicDelayTracker = dynamic(
  () => import("@/components/management/delay-tracker").then((mod) => mod.DelayTracker),
  {
    loading: () => <WidgetLoader />,
    ssr: false,
  }
);

/**
 * Rating Trends (One-liner → Episode sparklines per project)
 */
export const DynamicRatingTrends = dynamic(
  () => import("@/components/management/rating-trends").then((mod) => mod.RatingTrends),
  {
    loading: () => <TableLoader />,
    ssr: false,
  }
);

/**
 * Quality vs Quantity (4-Quadrant Scatter Plot)
 */
export const DynamicQualityQuantityChart = dynamic(
  () => import("@/components/management/quality-quantity-chart").then((mod) => mod.QualityQuantityChart),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * Annual Target Visual (Progress rings + slot-wise bar charts)
 */
export const DynamicAnnualTargetVisual = dynamic(
  () => import("@/components/management/annual-target-visual").then((mod) => mod.AnnualTargetVisual),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);
