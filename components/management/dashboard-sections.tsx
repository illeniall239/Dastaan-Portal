/**
 * Async Dashboard Sections for Streaming SSR
 * Each section fetches its own data and can be rendered independently
 * Wrapped in Suspense boundaries for progressive loading
 */

import { getAllTeamPerformanceCached } from "@/lib/management/team-performance";
import { formatTeamDisplayName } from "@/lib/management/team-display";
import { getTeamProjects } from "@/lib/management/team-projects";
import { getActiveIdeasDetails } from "@/lib/management/active-ideas-details";
import { getPendingBacklogByTeam } from "@/lib/management/pending-backlog";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExportButton } from "@/components/management/export-button";

// Dynamic imports for heavy client components (reduces initial bundle size)
import {
  DynamicTopTeamsWidget,
  DynamicContractTermsOverview,
  DynamicWriterFinancialSummaryWidget,
  DynamicGenreDonut,
  DynamicSlotBars,
  DynamicRatingBars,
  DynamicBiasPageClient,
  DynamicPendingByPerson,
  DynamicRatingComparison,
  DynamicDeptOutputRanking,
  DynamicProductionPhases,
  DynamicGenreThemeBreakdown,
  DynamicRevisionRanking,
  DynamicPovBreakdown,
  DynamicDelayTracker,
  DynamicRatingTrends,
  DynamicQualityQuantityChart,
  DynamicAnnualTargetVisual,
} from "@/components/management/dynamic-components";

import type { TeamOverviewData } from "@/components/management/team-performance/top-teams-widget";

/**
 * Combined Teams Section - Async Component
 * Merges Team Performance + Team-wise Projects into one unified view
 */
export async function TeamsOverviewSection() {
  const [allPerformance, projectGroups, pendingBacklogResult] = await Promise.all([
    getAllTeamPerformanceCached(),
    getTeamProjects(),
    getPendingBacklogByTeam(),
  ]);

  const { byTeam: pendingByTeam, global: globalPending, teamEvalCounts } = pendingBacklogResult;

  // Identify evaluator teams (Humera & Salman) — they see global pending
  const EVALUATOR_EMAILS = new Set(["humera.safder@geo.tv", "salman.ahmed@geo.tv"]);
  const evaluatorTeamIds = new Set(
    allPerformance
      .filter((t: any) => EVALUATOR_EMAILS.has(t.team_head_email))
      .map((t: any) => t.team_id)
  );

  // Filter out management teams (except Humera's)
  const filteredPerf = allPerformance.filter(
    (t: any) => t.team_type !== "management" || t.team_head_email === "humera.safder@geo.tv"
  );

  // Build a map of team_id → performance data
  const perfMap = new Map(
    filteredPerf.map((t: any) => [
      t.team_id,
      { ...t, team_name: formatTeamDisplayName(t.team_name, t.team_head_name) },
    ])
  );

  // Build a map of team_id → projects
  const projectsMap = new Map(
    projectGroups.map((g) => [g.team_id, g])
  );

  // Merge: union of all team_ids from both sources
  const allTeamIds = new Set([...perfMap.keys(), ...projectsMap.keys()]);

  const defaultBacklog = {
    pendingOneLiners: 0, pendingEpisodes: 0,
    totalOneLiners: 0, totalEpisodes: 0,
    evaluatedOneLiners: 0, evaluatedEpisodes: 0,
    oldestOneLinerDays: null, oldestEpisodeDays: null,
  };

  const teams: TeamOverviewData[] = Array.from(allTeamIds).map((teamId) => {
    const perf = perfMap.get(teamId);
    const proj = projectsMap.get(teamId);

    let pendingBacklog;
    if (evaluatorTeamIds.has(teamId)) {
      // Evaluator team: pending = total minus what their team evaluated
      const evaledOL = teamEvalCounts.get(teamId)?.oneLiners || 0;
      const evaledEp = teamEvalCounts.get(teamId)?.episodes || 0;
      pendingBacklog = {
        totalOneLiners: globalPending.totalOneLiners,
        totalEpisodes: globalPending.totalEpisodes,
        evaluatedOneLiners: evaledOL,
        evaluatedEpisodes: evaledEp,
        pendingOneLiners: globalPending.totalOneLiners - evaledOL,
        pendingEpisodes: globalPending.totalEpisodes - evaledEp,
        oldestOneLinerDays: globalPending.oldestOneLinerDays,
        oldestEpisodeDays: globalPending.oldestEpisodeDays,
      };
    } else {
      // Logging team: their own counts (evaluated = by their own team)
      pendingBacklog = pendingByTeam.get(teamId) || defaultBacklog;
    }

    return {
      team_id: teamId,
      team_name: perf?.team_name || proj?.team_name || "Unknown Team",
      team_type: perf?.team_type || proj?.team_type || "other",
      display_label: proj?.display_label || "",
      performance: perf || null,
      projects: proj?.call_reports || [],
      pendingBacklog,
    };
  });

  // Sort: teams with projects first, then alphabetically
  teams.sort((a, b) => {
    const aHas = a.projects.length > 0 ? 0 : 1;
    const bHas = b.projects.length > 0 ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.team_name.localeCompare(b.team_name);
  });

  return (
    <div id="teams-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Teams Overview
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Performance, projects, and member activity by team
          </p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="teams-section"
            filename="teams-overview"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>
      <DynamicTopTeamsWidget teams={teams} />
    </div>
  );
}

