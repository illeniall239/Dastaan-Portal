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
    ["content_creator", "content_manager", "programmer", "gcm", "admin", "management"].includes(userRole)
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
