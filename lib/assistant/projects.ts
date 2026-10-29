// One summary row per one-liner (call report) for the AI assistant, plus filtering,
// sorting and grouping over those rows. Phase uses the same rule as the management dashboard.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductionPhase } from "@/lib/production-phase";

export const NOT_CLASSIFIED = "Not classified";

export type RawProject = {
  id: string;
  call_report_id: string | null;
  working_title: string | null;
  writer_name: string | null;
  genre: string[] | null;
  theme: string | null;
  content_type: string | null;
  target_slot: string | null;
  total_episodes: number | null;
  created_at: string;
  team_name: string | null;
  logged_by: string | null;
} & { [K in (typeof TEXT_FIELDS)[number]]?: string | null };

// Extra call report text searched by `keywords`. Kept off the output so story text and
// notes are never sent to the model in full; only the field names that matched are.
// Contact details are deliberately not here.
export const TEXT_FIELDS = [
  "category", "on_air_title", "director", "idea_by", "developed_by", "suggested_writer", "location",
  "logline", "short_synopsis", "episodic_synopsis", "meeting_notes", "next_steps", "remarks",
  "feedback_text", "tracking_notes",
] as const;
const SEARCH_TEXT = Symbol("searchText");

export type ProjectLookups = {
  episodesByCr: Map<string, number>;
  estimatedEpsByCr: Map<string, number>;
  avgScoreByCr: Map<string, number>;
  /** null when the user may not see approval decisions */
  decisionByCr: Map<string, string> | null;
};

export type ProjectSummary = {
  title: string;
  code: string | null;
  writer: string | null;
  team: string | null;
  logged_by: string | null;
  logged_on: string;
  genres: string[];
  theme: string | null;
  content_type: string | null;
  slot: string | null;
  episodes_received: number;
  total_episodes: number | null;
  phase: string | null;
  avg_score: number | null;
  approval?: "approved" | "rejected" | "pending";
  [SEARCH_TEXT]?: Record<string, string>;
};

export function summarizeProjects(rows: RawProject[], lk: ProjectLookups): ProjectSummary[] {
  return rows.map((r) => {
    const total = r.total_episodes || lk.estimatedEpsByCr.get(r.id) || null;
    const received = lk.episodesByCr.get(r.id) || 0;
    const genres = (r.genre || []).map((g) => g.trim()).filter(Boolean);
    const summary: ProjectSummary = {
      title: r.working_title || "Untitled",
      code: r.call_report_id,
      writer: r.writer_name,
      team: r.team_name,
      logged_by: r.logged_by,
      logged_on: r.created_at.slice(0, 10),
      genres: genres.length > 0 ? genres : [NOT_CLASSIFIED],
      theme: r.theme,
      content_type: r.content_type,
      slot: r.target_slot,
      episodes_received: received,
      total_episodes: total,
      phase: getProductionPhase(total, received),
      avg_score: lk.avgScoreByCr.get(r.id) ?? null,
    };
    const text: Record<string, string> = {};
    for (const f of TEXT_FIELDS) if (r[f]) text[f] = String(r[f]);
    // Symbol keys are skipped by JSON.stringify, so this never reaches the model
    summary[SEARCH_TEXT] = text;
    if (lk.decisionByCr) {
      const d = lk.decisionByCr.get(r.id);
      summary.approval = d === "approved" ? "approved" : d === "rejected" ? "rejected" : "pending";
    }
    return summary;
  });
}

export type ProjectQuery = {
  search?: string;
  team?: string;
  logged_by?: string;
  genre?: string;
  /** match any of these genre tags */
  genres?: string[];
  theme?: string;
  /** match any keyword anywhere: title, writer, genres, theme, content type, slot and TEXT_FIELDS */
  keywords?: string[];
  content_type?: string;
  slot?: string;
  phase?: string;
  approval?: string;
  min_episodes?: number;
  group_by?: "genre" | "theme" | "content_type" | "slot" | "phase" | "team" | "approval" | "logged_by";
  sort_by?: "logged_on" | "episodes_received" | "avg_score" | "title";
  limit?: number;
};

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const contains = (value: string | null | undefined, term: string) => norm(value).includes(norm(term));
const isNotClassified = (term: string) => ["notclassified", "unclassified", "untagged", "none"].includes(norm(term));

function genreMatches(p: ProjectSummary, tag: string) {
  return isNotClassified(tag) ? p.genres[0] === NOT_CLASSIFIED : p.genres.some((g) => norm(g) === norm(tag));
}

/** Names of the fields where any keyword appears (case-insensitive substring). */
function keywordHits(p: ProjectSummary, keywords: string[]): string[] {
  const fields: Record<string, string | null> = {
    title: p.title, writer: p.writer, genre: p.genres.join(" | "), theme: p.theme,
    content_type: p.content_type, slot: p.slot, ...p[SEARCH_TEXT],
  };
  return Object.keys(fields).filter((f) => {
    const v = (fields[f] ?? "").toLowerCase();
    return v && keywords.some((k) => v.includes(k));
  });
}

