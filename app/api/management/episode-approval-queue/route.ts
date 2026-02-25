import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/episode-approval-queue
 * Returns episodes that have ≥1 submitted episodic evaluation,
 * split into pending (no approval_status) and reviewed (approval set).
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!currentUser || !["management", "admin", "executive"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Step 1: Get all submitted episodic evaluations (episode_id + score + timestamp)
    const { data: evalRows, error: evalErr } = await adminClient
      .from("episodic_evaluations_with_type")
      .select("episode_id, overall_average, created_at")
      .not("episode_id", "is", null);

    if (evalErr) throw new Error(`Failed to fetch episodic evaluations: ${evalErr.message}`);

    const evaluatedEpisodeIds = [
      ...new Set((evalRows || []).map((r) => r.episode_id as string)),
    ];

    if (evaluatedEpisodeIds.length === 0) {
      return NextResponse.json({ success: true, episodes: [], reviewedEpisodes: [] });
    }

    // Build per-episode stats
    const statsByEpisode: Record<string, { scores: number[]; latestAt: string }> = {};
    for (const row of evalRows || []) {
      const id = row.episode_id as string;
      if (!statsByEpisode[id]) statsByEpisode[id] = { scores: [], latestAt: row.created_at || "" };
      if (row.overall_average != null) statsByEpisode[id].scores.push(Number(row.overall_average));
      if (row.created_at && row.created_at > statsByEpisode[id].latestAt) {
        statsByEpisode[id].latestAt = row.created_at;
      }
    }

    // Step 2: Batch-fetch discussion counts
    const { data: discussionRows } = await adminClient
      .from("episode_discussions")
      .select("episode_id")
      .in("episode_id", evaluatedEpisodeIds);

    const discussionCountMap: Record<string, number> = {};
    for (const row of discussionRows || []) {
      const eid = row.episode_id as string;
      discussionCountMap[eid] = (discussionCountMap[eid] || 0) + 1;
    }

    // Step 3: Fetch episode details with parent call report title
    const { data: episodesData, error: epErr } = await adminClient
      .from("episodes")
      .select("id, episode_number, title, approval_status, approved_at, call_report_id")
      .in("id", evaluatedEpisodeIds)
      .order("episode_number", { ascending: true });

    if (epErr) throw new Error(`Failed to fetch episodes: ${epErr.message}`);

    // Step 4: Fetch parent call report titles
    const callReportIds = [
      ...new Set((episodesData || []).map((e: any) => e.call_report_id).filter(Boolean)),
    ] as string[];

    const callReportMap: Record<string, { workingTitle: string; displayId: string }> = {};
    if (callReportIds.length > 0) {
      const { data: crs } = await adminClient
        .from("call_reports")
        .select("id, working_title, call_report_id")
        .in("id", callReportIds);
      for (const cr of crs || []) {
        callReportMap[cr.id] = {
          workingTitle: cr.working_title || cr.call_report_id || "",
          displayId: cr.call_report_id || "",
        };
      }
    }

    // Step 5: Shape and split into pending / reviewed
    const allShaped = (episodesData || []).map((ep: any) => {
      const stats = statsByEpisode[ep.id];
      const scores = stats?.scores || [];
      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
          : null;
      const cr = callReportMap[ep.call_report_id] || { workingTitle: "", displayId: "" };
      return {
        id: ep.id,
        episodeNumber: ep.episode_number,
        title: ep.title || null,
        callReportTitle: cr.workingTitle,
        callReportDisplayId: cr.displayId,
        evaluationCount: scores.length,
        averageScore: avgScore,
        lastEvaluatedAt: stats?.latestAt || "",
        discussionCount: discussionCountMap[ep.id] || 0,
        approvalStatus: ep.approval_status || null,
        approvedAt: ep.approved_at || null,
      };
    });

    const episodes = allShaped.filter((e) => e.approvalStatus === null);
    const reviewedEpisodes = allShaped.filter((e) => e.approvalStatus !== null);

    return NextResponse.json({ success: true, episodes, reviewedEpisodes });
  } catch (error) {
    console.error("Error in episode-approval-queue GET:", error);
    return NextResponse.json({ error: "Failed to fetch episode approval queue" }, { status: 500 });
  }
}
