import type { SupabaseClient } from "@supabase/supabase-js";
import { getProgrammingTeamMemberIds } from "@/lib/management/programming-team";

export interface ScopedEvaluation {
  id: string;
  episode_id: string;
  revision_id: string | null;
  evaluator_id: string;
  overall_average: number | null;
  overall_grade: string | null;
  decision: string | null;
  evaluator: { name?: string; role?: string } | null;
}

/**
 * The episodic evaluations (originals and revisions, not cross-team requests) that count as
 * "done" for this viewer:
 * - management-type team members (Content Development): their own team's
 * - programmers: the Programming Team's (head included), not Content Development's
 * - everyone else: their own
 * Used by the Original/Rev rows and by "next episode", so both always agree.
 */
export async function getScopedEpisodicEvaluations(
  supabase: SupabaseClient<any, any, any>,
  adminClient: SupabaseClient<any, any, any>,
  userId: string,
  userData: { role: string; team_id: string | null },
  episodeIds: string[]
): Promise<{ evaluations: ScopedEvaluation[]; error: unknown }> {
  if (episodeIds.length === 0) return { evaluations: [], error: null };

  let isManagementTeam = false;
  let teamMemberIds: string[] = [];
  let contentDevUserIds: string[] = [];

  if (["programmer", "management"].includes(userData.role) && userData.team_id) {
    const { data: team } = await adminClient
      .from("teams")
      .select("team_type")
      .eq("id", userData.team_id)
      .single();

    if (team?.team_type === "management") {
      isManagementTeam = true;
      const { data: members } = await adminClient
        .from("users")
        .select("id")
        .eq("team_id", userData.team_id);
      teamMemberIds = (members || []).map((m: any) => m.id);
    }
  }

  if (!isManagementTeam && userData.role === "programmer") {
    const { data: mgmtTeams } = await adminClient.from("teams").select("id").eq("team_type", "management");
    if (mgmtTeams && mgmtTeams.length > 0) {
      const { data: cdUsers } = await adminClient.from("users").select("id").in("team_id", mgmtTeams.map((t: any) => t.id));
      contentDevUserIds = (cdUsers || []).map((u: any) => u.id);
    }
  }

  let query = supabase
    .from("episodic_evaluations")
    .select("id, episode_id, revision_id, evaluator_id, overall_average, overall_grade, decision, evaluator:users!evaluator_id(name, role)")
    .in("episode_id", episodeIds)
    .is("cross_team_share_id", null);

  if (isManagementTeam) {
    query = query.in("evaluator_id", teamMemberIds);
  } else if (userData.role === "programmer") {
    if (contentDevUserIds.length > 0) {
      query = query.not("evaluator_id", "in", `(${contentDevUserIds.join(",")})`);
    }
  } else {
    query = query.eq("evaluator_id", userId);
  }

  const { data, error } = await query;
  if (error) return { evaluations: [], error };

  // Programming Team: anyone on the team (head included) evaluates for the team, like Content Development
  const programmingIds = userData.role === "programmer" && !isManagementTeam
    ? await getProgrammingTeamMemberIds(adminClient)
    : new Set<string>();

  const evaluations = ((data || []) as any[]).filter((ev) => {
    // For programmers, count the programming team's evaluations only (not content dev's)
    if (userData.role === "programmer" && !isManagementTeam) {
      return programmingIds.has(ev.evaluator_id)
        || (ev.evaluator?.role === "programmer" && !contentDevUserIds.includes(ev.evaluator_id));
    }
    return true;
  }) as ScopedEvaluation[];

  return { evaluations, error: null };
}
