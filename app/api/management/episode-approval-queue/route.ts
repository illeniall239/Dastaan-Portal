import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectRatings } from "@/lib/management/project-ratings-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/episode-approval-queue
 * Every current episode of an active one-liner, split into pending (no approval_status) and
 * reviewed (approval set). Management evaluates everything, whether or not anyone else has
 * evaluated it yet; evaluation counts/scores are shown where there are some.
 */

/** All rows of a query, page by page (the API returns at most 1000 rows per request) */
async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}
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

    // Step 1: every current episode of an active one-liner, and the evaluations so far (if any).
    // Related tables are read whole and matched in memory: ~1000 episode ids won't fit in a request URL.
    const [episodesData, evalRows, discussionRows, epRevisionRows] = await Promise.all([
      allRows<any>((from, to) => adminClient
        .from("episodes")
        .select("id, episode_number, title, approval_status, approved_at, call_report_id, attachment_name, original_submission_date, created_at, call_report:call_reports!inner(archived_at)")
        .eq("is_current", true)
        .is("archived_at", null)
        .is("call_report.archived_at", null)
        .order("episode_number", { ascending: true })
        .range(from, to)),
      allRows<any>((from, to) => adminClient
        .from("episodic_evaluations_with_type")
        .select("episode_id, evaluator_id, overall_average, created_at")
        .not("episode_id", "is", null)
        .range(from, to)),
      allRows<any>((from, to) => adminClient.from("episode_discussions").select("episode_id").range(from, to)),
      allRows<any>((from, to) => adminClient.from("episode_revisions").select("episode_id").range(from, to)),
    ]);

    if (episodesData.length === 0) {
      return NextResponse.json({ success: true, episodes: [], reviewedEpisodes: [] });
    }

    // This manager's own evaluation per episode (their latest, original or a revision)
    const myScore = new Map<string, { score: number | null; at: string }>();
    for (const row of evalRows) {
      if (row.evaluator_id !== user.id) continue;
      const at = row.created_at || "";
      const prev = myScore.get(row.episode_id);
      if (!prev || at > prev.at) myScore.set(row.episode_id, { score: row.overall_average != null ? Number(row.overall_average) : null, at });
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

    // Step 2: discussion counts
    const discussionCountMap: Record<string, number> = {};
    for (const row of discussionRows || []) {
      const eid = row.episode_id as string;
      discussionCountMap[eid] = (discussionCountMap[eid] || 0) + 1;
    }

    // Step 3: revision counts
    const revisionCountMap: Record<string, number> = {};
    for (const row of epRevisionRows || []) {
      const eid = row.episode_id as string;
      revisionCountMap[eid] = (revisionCountMap[eid] || 0) + 1;
    }

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
    const { episodeOverall } = await getProjectRatings();
    const allShaped = (episodesData || []).map((ep: any) => {
      const stats = statsByEpisode[ep.id];
      const scores = stats?.scores || [];
      const cr = callReportMap[ep.call_report_id] || { workingTitle: "", displayId: "" };
      return {
        id: ep.id,
        episodeNumber: ep.episode_number,
        title: ep.title || null,
        callReportId: ep.call_report_id || null,
        callReportTitle: cr.workingTitle,
        callReportDisplayId: cr.displayId,
        evaluationCount: scores.length,
        averageScore: episodeOverall.get(ep.id) ?? null, // the episode's rating (Team Overview rule)
        lastEvaluatedAt: stats?.latestAt || "",
        discussionCount: discussionCountMap[ep.id] || 0,
        approvalStatus: ep.approval_status || null,
        approvedAt: ep.approved_at || null,
        attachmentName: ep.attachment_name || null,
        originalSubmissionDate: ep.original_submission_date || ep.created_at || null,
        revisionCount: revisionCountMap[ep.id] || 0,
        evaluatedByMe: myScore.has(ep.id),
        myScore: myScore.get(ep.id)?.score ?? null,
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