/**
 * Active Projects Charts Section - Async Component
 */
export async function ActiveProjectsChartsSection() {
  const adminClient = createAdminClient();
  const [{ details }, { data: allTeams }] = await Promise.all([
    getActiveIdeasDetails(),
    adminClient.from("teams").select("id, name, team_head:users!teams_team_head_id_fkey(name)").order("name"),
  ]);

  // Only include teams that have active projects, with friendly display names
  const teamIdsInUse = new Set(
    details.map((d: any) => d.team_id).filter(Boolean)
  );
  const teams = (allTeams || [])
    .filter((t) => teamIdsInUse.has(t.id))
    .map((t) => ({
      id: t.id,
      name: formatTeamDisplayName(t.name, (t as any).team_head?.name),
    }));

  return (
    <div id="active-projects-charts" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Active Projects
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Genre, slot, and rating distribution
          </p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="active-projects-charts"
            filename="active-projects"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <DynamicGenreDonut ideas={details} teams={teams} />
        <DynamicSlotBars ideas={details} teams={teams} />
        <DynamicRatingBars ideas={details} teams={teams} />
      </div>
    </div>
  );
}

/**
 * Contract Terms Section - Async Component
 */
export async function ContractTermsSection() {
  const adminClient = createAdminClient();

  const { data: contractTerms } = await adminClient
    .from("negotiations")
    .select(
      `
      *,
      stories!left(
        story_id,
        title,
        writer_originator_name,
        genre
      ),
      call_reports!left(
        call_report_id,
        working_title
      )
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div id="contract-terms-section" className="mb-6 sm:mb-8">
      <DynamicContractTermsOverview contractTerms={contractTerms || []} />
    </div>
  );
}

/**
 * Writer Financial Section - Async Component
 */
export async function WriterFinancialSection() {
  return (
    <div id="writer-financial-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Writer Payments & Financial Overview
          </h2>
          <p className="text-muted-foreground mt-1">
            Track negotiated amounts, contracts, and payments to writers and producers
          </p>
        </div>
      </div>
      <DynamicWriterFinancialSummaryWidget />
    </div>
  );
}

/**
 * Pending by Person Section - Async Component
 * Shows what's pending with each evaluator (content heads, Humera, etc.)
 */
export async function PendingByPersonSection() {
  return (
    <div id="pending-by-person-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Pending by Person
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Evaluation backlog per evaluator — one-liners and episodes awaiting review
          </p>
        </div>
        <ExportButton
          elementId="pending-by-person-section"
          filename="pending-by-person"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicPendingByPerson />
    </div>
  );
}

/**
 * Rating Differential Section - Async Component
 * Shows per-story evaluator scores to identify rating variance
 */
export async function RatingDifferentialSection() {
  return (
    <div id="rating-differential-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Rating Differential
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Per-story evaluator scores — spot where opinions diverge most
          </p>
        </div>
        <ExportButton
          elementId="rating-differential-section"
          filename="rating-differential"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicBiasPageClient />
    </div>
  );
}

/**
 * Rating Comparison Section - Async Component
 * Compares one-liner scores vs episode scores per project
 */
export async function RatingComparisonSection() {
  return (
    <div id="rating-comparison-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            One-Liner vs Episode Ratings
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            How episode quality compares to the original one-liner assessment
          </p>
        </div>
        <ExportButton
          elementId="rating-comparison-section"
          filename="rating-comparison"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicRatingComparison />
    </div>
  );
}

/**
 * Content Dept Output Ranking Section - Async Component
 * Episodes and one-liners per team per month, ranked by output
 */
export async function DeptOutputSection() {
  return (
    <div id="dept-output-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Content Dept Output Ranking
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Episodes and one-liners submitted per team — last 6 months
          </p>
        </div>
        <ExportButton
          elementId="dept-output-section"
          filename="dept-output-ranking"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicDeptOutputRanking />
    </div>
  );
}

/**
 * Production Phases Section - Async Component
 * Shows projects bucketed into Pre Cast, Pre Production, Production Start
 */
export async function ProductionPhasesSection() {
  return (
    <div id="production-phases-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Production Phases
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Projects approaching or ready for casting, pre-production, and production
          </p>
        </div>
        <ExportButton
          elementId="production-phases-section"
          filename="production-phases"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicProductionPhases />
    </div>
  );
}

/**
 * Genre / Theme Breakdown Section - Async Component
 * Commercial positioning + subject matter themes
 */
export async function GenreThemeSection() {
  return (
    <div id="genre-theme-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Genre & Theme Breakdown
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Commercial positioning and subject matter distribution across active projects
          </p>
        </div>
        <ExportButton
          elementId="genre-theme-section"
          filename="genre-theme-breakdown"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicGenreThemeBreakdown />
    </div>
  );
}

/**
 * Revision Ranking Section - Async Component
 * Teams ranked by average episode revisions (fewer = better)
 */
export async function RevisionRankingSection() {
  return (
    <div id="revision-ranking-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Feedback Revision Ranking
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Which content dept or project has the lowest number of changes required in feedback
          </p>
        </div>
        <ExportButton
          elementId="revision-ranking-section"
          filename="revision-ranking"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicRevisionRanking />
    </div>
  );
}

/**
 * POV / Audience Focus Section - Async Component
 * Male-centric vs female-centric vs ensemble breakdown
 */
export async function PovBreakdownSection() {
  return (
    <div id="pov-breakdown-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Audience Focus / POV
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Male-centric vs female-centric vs ensemble — perspective distribution
          </p>
        </div>
        <ExportButton
          elementId="pov-breakdown-section"
          filename="pov-breakdown"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicPovBreakdown />
    </div>
  );
}

/**
 * Delay Tracker Section - Async Component
 * Commitment vs actual pace, delay per team and project
 */
export async function DelayTrackerSection() {
  return (
    <div id="delay-tracker-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Delay Tracker
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Writer commitment vs actual delivery pace — which projects are behind schedule
          </p>
        </div>
        <ExportButton
          elementId="delay-tracker-section"
          filename="delay-tracker"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicDelayTracker />
    </div>
  );
}

/**
 * Rating Trends Section - Async Component
 * Per-project sparklines: one-liner → episode scores trend
 */
export async function RatingTrendsSection() {
  return (
    <div id="rating-trends-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Rating Trends
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            One-liner to episode-by-episode score trends — track quality trajectory per project
          </p>
        </div>
        <ExportButton
          elementId="rating-trends-section"
          filename="rating-trends"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicRatingTrends />
    </div>
  );
}

export async function QualityQuantitySection() {
  return (
    <div id="quality-quantity-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Quality vs Quantity
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            4-quadrant view — which projects deliver both quality and volume
          </p>
        </div>
        <ExportButton
          elementId="quality-quantity-section"
          filename="quality-vs-quantity"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicQualityQuantityChart />
    </div>
  );
}

/**
 * Annual Target Visual Section
 * Progress rings + slot-wise bar charts showing target vs achieved per team
 */
export async function AnnualTargetSection() {
  return (
    <div id="annual-target-section" className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Annual Target vs Current Situation
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Slot-wise concept targets and which teams are behind or ahead
          </p>
        </div>
        <ExportButton
          elementId="annual-target-section"
          filename="annual-targets"
          formats={["png", "pdf"]}
          compact
        />
      </div>
      <DynamicAnnualTargetVisual />
    </div>
  );
}
