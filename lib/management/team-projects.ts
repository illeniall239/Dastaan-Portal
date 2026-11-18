import { createAdminClient } from "@/lib/supabase/admin";
import { formatTeamDisplayName, getTeamDisplayLabel } from "@/lib/management/team-display";
import { getProgrammingTeamMemberIds } from "@/lib/management/programming-team";

export interface TeamProjectEpisode {
  id: string;
  episode_number: number;
  title: string | null;
  approval_status: string | null;
  evalCompleted: number;
  evalTotal: number;
  evalStatus: "completed" | "in_progress" | "pending" | null;
}

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

export interface TeamProjectReport {
  id: string;
  call_report_id: string;
  working_title: string;
  meeting_date: string;
  evaluation_status: string | null;
  genre: string[] | null;
  category: string | null;
  target_slot: string | null;
  story_id: string | null;
  created_at: string;
  episodes: TeamProjectEpisode[];
  total_episodes: number | null;
  creator: { id: string; name: string } | null;
  scriptProgress: number | null;
  scriptStatus: "on_schedule" | "on_hold" | "behind_schedule" | null;
  scriptCurrentPhase: string | null;
  evaluatedEpisodes: number;
  ratings: TeamProjectRatings;
}

export interface TeamProjectGroup {
  team_id: string;
  team_name: string;
  team_type: string;
  call_reports: TeamProjectReport[];
  display_label: string;
}

export async function getTeamProjects(): Promise<TeamProjectGroup[]> {
  const admin = createAdminClient();

  const [{ data: allTeams, error: teamsError }, { data: reports, error: reportsError }, { data: episodicEvals }] =
    await Promise.all([
      admin.from("teams").select("id, name, team_type, team_head_id, team_head:users!teams_team_head_id_fkey(id, name, email)").order("name"),
      admin
        .from("call_reports")
        .select(
          `id, call_report_id, working_title, meeting_date, evaluation_status,
          genre, category, target_slot, story_id, created_at, team_id, total_episodes,
          creator:users!created_by(id, name),
          episodes(id, episode_number, title, approval_status),
          story:stories(
            id,
            contracts(
              id,
              script_phases(id, step_number, status, is_late)
            )
          )`
        )
        .is("archived_at", null)
        .eq("meeting_type", "call_report")
        .order("meeting_date", { ascending: false }),
      admin
        .from("episodic_evaluations")
        .select("id, episode_id"),
    ]);

  if (teamsError) {
    console.error("Error fetching teams:", teamsError);
    return [];
  }

  const ratingsByReport = await getRatings(admin, reports ?? [], allTeams ?? []);
  if (reportsError) {
    console.error("Error fetching team projects:", reportsError);
  }

  // Exclude management teams that aren't Humera's
  const teams = (allTeams ?? []).filter(
    (t) => t.team_type !== "management" || (t as any).team_head?.email === "humera.safder@geo.tv"
  );

  // Build eval counts per episode: { episode_id → count of completed evaluations }
  const evalsByEpisode: Record<string, number> = {};
  for (const ev of (episodicEvals || []) as any[]) {
    evalsByEpisode[ev.episode_id] = (evalsByEpisode[ev.episode_id] || 0) + 1;
  }

  // Build a map of team_id → call_reports
  const reportsByTeam: Record<string, TeamProjectReport[]> = {};
  for (const report of reports ?? []) {
    if (!report.team_id) continue;
    if (!reportsByTeam[report.team_id]) reportsByTeam[report.team_id] = [];

    // Compute script phase progress
    let scriptProgress: number | null = null;
    let scriptStatus: "on_schedule" | "on_hold" | "behind_schedule" | null = null;
    let scriptCurrentPhase: string | null = null;

    const story = (report as any).story;
    if (story?.contracts?.length > 0) {
      const allPhases = story.contracts.flatMap((c: any) => c.script_phases || []);
      if (allPhases.length > 0) {
        const totalSteps = 6;
        const completed = allPhases.filter(
          (p: any) => p.status === "completed" || p.status === "approved"
        ).length;
        scriptProgress = Math.round((completed / totalSteps) * 100);

        const hasDelays = allPhases.some((p: any) => p.is_late === true);
        if (hasDelays || completed === 0) {
          scriptStatus = "behind_schedule";
        } else if (completed >= 4) {
          scriptStatus = "on_schedule";
        } else {
          scriptStatus = "on_hold";
        }

        const inProgress = allPhases.find(
          (p: any) => p.status === "in_progress" || p.status === "submitted"
        );
        scriptCurrentPhase = inProgress
          ? `Step ${inProgress.step_number}/6`
          : completed === totalSteps
            ? "Completed"
            : `${completed}/6 done`;
      }
    }

    const episodes: TeamProjectEpisode[] = ((report.episodes as any[]) ?? [])
      .sort((a, b) => a.episode_number - b.episode_number)
      .map((ep) => {
        const completed = evalsByEpisode[ep.id] || 0;
        let evalStatus: TeamProjectEpisode["evalStatus"] = null;
        if (completed > 0) {
          evalStatus = "completed";
        }
        return {
          id: ep.id,
          episode_number: ep.episode_number,
          title: ep.title,
          approval_status: ep.approval_status,
          evalCompleted: completed,
          evalTotal: completed, // total assigned not tracked separately, use completed count
          evalStatus,
        };
      });

    const evaluatedEpisodes = episodes.filter((ep) => ep.evalCompleted > 0).length;

    reportsByTeam[report.team_id].push({
      id: report.id,
      call_report_id: report.call_report_id,
      working_title: report.working_title,
      meeting_date: report.meeting_date,
      evaluation_status: report.evaluation_status,
      genre: report.genre,
      category: report.category,
      target_slot: (report as any).target_slot ?? null,
      story_id: report.story_id,
      created_at: report.created_at,
      episodes,
      total_episodes: (report as any).total_episodes ?? null,
      creator: (report as any).creator ?? null,
      scriptProgress,
      scriptStatus,
      scriptCurrentPhase,
      evaluatedEpisodes,
      ratings: ratingsByReport.get(report.id) ?? NO_RATINGS,
    });
  }

  // Return filtered teams with friendly display names/labels
  return teams.map((team) => {
    const teamHead = (team as any).team_head;
    return {
      team_id: team.id,
      team_name: formatTeamDisplayName(team.name, teamHead?.name),
      team_type: team.team_type,
      call_reports: reportsByTeam[team.id] ?? [],
      display_label: getTeamDisplayLabel(teamHead?.email),
    };
  });
}

