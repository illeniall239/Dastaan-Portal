import { createAdminClient } from "@/lib/supabase/admin";
import { formatTeamDisplayName, getTeamDisplayLabel } from "@/lib/management/team-display";
import { getProgrammingTeamMemberIds } from "@/lib/management/programming-team";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { TeamProjectRatings } from "@/lib/management/project-ratings";

export type { TeamProjectRatings, EpisodeGroupRating } from "@/lib/management/project-ratings";

export interface TeamProjectEpisode {
  id: string;
  episode_number: number;
  title: string | null;
  approval_status: string | null;
  evalCompleted: number;
  evalTotal: number;
  evalStatus: "completed" | "in_progress" | "pending" | null;
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
  content_type: string | null;
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
          genre, category, target_slot, content_type, story_id, created_at, team_id, total_episodes, overall_rating,
          creator:users!created_by(id, name),
          episodes(id, episode_number, title, approval_status, initial_assessment, logged_by),
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
      content_type: (report as any).content_type ?? null,
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
  contentHead: null, contentHeadAssessmentOnly: false, programming: null, contentDev: null,
  episodes: { contentHead: null, programming: null, contentDev: null },
};

type Group = "contentHead" | "programming" | "contentDev" | null;

/**
 * Ratings per project, from the one-liner's and the episodes' evaluations, grouped like the management
 * drill-down (call-reports-with-evaluations): Content Development (Humera's team) and Programming Team
 * members by team, whatever their role; otherwise content heads (evaluator role). Management's own
 * ratings aren't part of this summary; feedback-only evaluations have no score and don't count.
 *
 * Content Head = per version (original, revision 1, 2, ...), the average of what exists of {the content
 * department's initial assessment of that version, the content heads' evaluation of it}; the item takes its
 * newest version that has one. Episodes the same way, per episode. Only content-department initial
 * assessments count (content heads evaluate with the form; older head/GCM initial assessments are ignored).
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
  const reportIds = reports.map((r) => r.id);
  const [crEvals, epEvals, crRevisions, epRevisions, programmingIds, { data: users }] = await Promise.all([
    admin
      .from("call_report_evaluations_with_type")
      .select("call_report_id, revision_id, evaluator_id, evaluation_type, average_score, submitted_at, created_at")
      .in("call_report_id", reportIds)
      .not("average_score", "is", null)
      .then(({ data }) => data ?? []),
    // All scored episode evaluations and episode revisions (filtering by ~1000 episode ids would overflow the request URL)
    fetchAll((from, to) => admin
      .from("episodic_evaluations_with_type")
      .select("episode_id, revision_id, evaluator_id, evaluation_type, overall_average, submitted_at, created_at")
      .not("overall_average", "is", null)
      .order("id").range(from, to)),
    admin
      .from("call_report_revisions")
      .select("id, call_report_id, revision_number, initial_assessment, assessed_by")
      .in("call_report_id", reportIds)
      .then(({ data }) => data ?? []),
    fetchAll((from, to) => admin
      .from("episode_revisions")
      .select("id, episode_id, revision_number, initial_assessment, assessed_by")
      .order("id").range(from, to)),
    getProgrammingTeamMemberIds(admin),
    admin.from("users").select("id, role, team_id"),
  ]);
  const roleOf = new Map((users || []).map((u) => [u.id, u.role as string]));
  const contentDevIds = new Set((users || []).filter((u) => u.team_id && contentDevTeamIds.includes(u.team_id)).map((u) => u.id));
  const groupOf = (e: any): Group =>
    contentDevIds.has(e.evaluator_id) ? "contentDev"
      : programmingIds.has(e.evaluator_id) || e.evaluation_type === "programmer" ? "programming"
        : e.evaluation_type === "evaluator" ? "contentHead"
          : null;

  // Each person's latest score per key
  const latestOf = (rows: any[], keyOf: (e: any) => string) => {
    const latest = new Map<string, any>();
    for (const e of rows) {
      const key = `${keyOf(e)}:${e.evaluator_id}`;
      const when = e.submitted_at || e.created_at;
      const prev = latest.get(key);
      if (!prev || when > (prev.submitted_at || prev.created_at)) latest.set(key, e);
    }
    return [...latest.values()];
  };
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const avg = (xs: number[]) => Math.round(mean(xs) * 10) / 10;
  const contentDeptScore = (userId: string | null | undefined, value: unknown) => {
    const role = userId ? roleOf.get(userId) : undefined;
    return value != null && (role === "content_creator" || role === "content_manager") ? Number(value) : null;
  };
  const ratingsFor = (id: string) => {
    if (!result.has(id)) result.set(id, structuredClone(NO_RATINGS));
    return result.get(id)!;
  };

  // Content Head of an item: its newest version with an initial assessment and/or heads' scores, those averaged
  const versionKey = (itemId: string, revisionId: string | null | undefined) => `${itemId}:${revisionId ?? ""}`;
  const headScoresOf = (rows: any[], itemKey: string, scoreKey: string) => {
    const byVersion = new Map<string, number[]>();
    for (const e of latestOf(rows.filter((e) => groupOf(e) === "contentHead"), (e) => versionKey(e[itemKey], e.revision_id))) {
      const k = versionKey(e[itemKey], e.revision_id);
      byVersion.set(k, [...(byVersion.get(k) ?? []), Number(e[scoreKey])]);
    }
    return byVersion;
  };
  const revisionsOf = (rows: any[], itemKey: string) => {
    const byItem = new Map<string, any[]>();
    for (const v of rows) byItem.set(v[itemKey], [...(byItem.get(v[itemKey]) ?? []), v]);
    return byItem;
  };
  const contentHeadOf = (itemId: string, originalInitial: number | null, revisions: any[] | undefined, heads: Map<string, number[]>) => {
    const versions = [
      { id: null as string | null, n: 0, initial: originalInitial },
      ...(revisions ?? []).map((v) => ({ id: v.id as string, n: v.revision_number as number, initial: contentDeptScore(v.assessed_by, v.initial_assessment) })),
    ].sort((a, b) => b.n - a.n);
    for (const v of versions) {
      const h = heads.get(versionKey(itemId, v.id));
      const parts = [v.initial, h?.length ? mean(h) : null].filter((x): x is number => x != null);
      if (parts.length) return { score: mean(parts), evaluated: !!h?.length };
    }
    return null;
  };

  // One-liner
  const crHeads = headScoresOf(crEvals, "call_report_id", "average_score");
  const crRevs = revisionsOf(crRevisions, "call_report_id");
  const oneLiner = new Map<string, { prog: number[]; dev: number[] }>();
  for (const e of latestOf(crEvals, (e) => e.call_report_id)) {
    const group = groupOf(e);
    const g = oneLiner.get(e.call_report_id) ?? { prog: [], dev: [] };
    if (group === "programming") g.prog.push(Number(e.average_score));
    else if (group === "contentDev") g.dev.push(Number(e.average_score));
    oneLiner.set(e.call_report_id, g);
  }
  for (const report of reports) {
    const g = oneLiner.get(report.id);
    const head = contentHeadOf(report.id, contentDeptScore(report.creator?.id, report.overall_rating), crRevs.get(report.id), crHeads);
    if (!g && head == null) continue;
    const r = ratingsFor(report.id);
    r.contentHead = head == null ? null : Math.round(head.score * 10) / 10;
    r.contentHeadAssessmentOnly = head != null && !head.evaluated;
    r.programming = g?.prog.length ? avg(g.prog) : null;
    r.contentDev = g?.dev.length ? avg(g.dev) : null;
  }

  // Episodes: per project and group, the episodes rated and the average of those scores
  // evaluated: at least one score came from an evaluation (not only the content team's initial assessments)
  const episodes = new Map<string, { numbers: Set<number>; scores: number[]; evaluated: boolean }>();
  const add = (reportId: string, group: Exclude<Group, null>, number: number, score: number, evaluated = true) => {
    const key = `${reportId}:${group}`;
    const g = episodes.get(key) ?? { numbers: new Set<number>(), scores: [], evaluated: false };
    g.numbers.add(number);
    g.scores.push(score);
    g.evaluated ||= evaluated;
    episodes.set(key, g);
  };
  for (const e of latestOf(epEvals, (e) => e.episode_id)) {
    const info = episodeInfo.get(e.episode_id);
    const group = groupOf(e);
    if (info && (group === "programming" || group === "contentDev")) add(info.reportId, group, info.number, Number(e.overall_average));
  }
  const epHeads = headScoresOf(epEvals, "episode_id", "overall_average");
  const epRevs = revisionsOf(epRevisions, "episode_id");
  for (const r of reports) {
    for (const ep of r.episodes ?? []) {
      const head = contentHeadOf(ep.id, contentDeptScore(ep.logged_by, ep.initial_assessment), epRevs.get(ep.id), epHeads);
      if (head != null) add(r.id, "contentHead", ep.episode_number, head.score, head.evaluated);
    }
  }
  for (const [key, g] of episodes) {
    const [reportId, group] = key.split(":") as [string, Exclude<Group, null>];
    ratingsFor(reportId).episodes[group] = { episodes: [...g.numbers].sort((a, b) => a - b), average: avg(g.scores), assessmentOnly: !g.evaluated };
  }
  return result;
}
