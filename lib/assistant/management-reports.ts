// Lets the AI assistant read the management portal's own reports: the GET APIs the management
// pages use (called as the signed-in user, so the same numbers and access checks apply), and the
// server-side helpers that dashboard sections without an API use. Read-only throughout.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAllTeamPerformanceCached } from "@/lib/management/team-performance";
import { getTeamProjects } from "@/lib/management/team-projects";
import { getPendingBacklogByTeam } from "@/lib/management/pending-backlog";
import { getRoadmapList, calculateRoadmapStats } from "@/lib/roadmap/server";

type Admin = SupabaseClient<any, any, any>;

type Needs = "project" | "team" | "person";

type Report = {
  /** GET API the management page uses. Either `path` or `load` is set. */
  path?: string;
  /** Server-side helper a dashboard section uses (no API exists for it). */
  load?: (admin: Admin) => Promise<unknown>;
  about: string;
  /** Query params passed through from the tool args (tool arg name -> query param name). */
  params?: Record<string, string>;
  /** The report needs an id the assistant gives as a name. */
  needs?: Needs;
  /** Where the resolved id goes: a query param name, or ":id" for the URL path. */
  idParam?: string;
  dateRange?: boolean;
  /** The report is about one specific project/team and is useless without it. */
  required?: boolean;
};

