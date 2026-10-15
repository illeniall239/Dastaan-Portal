/**
 * Centralized episode permission checks.
 *
 * Single source of truth used by all 4 portals and the API layer.
 * Every inline `canEditEpisode()` / `hasEditPermission` should import from here.
 */

interface EpisodePermissionContext {
  logged_by?: string | null;
  call_report?: { team_id?: string | null } | null;
}

/**
 * Can the user edit this episode (metadata, file replacement)?
 *
 * Rules (in order):
 *  1. The user who logged the episode can always edit it.
 *  2. Privileged roles (content_creator, content_manager, programmer, gcm, admin, management) can edit any episode.
 *  3. Any user on the same team as the episode's call report can edit it.
 */
export function canEditEpisode(
  userId: string,
  userRole: string,
  episode: EpisodePermissionContext,
  userTeamId?: string | null,
): boolean {
  // Owner
  if (episode.logged_by === userId) return true;

  // Privileged roles
  if (
    ["content_creator", "content_manager", "programmer", "gcm", "evaluator", "admin", "management"].includes(userRole)
  )
    return true;

  // Same-team access
  const episodeTeamId = episode.call_report?.team_id;
  if (episodeTeamId && userTeamId && episodeTeamId === userTeamId) return true;

  return false;
}

/**
 * Can the user upload a revision for this episode?
 *
 * Currently identical to edit permission — if you can edit, you can revise.
 */
export function canUploadRevision(
  userId: string,
  userRole: string,
  episode: EpisodePermissionContext,
  userTeamId?: string | null,
): boolean {
  return canEditEpisode(userId, userRole, episode, userTeamId);
}

const MUST_EVALUATE_ROLES = ["evaluator", "programmer", "management", "executive"];

export function mustEvaluateOnUpload(role: string): boolean {
  return MUST_EVALUATE_ROLES.includes(role);
}

/**
 * Server-side: check if user has episodes they logged but haven't evaluated.
 * Returns the un-evaluated episode numbers (empty array = all clear).
 */
export async function getUnevaluatedEpisodes(
  adminClient: any,
  userId: string,
): Promise<{ episode_number: number; working_title: string }[]> {
  const { data: episodes } = await adminClient
    .from("episodes")
    .select("id, episode_number, call_report:call_reports!call_report_id(working_title)")
    .eq("logged_by", userId)
    .eq("is_current", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!episodes || episodes.length === 0) return [];

  const episodeIds = episodes.map((e: any) => e.id);

  const { data: evaluations } = await adminClient
    .from("episodic_evaluations")
    .select("episode_id")
    .eq("evaluator_id", userId)
    .in("episode_id", episodeIds);

  const evaluatedSet = new Set((evaluations || []).map((e: any) => e.episode_id));

  return episodes
    .filter((ep: any) => !evaluatedSet.has(ep.id))
    .map((ep: any) => ({
      episode_number: ep.episode_number,
      working_title: Array.isArray(ep.call_report)
        ? ep.call_report[0]?.working_title || "Unknown"
        : ep.call_report?.working_title || "Unknown",
    }));
}
