import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
// Icon names are passed as strings to client components (Calendar, FileText, Film)
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Suspense } from "react";
import { logger } from "@/lib/logger";
import type { ChartProject } from "@/components/evaluator/score-distribution-chart";
import { BsRowHero } from "@/components/content-department/bento-studio/bs-row-hero";
import { BsRowStats } from "@/components/content-department/bento-studio/bs-row-stats";
import { BsRowPipeline } from "@/components/content-department/bento-studio/bs-row-pipeline";
import { BsRowBottom } from "@/components/content-department/bento-studio/bs-row-bottom";

export const revalidate = 300;

export default async function ContentDepartmentDashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<DashboardContentSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  const hasGlobalAccess = currentUser?.role && ['admin', 'management'].includes(currentUser.role);

  let callReportsCount = 0;
  let episodesCount = 0;
  let upcomingMeetings: any[] = [];

  try {
    let callReportsQuery = supabase
      .from("call_reports")
      .select("id", { count: "exact", head: true })
      .eq("meeting_type", "call_report")
      .is("archived_at", null);

    let episodesQuery = supabase
      .from("episodes")
      .select("id", { count: "exact", head: true });

    let upcomingMeetingsQuery = supabase
      .from("meetings")
      .select("id, title, meeting_date, contact_name")
      .gte("meeting_date", new Date().toISOString())
      .order("meeting_date", { ascending: true })
      .limit(5);

    if (!hasGlobalAccess && currentUser?.team_id) {
      callReportsQuery = callReportsQuery.eq("team_id", currentUser.team_id);
      episodesQuery = episodesQuery.eq("team_id", currentUser.team_id);
      upcomingMeetingsQuery = upcomingMeetingsQuery.eq("team_id", currentUser.team_id);
    }

    const [callReportsRes, episodesRes, upcomingMeetingsRes] = await Promise.all([
      callReportsQuery,
      episodesQuery,
      upcomingMeetingsQuery
    ]);

    callReportsCount = callReportsRes.count || 0;
    episodesCount = episodesRes.count || 0;
    upcomingMeetings = upcomingMeetingsRes.data || [];
  } catch (error) {
    logger.error("❌ [Stats] Error fetching dashboard data:", error);
  }

  const adminClient = createAdminClient();
  let chartProjects: ChartProject[] = [];
  try {
    let crQuery = adminClient
      .from("call_reports")
      .select("id, working_title, writer_name, genre, content_type, target_slot")
      .eq("meeting_type", "call_report")
      .is("archived_at", null);

    if (!hasGlobalAccess && currentUser?.team_id) {
      crQuery = crQuery.eq("team_id", currentUser.team_id);
    }

    const { data: crs } = await crQuery;

    if (crs && crs.length > 0) {
      const ids = crs.map((r: any) => r.id);

      const { data: forms } = await adminClient
        .from("evaluator_forms")
        .select("call_report_id, slot")
        .in("call_report_id", ids)
        .not("submitted_at", "is", null)
        .not("slot", "is", null);

      const slotMap: Record<string, string> = {};
      for (const f of (forms || []) as any[]) {
        if (f.slot && !slotMap[f.call_report_id]) slotMap[f.call_report_id] = f.slot;
      }

      chartProjects = (crs as any[]).map((cr) => ({
        id: cr.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "—",
        genre: Array.isArray(cr.genre) ? cr.genre : [],
        contentType: cr.content_type || null,
        slot: slotMap[cr.id] || cr.target_slot || null,
      }));
    }
  } catch (error) {
    logger.error("❌ [Charts] Error fetching chart data:", error);
  }

  type ComparisonProject = {
    id: string;
    title: string;
    initialAssessment: number | null;
    evaluationScore: number | null;
    type: "oneliner" | "episodic";
    episodeNumber?: number;
  };
  let comparisonData: ComparisonProject[] = [];
  try {
    if (chartProjects.length > 0) {
      const crIds = chartProjects.map((p) => p.id);

      const { data: crWithRating } = await adminClient
        .from("call_reports")
        .select("id, working_title, overall_rating")
        .in("id", crIds);

      const crInitialMap = new Map<string, number>();
      const crTitleMap = new Map<string, string>();
      for (const cr of (crWithRating || []) as any[]) {
        crTitleMap.set(cr.id, cr.working_title || "Untitled");
        if (cr.overall_rating != null) crInitialMap.set(cr.id, cr.overall_rating);
      }

      const { data: evalForms } = await adminClient
        .from("evaluator_forms")
        .select("call_report_id, average_score")
        .in("call_report_id", crIds)
        .not("submitted_at", "is", null)
        .not("average_score", "is", null);

      const evalAvgMap = new Map<string, number[]>();
      for (const f of (evalForms || []) as any[]) {
        if (!evalAvgMap.has(f.call_report_id)) evalAvgMap.set(f.call_report_id, []);
        evalAvgMap.get(f.call_report_id)!.push(f.average_score);
      }

      for (const crId of crIds) {
        const initScore = crInitialMap.get(crId) ?? null;
        const evalScores = evalAvgMap.get(crId);
        const evalAvg = evalScores && evalScores.length > 0
          ? Number((evalScores.reduce((a: number, b: number) => a + b, 0) / evalScores.length).toFixed(1))
          : null;
        comparisonData.push({
          id: crId,
          title: crTitleMap.get(crId) || "Untitled",
          initialAssessment: initScore,
          evaluationScore: evalAvg,
          type: "oneliner",
        });
      }

      const { data: episodes } = await adminClient
        .from("episodes")
        .select("id, call_report_id, episode_number, initial_assessment")
        .in("call_report_id", crIds)
        .eq("is_current", true)
        .order("episode_number", { ascending: true });

      if (episodes && episodes.length > 0) {
        const epIds = episodes.map((e: any) => e.id);

        const { data: epRevisions } = await adminClient
          .from("episode_revisions")
          .select("episode_id, initial_assessment")
          .in("episode_id", epIds)
          .not("initial_assessment", "is", null);

        const epRevMap = new Map<string, number>();
        for (const r of (epRevisions || []) as any[]) {
          epRevMap.set(r.episode_id, r.initial_assessment);
        }

        const { data: epEvals } = await adminClient
          .from("episodic_evaluations")
          .select("episode_id, overall_average")
          .in("episode_id", epIds)
          .not("submitted_at", "is", null)
          .not("overall_average", "is", null);

        const epEvalAvgMap = new Map<string, number[]>();
        for (const e of (epEvals || []) as any[]) {
          if (!epEvalAvgMap.has(e.episode_id)) epEvalAvgMap.set(e.episode_id, []);
          epEvalAvgMap.get(e.episode_id)!.push(e.overall_average);
        }

        for (const ep of episodes as any[]) {
          const initScore = epRevMap.get(ep.id) ?? ep.initial_assessment ?? null;
          const evalScores = epEvalAvgMap.get(ep.id);
          const evalAvg = evalScores && evalScores.length > 0
            ? Number((evalScores.reduce((a: number, b: number) => a + b, 0) / evalScores.length).toFixed(1))
            : null;
          comparisonData.push({
            id: ep.id,
            title: crTitleMap.get(ep.call_report_id) || "Untitled",
            initialAssessment: initScore,
            evaluationScore: evalAvg,
            type: "episodic",
            episodeNumber: ep.episode_number,
          });
        }
      }
    }
  } catch (error) {
    logger.error("❌ [Comparison] Error fetching comparison data:", error);
  }

  const quickActions = [
    {
      iconName: "calendar" as const,
      label: "Schedule Meeting",
      description: "Book meetings on calendar",
      href: "/content-department/calendar",
    },
    {
      iconName: "fileText" as const,
      label: "Log One-Liner",
      description: "Document writer meetings",
      href: "/content-department/log-call-report",
    },
    {
      iconName: "fileText" as const,
      label: "View Reports",
      description: "All engagement reports",
      href: "/content-department/call-reports",
    },
    {
      iconName: "film" as const,
      label: "View Episodes",
      description: "Manage episodes",
      href: "/content-department/episodes",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Row A: Hero + Coverage */}
      <BsRowHero
        callReportsCount={callReportsCount}
        episodesCount={episodesCount}
        chartProjects={chartProjects}
      />

      {/* Row B: 4 Stat Cards */}
      <BsRowStats
        callReportsCount={callReportsCount}
        episodesCount={episodesCount}
        pipelineCount={chartProjects.length}
        meetingsCount={upcomingMeetings.length}
      />

      {/* Row C: Pipeline + Genre */}
      <BsRowPipeline
        comparisonData={comparisonData}
        chartProjects={chartProjects}
      />

      {/* Row D: One-Liners + Deliveries + Quick Actions */}
      <BsRowBottom
        quickActions={quickActions}
        upcomingMeetings={upcomingMeetings}
      />
    </div>
  );
}