export const MANAGEMENT_REPORTS: Record<string, Report> = {
  headline_metric: { path: "/api/management/executive-drill-down", about: "Headline dashboard figure broken down. metric: active_projects | pipeline_value | active_contracts | overdue_payments | weekly_activities | pending_approvals", params: { metric: "metric" } },
  active_projects: { path: "/api/management/active-projects", about: "Active projects shown on the management dashboard" },
  active_ideas: { path: "/api/management/active-ideas", about: "Active ideas (one-liners in progress) summary" },
  active_ideas_details: { path: "/api/management/active-ideas-details", about: "Active ideas in detail, optionally for one genre", params: { genre: "genre" } },
  alerts: { path: "/api/management/alerts", about: "Current alerts: delays, stalled projects, overdue items" },
  approval_queue: { path: "/api/management/approval-queue", about: "Evaluated one-liners still waiting for THIS management user's approval vote" },
  approvals: { path: "/api/management/approvals", about: "Story approval decisions (approved / rejected / pending) across projects" },
  archive_details: { path: "/api/management/archive-details", about: "Archived / rejected ideas, optionally for one genre", params: { genre: "genre" } },
  project_review: { path: "/api/management/call-report-review", about: "Full details of ONE project (one-liner) plus all its evaluations. Give project_title.", needs: "project", idParam: "id", required: true },
  one_liner_evaluations: { path: "/api/management/call-reports-with-evaluations", about: "One-liners that have evaluations, with their evaluations. Optional project_title.", needs: "project", idParam: "call_report_id" },
  episode_evaluations: { path: "/api/management/episodes-with-evaluations", about: "Episodes that have evaluations, with their scores. Optional project_title.", needs: "project", idParam: "call_report_id" },
  event_analysis: { path: "/api/management/event-analysis/:id", about: "Event / story-beat analysis from the evaluations of ONE project. Give project_title.", needs: "project", idParam: ":id", required: true },
  content_aging: { path: "/api/management/content-aging", about: "Content aging: how long projects and episodes have waited at each stage, by team" },
  content_aging_tracking: { path: "/api/management/content-aging/tracking", about: "Week-by-week tracking of episodes received, fresh vs revised, with each team's feedback; also the monthly delivery trend on the dashboard" },
  contracts: { path: "/api/management/contracts", about: "Contracts: signed agreements, values and status" },
  delay_tracker: { path: "/api/management/delay-tracker", about: "Episode delivery pace per project: expected vs actually received, who is behind" },
  dept_output: { path: "/api/management/dept-output", about: "Episodes submitted per team per month over the last 6 months" },
  episode_approval_queue: { path: "/api/management/episode-approval-queue", about: "Evaluated episodes waiting for approval vs already reviewed" },
  episode_milestones: { path: "/api/management/episode-milestones", about: "Serials and Long Serials grouped by how many episodes they have (5-9, 10-14, 15-19, 20+). For the projects in one group give content_type (Serial or Long Serial) and min_episodes (5, 10, 15 or 20).", params: { content_type: "type", min_episodes: "min", drilldown: "drilldown" } },
  evaluator_bias: { path: "/api/management/evaluator-bias", about: "Evaluator bias matrix: each evaluator's average score per dimension value. dimension: content_type | genre | target_slot | category | writer", params: { dimension: "dimension" }, dateRange: true },
  evaluator_stats: { path: "/api/management/evaluator-stats", about: "Per-evaluator statistics: number of evaluations, average scores, speed", dateRange: true },
  genre_theme: { path: "/api/management/genre-theme", about: "Commercial positioning breakdown (the project's tag set at logging) and top theme keywords, including how many projects have no commercial positioning yet" },
  idea_turnaround: { path: "/api/management/idea-turnaround", about: "Turnaround: time from logging an idea or episode to its evaluation, per person", dateRange: true },
  key_personnel_activity: { path: "/api/management/key-personnel-activity", about: "Activity and login sessions of key personnel", dateRange: true },
  overall_evaluations: { path: "/api/management/overall-evaluations", about: "All evaluations grouped by project and evaluator" },
  overdue_payments: { path: "/api/management/payments/overdue", about: "Overdue payments to writers" },
  pending_by_person: { path: "/api/management/pending-by-person", about: "Pending work per team head; give person_name for that person's pending items", needs: "person", idParam: "detail" },
  pending_evaluations: { path: "/api/management/pending-evaluations", about: "One-liners that have no evaluation yet" },
  pipeline_value: { path: "/api/management/pipeline-value", about: "Pipeline value: projects and money at each stage of the pipeline" },
  pov_breakdown: { path: "/api/management/pov-breakdown", about: "Gender POV / audience focus breakdown of projects (the project's tag set at logging): male centric, female centric, both, and how many are not classified yet" },
  production_phases: { path: "/api/management/production-phases", about: "Projects in Pre Cast, Pre Production and Production Start" },
  quality_quantity: { path: "/api/management/quality-quantity", about: "Quality vs quantity per team: one-liner scores against episode output" },
  rating_comparison: { path: "/api/management/rating-comparison", about: "One-liner evaluation scores compared with episode evaluation scores per project" },
  rating_trends: { path: "/api/management/rating-trends", about: "Rating trends: whether projects' scores are improving or declining" },
  revision_ranking: { path: "/api/management/revision-ranking", about: "Episode revision counts per project and per team (who needs the most rewrites)" },
  story_evaluations: { path: "/api/management/story-evaluations", about: "Per-story evaluator coverage: who has and hasn't rated each story" },
  team_activity: { path: "/api/management/team-activity", about: "Team activity in a period: ideas logged, evaluations, episodes, time on the portal per person", dateRange: true },
  team_metric: { path: "/api/management/team-drill-down", about: "One team's items for a metric. Give team_name and metric: ideas_logged | oneliner_evals | episodic_evals | episodes_received | approved | rejected | pending_oneliners | pending_episodes", params: { metric: "metric" }, needs: "team", idParam: "teamId", required: true },
  team_members: { path: "/api/management/team-members", about: "Members of one team with their activity counts. Give team_name.", needs: "team", idParam: "teamId", required: true },
  team_trends: { path: "/api/management/team-trends", about: "One team's trends over time. Give team_name.", needs: "team", idParam: "teamId", required: true },
  weekly_activities: { path: "/api/management/weekly-activities", about: "This week's activities across the department" },
  writer_financials: { path: "/api/management/writer-financial-summary", about: "Per-writer financial summary: contracted amounts, paid, outstanding" },

  // Other APIs the management dashboard and pages use
  annual_targets: { path: "/api/programmer/annual-targets", about: "Annual targets vs current situation for this year: slot-wise concept targets per team, how many achieved, which teams are behind or ahead" },
  delivery_rate: { path: "/api/writer-commitments/delivery-rate", about: "Writers' delivery performance: episodes committed vs received per writer and project (dashboard Delivery Performance)" },
  writer_commitments: { path: "/api/writer-commitments", about: "Writer commitments: what each writer has committed to deliver and when" },
  cross_team_shares: { path: "/api/cross-team-shares", about: "Projects shared between teams for review" },
  cross_team_share_results: { path: "/api/cross-team-shares/results", about: "Results and scores from cross-team reviews" },
  contract_terms: { path: "/api/contract-terms", about: "Contract terms under negotiation: price, terms and status per project" },

  // Dashboard sections and pages that load on the server without an API
  teams_overview: {
    about: "Teams overview: each team's performance, its projects, and its pending evaluation backlog (dashboard Teams Overview)",
    load: async () => {
      const [performance, projects, pending] = await Promise.all([
        getAllTeamPerformanceCached(), getTeamProjects(), getPendingBacklogByTeam(),
      ]);
      return { performance, projects_by_team: projects, pending_backlog: pending };
    },
  },
  roadmap: {
    about: "Roadmap: planned projects and their status, with summary stats",
    load: async () => {
      const items = await getRoadmapList();
      return { stats: calculateRoadmapStats(items), items };
    },
  },
  external_evaluations: {
    about: "External evaluation links (who they were sent for, active or expired, submissions) and the evaluations external reviewers submitted",
    load: async (admin) => {
      const [{ data: links }, { data: evaluations }] = await Promise.all([
        admin.from("external_evaluation_links")
          .select("id, content_type, content_id, created_by, created_at, expires_at, is_active, max_submissions, current_submissions, notes")
          .order("created_at", { ascending: false }),
        admin.from("external_evaluations").select("*").order("created_at", { ascending: false }),
      ]);
      // Never hand access tokens or reviewers' IP addresses to the model
      const clean = (rows: any[] | null) =>
        (rows || []).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !/token|ip_address/i.test(k))));
      return { links: clean(links), evaluations: clean(evaluations) };
    },
  },
};