/**
 * Whether a topic is the project's main theme or an underlying one. Tags are listed
 * main-first, so the first genre tag or the first theme listed counts as main.
 * ponytail: tag order is a heuristic; the logline sent alongside lets the model check it.
 */
function focusOf(p: ProjectSummary, terms: string[]): "main" | "underlying" {
  const has = (v: string | null | undefined) => Boolean(v) && terms.some((t) => v!.toLowerCase().includes(t));
  const firstGenre = p.genres[0] === NOT_CLASSIFIED ? null : p.genres[0];
  return has(firstGenre) || has(p.theme?.split(/[,;]/)[0]) ? "main" : "underlying";
}

function topCounts(values: string[], max = 150): Record<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]).slice(0, max));
}

export function queryProjects(
  list: ProjectSummary[],
  q: ProjectQuery,
  range?: { start: Date; end: Date } | null
) {
  const approvalsVisible = list.some((p) => "approval" in p);
  const keywords = (q.keywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);
  const genres = (q.genres || []).filter((g) => g.trim());
  const hits = new Map<ProjectSummary, string[]>();

  const matching = list.filter((p) => {
    if (q.search && !(contains(p.title, q.search) || contains(p.writer, q.search) || contains(p.code, q.search))) return false;
    if (q.team && !contains(p.team, q.team)) return false;
    if (q.logged_by && !contains(p.logged_by, q.logged_by)) return false;
    if (q.genre && !genreMatches(p, q.genre)) return false;
    if (genres.length > 0 && !genres.some((g) => genreMatches(p, g))) return false;
    if (q.theme && !contains(p.theme, q.theme)) return false;
    if (q.content_type && norm(p.content_type) !== norm(q.content_type)) return false;
    if (q.slot && !contains(p.slot, q.slot)) return false;
    if (q.phase) {
      if (norm(q.phase) === "none" ? p.phase !== null : norm(p.phase) !== norm(q.phase)) return false;
    }
    if (q.approval && approvalsVisible && norm(p.approval) !== norm(q.approval)) return false;
    if (q.min_episodes != null && p.episodes_received < q.min_episodes) return false;
    if (range) {
      const loggedOn = new Date(`${p.logged_on}T00:00:00Z`);
      if (loggedOn < range.start || loggedOn > range.end) return false;
    }
    if (keywords.length > 0) {
      const found = keywordHits(p, keywords);
      if (found.length === 0) return false;
      hits.set(p, found);
    }
    return true;
  });

  // Keyword search: projects tagged with the concept (genre or theme) are the answer;
  // ones that only mention it in their text are listed separately, not counted.
  const byTags = (p: ProjectSummary) => hits.get(p)!.some((f) => f === "genre" || f === "theme");
  const answer = keywords.length > 0 ? matching.filter(byTags) : matching;
  const textOnly = keywords.length > 0 ? matching.filter((p) => !byTags(p)) : [];

  let groups: Record<string, number> | undefined;
  const groupBy = q.group_by;
  if (groupBy && (groupBy !== "approval" || approvalsVisible)) {
    groups = {};
    for (const p of answer) {
      const keys = groupBy === "genre" ? p.genres : [String(p[groupBy] ?? "None")];
      for (const k of keys) groups[k] = (groups[k] || 0) + 1;
    }
  }

  const sorted = [...answer].sort((a, b) => {
    switch (q.sort_by) {
      case "episodes_received": return b.episodes_received - a.episodes_received;
      case "avg_score": return (b.avg_score ?? -1) - (a.avg_score ?? -1);
      case "title": return a.title.localeCompare(b.title);
      default: return b.logged_on.localeCompare(a.logged_on);
    }
  });

  const limit = Math.min(Math.max(Math.floor(q.limit ?? 100), 1), 200);
  // Any topic filter (keywords, genre tags, theme): say whether the topic is each project's
  // main theme or an underlying one, with the logline so the model can check
  const topicTerms = [...keywords, ...genres, q.genre, q.theme]
    .map((t) => t?.trim().toLowerCase())
    .filter((t): t is string => Boolean(t) && !isNotClassified(t!));
  const logline = (p: ProjectSummary) => {
    const l = p[SEARCH_TEXT]?.logline?.trim();
    return l && l.length > 300 ? `${l.slice(0, 300)}…` : l || null;
  };
  const withContext = (p: ProjectSummary) => ({
    ...p,
    ...(hits.has(p) && { matched_in: hits.get(p)! }),
    ...(topicTerms.length > 0 && { focus: focusOf(p, topicTerms), logline: logline(p) }),
  });
  // Free-text tags: show what exists so a topic can be mapped to the real tags
  const tagsUsed = Boolean(q.genre || genres.length || q.theme || keywords.length);
  return {
    total_matching: answer.length,
    ...(topicTerms.length > 0 && {
      topic_terms: topicTerms,
      by_focus: {
        main: answer.filter((p) => focusOf(p, topicTerms) === "main").length,
        underlying: answer.filter((p) => focusOf(p, topicTerms) === "underlying").length,
      },
    }),
    ...(keywords.length > 0 && {
      keywords_used: keywords,
      matched_in_text_only: textOnly.length,
      text_only_matches: textOnly.slice(0, 50).map((p) => ({ title: p.title, writer: p.writer, team: p.team, matched_in: hits.get(p)! })),
    }),
    groups,
    projects: sorted.slice(0, limit).map(withContext),
    truncated: answer.length > limit,
    ...(tagsUsed && {
      tags_in_scope: {
        genres: topCounts(list.flatMap((p) => p.genres)),
        themes: topCounts(list.map((p) => p.theme?.trim()).filter((t): t is string => Boolean(t))),
      },
    }),
  };
}