function DashboardContentSkeleton() {
  return (
    <div className="space-y-4">
      {/* Row A Skeleton: Hero + Coverage */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 rounded-[28px] bg-gradient-to-br from-[#5B4BFF]/20 to-[#FF6B4A]/20 h-[300px] animate-pulse" />
        <div className="w-full md:w-[400px] rounded-[28px] bg-white h-[300px] animate-pulse" />
      </div>

      {/* Row B Skeleton: 4 Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[24px] bg-white p-[22px] h-[158px] animate-pulse">
            <div className="h-3 w-20 bg-gray-100 rounded mb-auto" />
            <div className="h-10 w-14 bg-gray-100 rounded mt-12" />
          </div>
        ))}
      </div>

      {/* Row C Skeleton: Pipeline + Genre */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 rounded-[28px] bg-white h-[320px] animate-pulse" />
        <div className="w-full md:w-[400px] rounded-[28px] bg-white h-[320px] animate-pulse" />
      </div>

      {/* Row D Skeleton: 3 tiles */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 rounded-[28px] bg-white h-[372px] animate-pulse" />
        <div className="w-full md:w-[340px] rounded-[28px] bg-[#17171F]/10 h-[372px] animate-pulse" />
        <div className="w-full md:w-[230px] rounded-[28px] bg-white h-[372px] animate-pulse" />
      </div>
    </div>
  );
}