/** One line per report, for the assistant's instructions. */
export function describeManagementReports(): string {
  return Object.entries(MANAGEMENT_REPORTS).map(([key, r]) => `- ${key}: ${r.about}`).join("\n");
}

const fuzzy = (term: string) => {
  const words = term.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);
  return words.length ? `%${words.join("%")}%` : `%${term}%`;
};

async function resolveId(admin: Admin, needs: Needs, args: any): Promise<{ id?: string; error?: string; matches?: string[] }> {
  if (needs === "project") {
    if (!args.project_title) return {};
    const { data } = await admin.from("call_reports").select("id, working_title")
      .eq("meeting_type", "call_report").ilike("working_title", fuzzy(args.project_title)).limit(10);
    const rows = (data as any[]) || [];
    const exact = rows.find((r) => r.working_title?.trim().toLowerCase() === String(args.project_title).trim().toLowerCase());
    if (exact) return { id: exact.id };
    if (rows.length === 1) return { id: rows[0].id };
    if (rows.length === 0) return { error: `No project found matching "${args.project_title}"` };
    return { error: `Several projects match "${args.project_title}"; ask which one.`, matches: rows.map((r) => r.working_title) };
  }
  if (needs === "team") {
    if (!args.team_name) return { error: "This report needs team_name." };
    const term = String(args.team_name).replace(/'s team$/i, "").trim();
    const { data } = await admin.from("teams").select("id, name, team_head:users!teams_team_head_id_fkey(name)");
    const teams = ((data as any[]) || []).map((t) => ({ id: t.id, name: t.name as string, head: (Array.isArray(t.team_head) ? t.team_head[0] : t.team_head)?.name as string | undefined }));
    const t = term.toLowerCase();
    const hits = teams.filter((x) => x.name?.toLowerCase().includes(t) || x.head?.toLowerCase().includes(t));
    if (hits.length === 1) return { id: hits[0].id };
    if (hits.length === 0) return { error: `No team found matching "${args.team_name}"` };
    return { error: `Several teams match "${args.team_name}"; ask which one.`, matches: hits.map((x) => (x.head ? `${x.head}'s Team` : x.name)) };
  }
  if (!args.person_name) return {};
  const { data } = await admin.from("users").select("id, name").ilike("name", fuzzy(args.person_name)).limit(10);
  const people = (data as any[]) || [];
  if (people.length === 1) return { id: people[0].id };
  if (people.length === 0) return { error: `No person found matching "${args.person_name}"` };
  return { error: `Several people match "${args.person_name}"; ask which one.`, matches: people.map((p) => p.name) };
}

/** Keep the data small enough for the model: long lists are cut, with their real length noted. */
export function shrink(value: unknown, maxItems: number): unknown {
  if (Array.isArray(value)) {
    const kept = value.slice(0, maxItems).map((v) => shrink(v, maxItems));
    return value.length > maxItems ? [...kept, { __more_items_not_shown: value.length - maxItems }] : kept;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shrink(v, maxItems)]));
  }
  return value;
}

