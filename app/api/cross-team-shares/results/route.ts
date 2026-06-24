import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's team
    const { data: currentUser } = await supabase
      .from("users")
      .select("id, role, team_id")
      .eq("id", user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const adminClient = createAdminClient();

    // Fetch all shares sent by this user's team
    let sharesQuery = adminClient
      .from("cross_team_shares")
      .select(`
        *,
        call_report:call_reports (id, call_report_id, working_title, logline),
        from_team:teams!cross_team_shares_from_team_id_fkey (id, name),
        to_team:teams!cross_team_shares_to_team_id_fkey (id, name),
        shared_episodes:cross_team_share_episodes (
          id,
          episode_id,
          episode:episodes (id, episode_number, title)
        )
      `)
      .order("shared_at", { ascending: false });

    // Non-admin/management users can only see shares from their own team
    const isManagement = ["management", "admin"].includes(currentUser.role);
    if (!isManagement && currentUser.team_id) {
      sharesQuery = sharesQuery.eq("from_team_id", currentUser.team_id);
    } else if (!isManagement) {
      return NextResponse.json([]);
    }

    const { data: shares, error: sharesError } = await sharesQuery;

    if (sharesError || !shares || shares.length === 0) {
      if (sharesError) console.error("[cross-team-shares/results] Error fetching shares:", sharesError);
      return NextResponse.json([]);
    }

    const shareIds = shares.map(s => s.id);

    // Bulk fetch evaluator_forms for all shares
    const { data: allEvals } = await adminClient
      .from("evaluator_forms")
      .select("cross_team_share_id, average_score, decision, comments, submitted_at")
      .in("cross_team_share_id", shareIds);

    // Bulk fetch episodic_evaluations for all shares
    // Apply team isolation for management-type teams
    let episodicEvalsQuery = adminClient
      .from("episodic_evaluations")
      .select("cross_team_share_id, episode_id, average_score, decision, comments, submitted_at")
      .in("cross_team_share_id", shareIds);

    if (["programmer", "management"].includes(currentUser.role) && currentUser.team_id) {
      const { data: team } = await adminClient
        .from("teams")
        .select("team_type")
        .eq("id", currentUser.team_id)
        .single();
      if (team?.team_type === "management") {
        const { data: members } = await adminClient
          .from("users")
          .select("id")
          .eq("team_id", currentUser.team_id);
        const memberIds = (members || []).map((m: any) => m.id);
        episodicEvalsQuery = episodicEvalsQuery.in("evaluator_id", memberIds);
      }
    }

    const { data: allEpisodicEvals } = await episodicEvalsQuery;

    // Group by share ID
    const evalsByShare = new Map<string, any[]>();
    const episodicByShare = new Map<string, any[]>();

    for (const e of allEvals || []) {
      const list = evalsByShare.get(e.cross_team_share_id) || [];
      list.push(e);
      evalsByShare.set(e.cross_team_share_id, list);
    }
    for (const e of allEpisodicEvals || []) {
      const list = episodicByShare.get(e.cross_team_share_id) || [];
      list.push(e);
      episodicByShare.set(e.cross_team_share_id, list);
    }

    // Compute aggregated results per share
    const enriched = shares.map(share => {
      const evals = evalsByShare.get(share.id) || [];
      const episodic = episodicByShare.get(share.id) || [];

      // Aggregate call report evaluations
      const scores = evals.map(e => e.average_score).filter((s): s is number => s != null);
      const avgScore = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;

      const decisionCounts = { approve: 0, reject: 0, needs_improvement: 0 } as Record<string, number>;
      evals.forEach(e => { if (e.decision) decisionCounts[e.decision] = (decisionCounts[e.decision] || 0) + 1; });

      // Overall decision = majority vote
      let overallDecision: string | null = null;
      if (evals.length > 0) {
        const top = Object.entries(decisionCounts).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] > 0) overallDecision = top[0];
      }

      const comments = evals
        .filter(e => e.comments && e.comments.trim())
        .map(e => ({ text: e.comments as string, submittedAt: e.submitted_at as string }));

      // Aggregate episodic evaluations grouped by episode
      const episodicByEpisode = new Map<string, any[]>();
      for (const e of episodic) {
        const list = episodicByEpisode.get(e.episode_id) || [];
        list.push(e);
        episodicByEpisode.set(e.episode_id, list);
      }

      // Find episode info from shared_episodes
      const sharedEpisodes = (share.shared_episodes || []) as any[];

      const episodicResults = sharedEpisodes.map((se: any) => {
        const epEvals = episodicByEpisode.get(se.episode_id) || [];
        const epScores = epEvals.map((e: any) => e.average_score).filter((s: any): s is number => s != null);
        const epAvgScore = epScores.length > 0
          ? Math.round((epScores.reduce((a: number, b: number) => a + b, 0) / epScores.length) * 10) / 10
          : null;

        const epDecisionCounts = { approve: 0, reject: 0, needs_improvement: 0 } as Record<string, number>;
        epEvals.forEach((e: any) => { if (e.decision) epDecisionCounts[e.decision] = (epDecisionCounts[e.decision] || 0) + 1; });

        let epOverallDecision: string | null = null;
        if (epEvals.length > 0) {
          const top = Object.entries(epDecisionCounts).sort((a, b) => b[1] - a[1])[0];
          if (top && top[1] > 0) epOverallDecision = top[0];
        }

        const epComments = epEvals
          .filter((e: any) => e.comments && e.comments.trim())
          .map((e: any) => ({ text: e.comments as string, submittedAt: e.submitted_at as string }));

        return {
          episodeId: se.episode_id,
          episodeNumber: se.episode?.episode_number,
          episodeTitle: se.episode?.title,
          avgScore: epAvgScore,
          overallDecision: epOverallDecision,
          decisionCounts: epDecisionCounts,
          comments: epComments,
          evaluationCount: epEvals.length,
        };
      });

      return {
        ...share,
        avgScore,
        decisionCounts,
        overallDecision,
        comments,
        episodicResults,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("[cross-team-shares/results] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
