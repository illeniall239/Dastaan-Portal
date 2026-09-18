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
  return cleanEmailTeamName(rawTeamName) || "Unnamed Team";
}

const TEAM_LABELS: Record<string, string> = {
  "humera.safder@geo.tv": "(Content Development)",
  "salman.ahmed@geo.tv": "(Programming)",
};

/**
 * Cleans up email-based team names (e.g. "angabeen.shah@geo.tv Team")
 * into human-readable form ("Angabeen Shah's Team").
 * Works without needing the team head's name from a join.
 */
export function cleanEmailTeamName(name: string): string {
  const match = name.match(/^([^@]+)@[^\s]+(?:'s)?\s*Team$/i);
  if (!match) return name;
  return match[1]
    .split('.')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ') + "'s Team";
}

/**
 * Returns a parenthetical role label for known team heads, or empty string.
 */
export function getTeamDisplayLabel(teamHeadEmail?: string | null): string {
  if (!teamHeadEmail) return "";
  return TEAM_LABELS[teamHeadEmail] ?? "";
}
