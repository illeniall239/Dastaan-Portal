import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProgrammingTeamMemberIds } from "@/lib/management/programming-team";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { overallRatings, type OverallRating, type TeamProjectRatings } from "@/lib/management/project-ratings";

/** The content department's own score of an item (its newest version that has one) */
export interface ContentTeamAssessment {
  itemType: "call_report" | "episode";
  itemId: string;
  callReportId: string;
  score: number;
  by: string;   // user id
  byName: string; // who gave it (a content team member)
  at: string;   // when it was given (the version's upload time)
}

export interface ProjectRatingsData {
  /** call report id -> ratings by group */
  ratings: Map<string, TeamProjectRatings>;
  /** call report id -> the overall rating (average of the teams that rated), one-liner and episodes */
  overall: Map<string, { oneLiner: OverallRating | null; episodes: OverallRating | null }>;
  /** episode id -> that episode's overall rating (average of the teams that rated it), 1 decimal */
  episodeOverall: Map<string, number>;
  /** call report / episode id -> its Content Head score (Content Team Assessment and heads' evaluation averaged), 1 decimal */
  contentHeadScore: Map<string, number>;
  /** call report and episode ids that have a Content Head rating (a Content Team Assessment and/or a head's evaluation) */
  contentHeadRated: Set<string>;
  /** call report / episode id -> its Content Team Assessment */
  contentTeamAssessments: Map<string, ContentTeamAssessment>;
}

export const NO_RATINGS: TeamProjectRatings = {
  contentHead: null, contentHeadAssessmentOnly: false, programming: null, contentDev: null,
  episodes: { contentHead: null, programming: null, contentDev: null },
};

type Group = "contentHead" | "programming" | "contentDev" | null;

const CONTENT_DEV_HEAD_EMAIL = "humera.safder@geo.tv";

/**
 * Every project's rating — the single source for anything that shows how good a project is.
 *
 * Grouped like the management drill-down: Content Development (Humera's team) and Programming Team members
 * by team, whatever their role; otherwise content heads (evaluation type "evaluator", which includes GCM).
 * Management's own ratings aren't part of it; feedback-only evaluations have no score and don't count.
 * Each person's latest score per item counts.
 *
 * Content Head = per version (original, revision 1, 2, ...), the average of what exists of {the content
 * department's assessment of that version (the Content Team Assessment), the content heads' evaluation of
 * it}; the item takes its newest version that has one. Episodes the same way, per episode. Only
 * content_creator / content_manager assessments count; older head/GCM ones are ignored.
 *
 * Computed once per server request (several dashboard sections use it).
 */
