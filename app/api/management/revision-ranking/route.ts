import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const [{ data: revisions }, { data: episodes }, { data: callReports }, { data: teams }] = await Promise.all([
      admin.from("episode_revisions").select("id, episode_id, revision_number"),
      admin
        .from("episodes")
        .select("id, call_report_id, episode_number")
        .eq("is_current", true),
      admin
        .from("call_reports")
        .select("id, working_title, writer_name, team_id")
        .is("archived_at", null)
        .eq("meeting_type", "call_report"),
      admin
        .from("teams")
        .select("id, name, team_head:users!teams_team_head_id_fkey(name)")
        .in("team_type", ["content", "gcm"]),
    ]);

    // Build maps
    const epToCr = new Map<string, string>();
    const epCountByCr = new Map<string, number>();
    for (const ep of episodes || []) {
      if (ep.call_report_id) {
        epToCr.set(ep.id, ep.call_report_id);
        epCountByCr.set(ep.call_report_id, (epCountByCr.get(ep.call_report_id) || 0) + 1);
      }
    }

    const crMap = new Map((callReports || []).map((cr) => [cr.id, cr]));

    // Count revisions per episode, then aggregate per CR and per team
    const epRevCount = new Map<string, number>();
    for (const rev of revisions || []) {
      epRevCount.set(rev.episode_id, Math.max(epRevCount.get(rev.episode_id) || 0, rev.revision_number));
    }

    // Per CR: sum of max revision numbers, episode count
    const crRevData = new Map<string, { totalRevisions: number; episodeCount: number; maxRevision: number }>();
    for (const [epId, maxRev] of epRevCount) {
      const crId = epToCr.get(epId);
      if (!crId || !crMap.has(crId)) continue;
      const existing = crRevData.get(crId) || { totalRevisions: 0, episodeCount: 0, maxRevision: 0 };
      existing.totalRevisions += maxRev;
      existing.episodeCount += 1;
      existing.maxRevision = Math.max(existing.maxRevision, maxRev);
      crRevData.set(crId, existing);
    }

    // Per team aggregation
    const teamData = new Map<string, {
      teamId: string;
      teamName: string;
      totalRevisions: number;
      totalEpisodes: number;
      projects: {
        id: string;
        title: string;
        writer: string;
        episodeCount: number;
        avgRevisions: number;
        maxRevision: number;
      }[];
    }>();

    // Initialize teams
    for (const t of teams || []) {
      const head: any = t.team_head ? (Array.isArray(t.team_head) ? t.team_head[0] : t.team_head) : null;
      const displayName = head?.name ? `${head.name}'s Team` : t.name;
      teamData.set(t.id, {
        teamId: t.id,
        teamName: displayName,
        totalRevisions: 0,
        totalEpisodes: 0,
        projects: [],
      });
    }

    // Fill in project data
    for (const [crId, revData] of crRevData) {
      const cr = crMap.get(crId);
      if (!cr || !cr.team_id) continue;
      const team = teamData.get(cr.team_id);
      if (!team) continue;

      team.totalRevisions += revData.totalRevisions;
      team.totalEpisodes += revData.episodeCount;
      team.projects.push({
        id: crId,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "Unknown",
        episodeCount: revData.episodeCount,
        avgRevisions: Math.round((revData.totalRevisions / revData.episodeCount) * 100) / 100,
        maxRevision: revData.maxRevision,
      });
    }

    // Build result sorted by avg revisions ascending (fewest = best)
    const result = Array.from(teamData.values())
      .filter((t) => t.totalEpisodes > 0)
      .map((t) => ({
        ...t,
        avgRevisions: Math.round((t.totalRevisions / t.totalEpisodes) * 100) / 100,
        projects: t.projects.sort((a, b) => a.avgRevisions - b.avgRevisions),
      }))
      .sort((a, b) => a.avgRevisions - b.avgRevisions);

    return NextResponse.json({ success: true, teams: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