const NO_RATINGS: TeamProjectRatings = {
  contentHeads: [], programming: null, contentDev: null,
  episodes: { contentHead: null, programming: null, contentDev: null },
};

type Group = "contentHead" | "programming" | "contentDev" | null;

/**
 * Ratings per project, from the one-liner's and the episodes' evaluations, grouped like the management
 * drill-down (call-reports-with-evaluations): Content Development (Humera's team) and Programming Team
 * members by team, whatever their role; otherwise content heads (evaluator role). Management's own
 * ratings aren't part of this summary; feedback-only evaluations have no score and don't count.
 */
async function getRatings(
  admin: ReturnType<typeof createAdminClient>,
  reports: any[],
  allTeams: any[]
): Promise<Map<string, TeamProjectRatings>> {
  const result = new Map<string, TeamProjectRatings>();
  if (reports.length === 0) return result;

  // episode id -> its project and number
  const episodeInfo = new Map<string, { reportId: string; number: number }>();
  for (const r of reports) for (const ep of r.episodes ?? []) episodeInfo.set(ep.id, { reportId: r.id, number: ep.episode_number });

  const contentDevTeamIds = allTeams
    .filter((t) => t.team_type === "management" && t.team_head?.email === "humera.safder@geo.tv")
    .map((t) => t.id);
  const [{ data: crEvals }, { data: epEvals }, programmingIds, { data: contentDevUsers }] = await Promise.all([
    admin
      .from("call_report_evaluations_with_type")
      .select("call_report_id, evaluator_id, evaluator_name, evaluation_type, average_score, submitted_at, created_at")
      .in("call_report_id", reports.map((r) => r.id))
      .not("average_score", "is", null),
    // All scored episode evaluations (filtering by ~1000 episode ids would overflow the request URL)
    admin
      .from("episodic_evaluations_with_type")
      .select("episode_id, evaluator_id, evaluation_type, overall_average, submitted_at, created_at")
      .not("overall_average", "is", null),
    getProgrammingTeamMemberIds(admin),
    contentDevTeamIds.length
      ? admin.from("users").select("id").in("team_id", contentDevTeamIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const contentDevIds = new Set((contentDevUsers || []).map((u) => u.id));
  const groupOf = (e: any): Group =>
    contentDevIds.has(e.evaluator_id) ? "contentDev"
      : programmingIds.has(e.evaluator_id) || e.evaluation_type === "programmer" ? "programming"
        : e.evaluation_type === "evaluator" ? "contentHead"
          : null;

  // Each person's latest score per item
  const latestOf = (rows: any[], itemKey: string) => {
    const latest = new Map<string, any>();
    for (const e of rows) {
      const key = `${e[itemKey]}:${e.evaluator_id}`;
      const when = e.submitted_at || e.created_at;
      const prev = latest.get(key);
      if (!prev || when > (prev.submitted_at || prev.created_at)) latest.set(key, e);
    }
    return latest.values();
  };
  const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  const ratingsFor = (id: string) => {
    if (!result.has(id)) result.set(id, structuredClone(NO_RATINGS));
    return result.get(id)!;
  };

  // One-liner
  const oneLiner = new Map<string, { prog: number[]; dev: number[] }>();
  for (const e of latestOf(crEvals || [], "call_report_id")) {
    const group = groupOf(e);
    const score = Number(e.average_score);
    const r = ratingsFor(e.call_report_id);
    const g = oneLiner.get(e.call_report_id) ?? { prog: [], dev: [] };
    if (group === "contentHead") r.contentHeads.push({ name: e.evaluator_name || "Unknown", score });
    else if (group === "programming") g.prog.push(score);
    else if (group === "contentDev") g.dev.push(score);
    oneLiner.set(e.call_report_id, g);
  }
  for (const [id, g] of oneLiner) {
    const r = ratingsFor(id);
    r.programming = g.prog.length ? avg(g.prog) : null;
    r.contentDev = g.dev.length ? avg(g.dev) : null;
  }

  // Episodes: per project and group, the episodes rated and the average of those scores
  const episodes = new Map<string, { numbers: Set<number>; scores: number[] }>();
  for (const e of latestOf(epEvals || [], "episode_id")) {
    const info = episodeInfo.get(e.episode_id);
    const group = groupOf(e);
    if (!info || !group) continue;
    const key = `${info.reportId}:${group}`;
    const g = episodes.get(key) ?? { numbers: new Set<number>(), scores: [] };
    g.numbers.add(info.number);
    g.scores.push(Number(e.overall_average));
    episodes.set(key, g);
  }
  for (const [key, g] of episodes) {
    const [reportId, group] = key.split(":") as [string, Exclude<Group, null>];
    ratingsFor(reportId).episodes[group] = { episodes: [...g.numbers].sort((a, b) => a - b), average: avg(g.scores) };
  }
  return result;
}
