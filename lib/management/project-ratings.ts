// Project ratings (shared by the server data and the browser tables; no server dependencies)

/** A group's episode ratings: which episodes it rated, and its average across them */
export interface EpisodeGroupRating {
  episodes: number[]; // episode numbers, ascending
  average: number;
  assessmentOnly: boolean; // only the content team's initial assessments, no evaluation
}

/**
 * A project's ratings, by who gave them (each person's latest score per item, so a re-rated revision
 * counts). Grouped the same way as the drill-down badges. null = not evaluated by that group.
 */
export interface TeamProjectRatings {
  contentHead: number | null; // one-liner: content dept's initial assessment and content heads' evaluation, averaged
  contentHeadAssessmentOnly: boolean; // contentHead is the content team's initial assessment alone
  programming: number | null; // one-liner, Salman's Team (average)
  contentDev: number | null;  // one-liner, Humera's Team (average)
  episodes: {
    contentHead: EpisodeGroupRating | null;
    programming: EpisodeGroupRating | null;
    contentDev: EpisodeGroupRating | null;
  };
}

/** Overall rating: the average of the teams that rated (each team counts once). teams = how many of the 3 rated.
 *  assessmentOnly = nobody has evaluated it; the score is the content team's own initial assessment. */
export interface OverallRating { score: number; teams: number; assessmentOnly: boolean }

export function overallRatings(r: TeamProjectRatings): { oneLiner: OverallRating | null; episodes: OverallRating | null } {
  const overall = (xs: (number | null)[], headAssessmentOnly: boolean): OverallRating | null => {
    const got = xs.filter((x): x is number => x != null);
    return got.length
      ? { score: Math.round((got.reduce((a, b) => a + b, 0) / got.length) * 10) / 10, teams: got.length, assessmentOnly: got.length === 1 && xs[0] != null && headAssessmentOnly }
      : null;
  };
  const eps = r.episodes;
  return {
    oneLiner: overall([r.contentHead, r.programming, r.contentDev], r.contentHeadAssessmentOnly),
    episodes: overall([eps.contentHead?.average ?? null, eps.programming?.average ?? null, eps.contentDev?.average ?? null], !!eps.contentHead?.assessmentOnly),
  };
}
