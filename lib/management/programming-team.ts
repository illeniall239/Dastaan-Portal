import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * IDs of everyone on a programmer-type team, including its head (team heads are always members).
 * Their evaluations are grouped as Programming, the same way members of the Content Development
 * team are grouped as Content Development, whatever their role.
 */
export async function getProgrammingTeamMemberIds(admin: SupabaseClient<any, any, any>): Promise<Set<string>> {
  const { data: teams } = await admin.from("teams").select("id").eq("team_type", "programmer");
  const teamIds = (teams || []).map((t: any) => t.id);
  if (teamIds.length === 0) return new Set();
  const { data: users } = await admin.from("users").select("id").in("team_id", teamIds);
  return new Set((users || []).map((u: any) => u.id));
}
