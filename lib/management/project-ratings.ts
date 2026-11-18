// Project ratings (shared by the server data and the browser tables; no server dependencies)

/** A group's episode ratings: which episodes it rated, and its average across them */
export interface EpisodeGroupRating {
  episodes: number[]; // episode numbers, ascending
  average: number;
}

/**
 * A project's ratings, by who gave them (each person's latest score per item, so a re-rated revision
 * counts). Grouped the same way as the drill-down badges. null = not evaluated by that group.
 */
export interface TeamProjectRatings {
  contentHeads: { name: string; score: number }[]; // one-liner
  programming: number | null; // one-liner, Salman's Team (average)
  contentDev: number | null;  // one-liner, Humera's Team (average)
  episodes: {
    contentHead: EpisodeGroupRating | null;
    programming: EpisodeGroupRating | null;
    contentDev: EpisodeGroupRating | null;
  };
}

/** Overall rating: the average of the teams that rated (each team counts once; several content heads
 *  count as one Content Head rating). teams = how many of the 3 rated. */
export interface OverallRating { score: number; teams: number }

export function overallRatings(r: TeamProjectRatings): { oneLiner: OverallRating | null; episodes: OverallRating | null } {
  const overall = (xs: (number | null)[]): OverallRating | null => {
    const got = xs.filter((x): x is number => x != null);
    return got.length ? { score: Math.round((got.reduce((a, b) => a + b, 0) / got.length) * 10) / 10, teams: got.length } : null;
  };
  const heads = r.contentHeads.length ? r.contentHeads.reduce((a, h) => a + h.score, 0) / r.contentHeads.length : null;
  return {
    oneLiner: overall([heads, r.programming, r.contentDev]),
    episodes: overall([r.episodes.contentHead?.average ?? null, r.episodes.programming?.average ?? null, r.episodes.contentDev?.average ?? null]),
  };
}