export const getProjectRatings = cache(async (): Promise<ProjectRatingsData> => {
  const admin = createAdminClient();
  const [reports, episodes, crEvals, epEvals, crRevisions, epRevisions, programmingIds, { data: users }, { data: teams }] = await Promise.all([
    fetchAll<any>((f, t) => admin.from("call_reports")
      .select("id, overall_rating, created_by, created_at")
      .eq("meeting_type", "call_report").order("id").range(f, t)),
    fetchAll<any>((f, t) => admin.from("episodes")
      .select("id, call_report_id, episode_number, initial_assessment, logged_by, created_at")
      .not("call_report_id", "is", null).order("id").range(f, t)),
    fetchAll<any>((f, t) => admin.from("call_report_evaluations_with_type")
      .select("call_report_id, revision_id, evaluator_id, evaluation_type, average_score, submitted_at, created_at")
      .not("average_score", "is", null).order("id").range(f, t)),
    fetchAll<any>((f, t) => admin.from("episodic_evaluations_with_type")
      .select("episode_id, revision_id, evaluator_id, evaluation_type, overall_average, submitted_at, created_at")
      .not("overall_average", "is", null).order("id").range(f, t)),
    fetchAll<any>((f, t) => admin.from("call_report_revisions")
      .select("id, call_report_id, revision_number, initial_assessment, assessed_by, created_at").order("id").range(f, t)),
    fetchAll<any>((f, t) => admin.from("episode_revisions")
      .select("id, episode_id, revision_number, initial_assessment, assessed_by, created_at").order("id").range(f, t)),
    getProgrammingTeamMemberIds(admin),
    admin.from("users").select("id, name, role, team_id"),
    admin.from("teams").select("id, team_type, team_head:users!teams_team_head_id_fkey(email)"),
  ]);

  const contentDevTeamIds = new Set((teams || [])
    .filter((t: any) => t.team_type === "management" && t.team_head?.email === CONTENT_DEV_HEAD_EMAIL)
    .map((t: any) => t.id));
  const roleOf = new Map((users || []).map((u: any) => [u.id, u.role as string]));
  const nameOf = new Map((users || []).map((u: any) => [u.id, (u.name as string) || "Unknown"]));
  const contentDevIds = new Set((users || []).filter((u: any) => u.team_id && contentDevTeamIds.has(u.team_id)).map((u: any) => u.id));
  const groupOf = (e: any): Group =>
    contentDevIds.has(e.evaluator_id) ? "contentDev"
      : programmingIds.has(e.evaluator_id) || e.evaluation_type === "programmer" ? "programming"
        : e.evaluation_type === "evaluator" ? "contentHead"
          : null;
  const isContentTeam = (userId: string | null | undefined) => {
    const role = userId ? roleOf.get(userId) : undefined;
    return role === "content_creator" || role === "content_manager";
  };

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

  const ratings = new Map<string, TeamProjectRatings>();
  const ratingsFor = (id: string) => {
    if (!ratings.has(id)) ratings.set(id, structuredClone(NO_RATINGS));
    return ratings.get(id)!;
  };
  const contentHeadRated = new Set<string>();
  const contentHeadScore = new Map<string, number>();
  const contentTeamAssessments = new Map<string, ContentTeamAssessment>();

  // Content Head of an item: its newest version with a Content Team Assessment and/or heads' scores, averaged
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
  const contentHeadOf = (
    item: { type: ContentTeamAssessment["itemType"]; id: string; callReportId: string; score: unknown; by: string | null; at: string },
    revisions: any[] | undefined,
    heads: Map<string, number[]>
  ) => {
    const versions = [
      { id: null as string | null, n: 0, score: item.score, by: item.by, at: item.at },
      ...(revisions ?? []).map((v) => ({ id: v.id as string, n: v.revision_number as number, score: v.initial_assessment, by: v.assessed_by, at: v.created_at })),
    ].sort((a, b) => b.n - a.n);
    // The item's Content Team Assessment: its newest version the content team scored
    const team = versions.find((v) => v.score != null && isContentTeam(v.by));
    if (team) contentTeamAssessments.set(item.id, { itemType: item.type, itemId: item.id, callReportId: item.callReportId, score: Number(team.score), by: team.by!, byName: nameOf.get(team.by!) ?? "Unknown", at: team.at });
    for (const v of versions) {
      const h = heads.get(versionKey(item.id, v.id));
      const initial = v.score != null && isContentTeam(v.by) ? Number(v.score) : null;
      const parts = [initial, h?.length ? mean(h) : null].filter((x): x is number => x != null);
      if (parts.length) {
        contentHeadRated.add(item.id);
        contentHeadScore.set(item.id, Math.round(mean(parts) * 10) / 10);
        return { score: mean(parts), evaluated: !!h?.length };
      }
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
    const head = contentHeadOf(
      { type: "call_report", id: report.id, callReportId: report.id, score: report.overall_rating, by: report.created_by, at: report.created_at },
      crRevs.get(report.id), crHeads);
    if (!g && head == null) continue;
    const r = ratingsFor(report.id);
    r.contentHead = head == null ? null : Math.round(head.score * 10) / 10;
    r.contentHeadAssessmentOnly = head != null && !head.evaluated;
    r.programming = g?.prog.length ? avg(g.prog) : null;
    r.contentDev = g?.dev.length ? avg(g.dev) : null;
  }

  // Episodes: per project and group, the episodes rated and the average of those scores.
  // evaluated: at least one score came from an evaluation (not only Content Team Assessments)
  const episodeInfo = new Map<string, { reportId: string; number: number }>();
  for (const ep of episodes) episodeInfo.set(ep.id, { reportId: ep.call_report_id, number: ep.episode_number });
  const groups = new Map<string, { numbers: Set<number>; scores: number[]; evaluated: boolean }>();
  const add = (reportId: string, group: Exclude<Group, null>, number: number, score: number, evaluated = true) => {
    const key = `${reportId}:${group}`;
    const g = groups.get(key) ?? { numbers: new Set<number>(), scores: [], evaluated: false };
    g.numbers.add(number);
    g.scores.push(score);
    g.evaluated ||= evaluated;
    groups.set(key, g);
  };
  const perEpisode = new Map<string, { prog: number[]; dev: number[] }>();
  for (const e of latestOf(epEvals, (e) => e.episode_id)) {
    const info = episodeInfo.get(e.episode_id);
    const group = groupOf(e);
    if (info && (group === "programming" || group === "contentDev")) {
      add(info.reportId, group, info.number, Number(e.overall_average));
      const g = perEpisode.get(e.episode_id) ?? { prog: [], dev: [] };
      (group === "programming" ? g.prog : g.dev).push(Number(e.overall_average));
      perEpisode.set(e.episode_id, g);
    }
  }
  const episodeOverall = new Map<string, number>();
  const epHeads = headScoresOf(epEvals, "episode_id", "overall_average");
  const epRevs = revisionsOf(epRevisions, "episode_id");
  for (const ep of episodes) {
    const head = contentHeadOf(
      { type: "episode", id: ep.id, callReportId: ep.call_report_id, score: ep.initial_assessment, by: ep.logged_by, at: ep.created_at },
      epRevs.get(ep.id), epHeads);
    if (head != null) add(ep.call_report_id, "contentHead", ep.episode_number, head.score, head.evaluated);
    const g = perEpisode.get(ep.id);
    const teams = [head?.score ?? null, g?.prog.length ? mean(g.prog) : null, g?.dev.length ? mean(g.dev) : null].filter((x): x is number => x != null);
    if (teams.length) episodeOverall.set(ep.id, Math.round(mean(teams) * 10) / 10);
  }
  for (const [key, g] of groups) {
    const [reportId, group] = key.split(":") as [string, Exclude<Group, null>];
    ratingsFor(reportId).episodes[group] = { episodes: [...g.numbers].sort((a, b) => a - b), average: avg(g.scores), assessmentOnly: !g.evaluated };
  }

  const overall = new Map<string, { oneLiner: OverallRating | null; episodes: OverallRating | null }>();
  for (const [id, r] of ratings) overall.set(id, overallRatings(r));
  return { ratings, overall, episodeOverall, contentHeadScore, contentHeadRated, contentTeamAssessments };
});