const MAX_CHARS = 40_000;

export async function runManagementReport(
  args: any,
  ctx: { admin: Admin; origin: string; cookie: string; dateRange: { start: Date; end: Date } | null }
) {
  const report = MANAGEMENT_REPORTS[args.report];
  if (!report) return { error: `Unknown report "${args.report}".` };

  if (report.load) {
    try {
      return fitToBudget(args.report, await report.load(ctx.admin));
    } catch {
      return { error: `The ${args.report} report failed.` };
    }
  }

  let path = report.path!;
  const query = new URLSearchParams();

  if (report.needs) {
    const resolved = await resolveId(ctx.admin, report.needs, args);
    if (resolved.error) return resolved;
    if (resolved.id) {
      if (report.idParam === ":id") path = path.replace(":id", resolved.id);
      else if (report.idParam) query.set(report.idParam, resolved.id);
    } else if (report.required) {
      return { error: `The ${args.report} report needs ${report.needs === "team" ? "team_name" : "project_title"}.` };
    }
  }
  for (const [arg, param] of Object.entries(report.params || {})) {
    if (args[arg] !== undefined && args[arg] !== null && args[arg] !== "") query.set(param, args[arg] === true ? "1" : String(args[arg]));
  }
  if (report.dateRange && ctx.dateRange) {
    query.set("from", ctx.dateRange.start.toISOString());
    query.set("to", ctx.dateRange.end.toISOString());
  }

  const url = `${ctx.origin}${path}${query.toString() ? `?${query}` : ""}`;
  const res = await fetch(url, { headers: { cookie: ctx.cookie }, cache: "no-store" });
  if (res.status === 401 || res.status === 403) return { error: "This report is not available to your account." };
  const body = await res.json().catch(() => null);
  if (!res.ok || body === null) return { error: `The ${args.report} report failed (${res.status}).` };
  return fitToBudget(args.report, body);
}

// Shrink long lists until the data fits the model's context budget.
function fitToBudget(report: string, body: unknown) {
  for (const maxItems of [60, 30, 15, 8]) {
    const data = shrink(body, maxItems);
    if (JSON.stringify(data).length <= MAX_CHARS) return { report, data };
  }
  return { report, data: JSON.stringify(shrink(body, 5)).slice(0, MAX_CHARS), note: "Data was cut to fit; say it is partial." };
}
