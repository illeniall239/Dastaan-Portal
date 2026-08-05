/**
 * Constructs a proper team display name from the team head's name.
 * Avoids showing raw email-based names like "aamra.shahid@geo.tv's Team".
 */
export function formatTeamDisplayName(
  rawTeamName: string,
  teamHeadName?: string | null
): string {
  if (teamHeadName) {
    return `${teamHeadName}'s Team`;
  }
  return rawTeamName || "Unnamed Team";
}

const TEAM_LABELS: Record<string, string> = {
  "humera.safder@geo.tv": "(Content Development)",
  "salman.ahmed@geo.tv": "(Programming)",
};

/**
 * Returns a parenthetical role label for known team heads, or empty string.
 */
export function getTeamDisplayLabel(teamHeadEmail?: string | null): string {
  if (!teamHeadEmail) return "";
  return TEAM_LABELS[teamHeadEmail] ?? "";
}