// ─── Loading ────────────────────────────────────────────────────────────────

type Admin = SupabaseClient<any, any, any>;

// PostgREST returns at most 1000 rows per request, so read every page.
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < size) return out;
  }
}

/** Summaries for every active one-liner, limited to `crIdsInScope` when the user is team-scoped. */
export async function loadProjectSummaries(
  admin: Admin,
  crIdsInScope: string[] | null,
  includeApprovals: boolean
): Promise<ProjectSummary[]> {
  const [crs, episodes, negotiations, evalForms, evalLogs, users] = await Promise.all([
    fetchAll<any>((f, t) => admin.from("call_reports")
      .select(`id, call_report_id, working_title, writer_name, genre, theme, content_type, target_slot, total_episodes, created_at, created_by, ${TEXT_FIELDS.join(", ")}, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))`)
      .eq("meeting_type", "call_report").is("archived_at", null).order("id").range(f, t)),
    // Counted the same way as the dashboard's Production Phases chart
    fetchAll<any>((f, t) => admin.from("episodes").select("id, call_report_id")
      .eq("is_current", true).not("call_report_id", "is", null).order("id").range(f, t)),
    fetchAll<any>((f, t) => admin.from("negotiations").select("id, call_report_id, estimated_episodes")
      .not("call_report_id", "is", null).order("id").range(f, t)),
    fetchAll<any>((f, t) => admin.from("evaluator_forms").select("id, call_report_id, average_score")
      .not("submitted_at", "is", null).not("average_score", "is", null).order("id").range(f, t)),
    includeApprovals
      ? fetchAll<any>((f, t) => admin.from("evaluation_logs").select("id, call_report_id, final_decision").order("id").range(f, t))
      : Promise.resolve([] as any[]),
    fetchAll<any>((f, t) => admin.from("users").select("id, name").order("id").range(f, t)),
  ]);

  const inScope = crIdsInScope ? new Set(crIdsInScope) : null;
  const userName = new Map(users.map((u: any) => [u.id, u.name as string]));

  const episodesByCr = new Map<string, number>();
  for (const e of episodes) episodesByCr.set(e.call_report_id, (episodesByCr.get(e.call_report_id) || 0) + 1);

  const estimatedEpsByCr = new Map<string, number>();
  for (const n of negotiations) if (n.estimated_episodes) estimatedEpsByCr.set(n.call_report_id, n.estimated_episodes);

  const scores = new Map<string, number[]>();
  for (const ef of evalForms) scores.set(ef.call_report_id, [...(scores.get(ef.call_report_id) || []), ef.average_score]);
  const avgScoreByCr = new Map<string, number>();
  for (const [crId, s] of scores) avgScoreByCr.set(crId, Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10);

  const decisionByCr = includeApprovals ? new Map<string, string>() : null;
  if (decisionByCr) for (const l of evalLogs) if (l.final_decision) decisionByCr.set(l.call_report_id, l.final_decision);

  const rows: RawProject[] = crs
    .filter((cr: any) => !inScope || inScope.has(cr.id))
    .map((cr: any) => {
      const team = Array.isArray(cr.team) ? cr.team[0] : cr.team;
      const head = team?.team_head ? (Array.isArray(team.team_head) ? team.team_head[0] : team.team_head) : null;
      return {
        id: cr.id,
        call_report_id: cr.call_report_id,
        working_title: cr.working_title,
        writer_name: cr.writer_name,
        genre: cr.genre,
        theme: cr.theme,
        content_type: cr.content_type,
        target_slot: cr.target_slot,
        total_episodes: cr.total_episodes,
        created_at: cr.created_at,
        team_name: head?.name ? `${head.name}'s Team` : team?.name || null,
        logged_by: cr.created_by ? userName.get(cr.created_by) || null : null,
        ...Object.fromEntries(TEXT_FIELDS.map((f) => [f, Array.isArray(cr[f]) ? cr[f].join(", ") : cr[f]])),
      };
    });

  return summarizeProjects(rows, { episodesByCr, estimatedEpsByCr, avgScoreByCr, decisionByCr });
}
