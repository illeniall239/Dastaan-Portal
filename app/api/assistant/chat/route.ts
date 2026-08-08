import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL      = "gemini-2.5-flash";

type AdminClient = ReturnType<typeof createAdminClient>;

type TeamScope = {
  teamId: string;
  memberIds: string[];
  crIds?: string[];
} | null;

// ─── Period helper ─────────────────────────────────────────────────────────────
function parsePeriod(period?: string | null): { start: Date; end: Date } | null {
  if (!period) return null;
  const now = new Date();
  const p = period.toLowerCase().trim();

  // Named shorthands
  if (p === "this_month")  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  if (p === "this_year")   return { start: new Date(now.getFullYear(), 0, 1), end: now };
  if (p === "last_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
    };
  }

  // Generic: last_N_days / last_N_weeks / last_N_months / last_N_years
  const m = p.match(/^last[_\s](\d+)[_\s](day|days|week|weeks|month|months|year|years)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2].replace(/s$/, ""); // normalise to singular
    const start = new Date(now);
    if (unit === "day")   start.setDate(start.getDate() - n);
    if (unit === "week")  start.setDate(start.getDate() - n * 7);
    if (unit === "month") start.setMonth(start.getMonth() - n);
    if (unit === "year")  start.setFullYear(start.getFullYear() - n);
    return { start, end: now };
  }

  return null;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Fuzzy ILIKE pattern: "jang e ishq" → "%jang%ishq%" (each word becomes a wildcard segment)
// This matches "Jang-e-Ishq", "Jang E Ishq", "jang_e_ishq", etc.
function fuzzy(term: string): string {
  const words = term.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return `%${term}%`;
  return `%${words.join("%")}%`;
}

// ─── Tool definitions — ALL params "type": "string", no enum, no number ────────
// Groq validates types strictly. Using only strings avoids all schema errors.
const DATA_TOOLS = [
  {
    type: "function",
    function: {
      name: "query_evaluations",
      description:
        "Search evaluation records. Use for: how many evaluations did [person] do, what did [person] score for [project], evaluation counts by period. Searches BOTH one-liner evaluations (call report assessments) AND episodic evaluations (episode script assessments).",
      parameters: {
        type: "object",
        properties: {
          evaluator_name: {
            type: "string",
            description: "Name or partial name of the evaluator. Leave blank for all evaluators.",
          },
          project_title: {
            type: "string",
            description: "Partial title of the project or call report to filter by.",
          },
          period: {
            type: "string",
            description:
              "Time period to filter by. Use this_month, last_month, this_year, or a generic pattern like last_7_days, last_2_weeks, last_3_months, last_1_year. Leave blank for all time.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_content",
      description:
        "Search call reports and ideas logged in the system. Use for: how many ideas were logged, find ideas by writer or team, ideas logged BY a person, what was submitted in a period.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Search term to match against project title or writer name.",
          },
          logged_by: {
            type: "string",
            description: "Name of the person who logged/created the idea. Use this when the question is about who LOGGED the idea (not the writer of the story).",
          },
          team_name: {
            type: "string",
            description: "Filter by team name.",
          },
          period: {
            type: "string",
            description:
              "Time period: this_month, last_month, this_year, or a generic pattern like last_7_days, last_2_weeks, last_3_months, last_1_year.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_person_activity",
      description:
        "Full activity summary for a specific person: ideas they logged, one-liner evaluations submitted, episodic evaluations submitted. Use for: what has [person] done, how active is [person], show me [person]'s work.",
      parameters: {
        type: "object",
        properties: {
          person_name: {
            type: "string",
            description: "Name or partial name of the person (required).",
          },
          period: {
            type: "string",
            description:
              "Time period: this_month, last_month, this_year, or a generic pattern like last_7_days, last_2_weeks, last_3_months, last_1_year.",
          },
        },
        required: ["person_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_episode_delivery",
      description:
        "Episode delivery status for active projects. Use for: which projects are behind, how many episodes has writer X submitted, delivery health of a show.",
      parameters: {
        type: "object",
        properties: {
          project_title: {
            type: "string",
            description: "Partial project title to filter by.",
          },
          writer_name: {
            type: "string",
            description: "Filter by writer name.",
          },
          status: {
            type: "string",
            description: "OPTIONAL filter: 'behind' (not all eps delivered) or 'complete' (all eps delivered). Omit to get all projects.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_pending",
      description:
        "Get items that are pending: ideas with no evaluations yet, or ideas evaluated but awaiting management approval.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description:
              "What to list: evaluations (no evals yet), approvals (evaluated but no management sign-off), or all. Default: all.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_team_stats",
      description:
        "Team membership, activity, and performance. Use for: list all teams, who is on team X, how active is team Y, team evaluation counts.",
      parameters: {
        type: "object",
        properties: {
          team_name: {
            type: "string",
            description: "Team name or partial name. Leave blank for all teams.",
          },
          period: {
            type: "string",
            description:
              "Time period for activity counts: last_7_days, last_30_days, this_month, last_month, this_year.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_overview",
      description:
        "High-level dashboard overview of the entire portal: total projects, episodes, evaluations, writers, teams, contracts, meetings. Includes this-month breakdown. Use for: give me a summary, how are we doing, what's the overall status, show me the big picture, how much work has been done.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "query_contracts_payments",
      description:
        "Contract terms and payment data. Use for: how much did we pay [writer], total payments this month, which contracts are active, per-episode rates, payment status (paid/pending), financial summaries, money questions.",
      parameters: {
        type: "object",
        properties: {
          writer_name: { type: "string", description: "Filter by writer name." },
          project_title: { type: "string", description: "Filter by project title." },
          period: { type: "string", description: "Time period: this_month, last_month, this_year, etc." },
          status: { type: "string", description: "Payment status filter: paid or pending." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_writers",
      description:
        "Writer information: list of all writers, how many projects each has, episodes delivered. Use for: list all writers, who are our writers, which writer has the most projects, writer engagement.",
      parameters: {
        type: "object",
        properties: {
          writer_name: { type: "string", description: "Search by writer name." },
          period: { type: "string", description: "Time period for project counts." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_meetings",
      description:
        "Meeting/calendar data. Use for: how many meetings this week, who scheduled meetings, meeting history, calendar activity.",
      parameters: {
        type: "object",
        properties: {
          person_name: { type: "string", description: "Filter by person who created the meeting." },
          period: { type: "string", description: "Time period: this_week, this_month, last_month, etc." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_approvals",
      description:
        "Story approval decisions. Use for: which stories were approved, rejected stories, approval history, who approved what.",
      parameters: {
        type: "object",
        properties: {
          project_title: { type: "string", description: "Filter by project title." },
          status: { type: "string", description: "Filter: approved or rejected." },
          period: { type: "string", description: "Time period: this_month, last_month, this_year, etc." },
        },
      },
    },
  },
];

// ─── Tool execution ────────────────────────────────────────────────────────────

async function toolQueryEvaluations(
  args: { evaluator_name?: string; project_title?: string; period?: string },
  admin: AdminClient,
  scope: TeamScope = null
) {
  const range = parsePeriod(args.period);

  // Resolve episode IDs for project-level or team-level scope
  let scopedEpIds: string[] | null = null;
  const epScopeCrIds = scope?.crIds;

  // Resolve evaluator(s)
  let userIds: string[] | null = null;
  let userNames: Record<string, string> = {};
  if (args.evaluator_name) {
    const { data } = await admin.from("users").select("id, name").ilike("name", fuzzy(args.evaluator_name));
    const found = data as any[] || [];
    if (found.length === 0) return { message: `No person found matching "${args.evaluator_name}"`, total: 0 };
    userIds = found.map((u: any) => u.id);
    for (const u of found) userNames[u.id] = u.name;
  }

  // Resolve project(s) for title filter
  let crIds: string[] | null = null;
  if (args.project_title) {
    let pq: any = admin.from("call_reports").select("id, working_title").ilike("working_title", fuzzy(args.project_title));
    // Team scope: only match projects belonging to this team
    if (epScopeCrIds) pq = pq.in("id", epScopeCrIds);
    const { data } = await pq;
    const found = data as any[] || [];
    if (found.length === 0) return { message: `No project found matching "${args.project_title}"`, total: 0 };
    crIds = found.map((r: any) => r.id);
  }

  // Effective CR filter: project_title filter (already team-intersected) or team scope
  const effectiveCrIds = crIds || epScopeCrIds || null;

  // Resolve episode IDs so episodic_evaluations (q2) is also filtered
  if (effectiveCrIds) {
    const { data: filteredEps } = await admin.from("episodes").select("id").in("call_report_id", effectiveCrIds);
    scopedEpIds = (filteredEps as any[] || []).map((e: any) => e.id);
    if (scopedEpIds.length === 0) scopedEpIds = ["__none__"]; // force empty result
  }

  // Get accurate total counts first (no limit)
  let cq1: any = admin.from("evaluator_forms").select("id", { count: "exact", head: true }).not("submitted_at", "is", null);
  let cq2: any = admin.from("episodic_evaluations").select("id", { count: "exact", head: true });
  if (userIds)        { cq1 = cq1.in("evaluator_id", userIds); cq2 = cq2.in("evaluator_id", userIds); }
  if (effectiveCrIds) { cq1 = cq1.in("call_report_id", effectiveCrIds); }
  if (scopedEpIds)    { cq2 = cq2.in("episode_id", scopedEpIds); }
  if (range) {
    cq1 = cq1.gte("submitted_at", range.start.toISOString()).lte("submitted_at", range.end.toISOString());
    cq2 = cq2.gte("created_at",   range.start.toISOString()).lte("created_at",   range.end.toISOString());
  }

  // Query all rows (for aggregation) — fetch evaluator_id + score + date
  let q1: any = admin.from("evaluator_forms")
    .select("id, average_score, submitted_at, evaluator_id, call_report_id")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(2000);
  let q2: any = admin.from("episodic_evaluations")
    .select("id, overall_average, created_at, evaluator_id, episode_id")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (userIds)        { q1 = q1.in("evaluator_id", userIds); q2 = q2.in("evaluator_id", userIds); }
  if (effectiveCrIds) { q1 = q1.in("call_report_id", effectiveCrIds); }
  if (scopedEpIds)    { q2 = q2.in("episode_id", scopedEpIds); }
  if (range) {
    q1 = q1.gte("submitted_at", range.start.toISOString()).lte("submitted_at", range.end.toISOString());
    q2 = q2.gte("created_at",   range.start.toISOString()).lte("created_at",   range.end.toISOString());
  }

  const [{ count: olCount }, { count: epCount }, { data: oneLinerEvals }, { data: episodicEvals }] =
    await Promise.all([cq1, cq2, q1, q2]);
  const ol = oneLinerEvals as any[] || [];
  const ep = episodicEvals as any[] || [];
  const totalOl = olCount ?? ol.length;
  const totalEp = epCount ?? ep.length;

  // Collect all IDs needed for enrichment
  const olCrIds = [...new Set(ol.map((e: any) => e.call_report_id))];
  const epEpisodeIds = [...new Set(ep.map((e: any) => e.episode_id))];
  const allEvIds = [...new Set([...ol.map((e: any) => e.evaluator_id), ...ep.map((e: any) => e.evaluator_id)])];

  // Fetch enrichment data in parallel
  const [{ data: crs }, { data: evalUsers }, { data: episodeRows }] = await Promise.all([
    olCrIds.length ? admin.from("call_reports").select("id, working_title").in("id", olCrIds) : { data: [] },
    allEvIds.length ? admin.from("users").select("id, name").in("id", allEvIds) : { data: [] },
    epEpisodeIds.length ? admin.from("episodes").select("id, episode_number, call_report_id").in("id", epEpisodeIds) : { data: [] },
  ]);

  // Fetch project titles for episodic evals
  const epCrIds = [...new Set((episodeRows as any[] || []).map((e: any) => e.call_report_id))];
  const { data: epCrs } = epCrIds.length
    ? await admin.from("call_reports").select("id, working_title").in("id", epCrIds)
    : { data: [] };

  const crMap = new Map((crs as any[] || []).map((c: any) => [c.id, c.working_title]));
  const epCrMap = new Map((epCrs as any[] || []).map((c: any) => [c.id, c.working_title]));
  const episodeMap = new Map((episodeRows as any[] || []).map((e: any) => [e.id, e]));
  for (const u of (evalUsers as any[] || [])) userNames[u.id] = u.name;

  // Build per-evaluator summary (accurate counts + avg scores)
  const evaluatorStats: Record<string, { olCount: number; epCount: number; olScores: number[]; epScores: number[] }> = {};
  for (const e of ol) {
    const id = e.evaluator_id;
    if (!evaluatorStats[id]) evaluatorStats[id] = { olCount: 0, epCount: 0, olScores: [], epScores: [] };
    evaluatorStats[id].olCount++;
    if (e.average_score != null) evaluatorStats[id].olScores.push(parseFloat(e.average_score));
  }
  for (const e of ep) {
    const id = e.evaluator_id;
    if (!evaluatorStats[id]) evaluatorStats[id] = { olCount: 0, epCount: 0, olScores: [], epScores: [] };
    evaluatorStats[id].epCount++;
    if (e.overall_average != null) evaluatorStats[id].epScores.push(parseFloat(e.overall_average));
  }

  const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const evaluatorSummary = Object.entries(evaluatorStats)
    .map(([id, s]) => ({
      name: userNames[id] || id,
      one_liner_count: s.olCount,
      episodic_count: s.epCount,
      total: s.olCount + s.epCount,
      avg_one_liner_score: avg(s.olScores) != null ? parseFloat(avg(s.olScores)!.toFixed(1)) : null,
      avg_episodic_score: avg(s.epScores) != null ? parseFloat(avg(s.epScores)!.toFixed(1)) : null,
    }))
    .sort((a, b) => b.total - a.total);

  // Build per-project summary
  const projectStats: Record<string, { olScores: number[]; epScores: number[]; olCount: number; epCount: number }> = {};
  for (const e of ol) {
    const title = crMap.get(e.call_report_id) || "Unknown";
    if (!projectStats[title]) projectStats[title] = { olScores: [], epScores: [], olCount: 0, epCount: 0 };
    projectStats[title].olCount++;
    if (e.average_score != null) projectStats[title].olScores.push(parseFloat(e.average_score));
  }
  for (const e of ep) {
    const epRow = episodeMap.get(e.episode_id);
    const title = epRow ? (epCrMap.get(epRow.call_report_id) || "Unknown") : "Unknown";
    if (!projectStats[title]) projectStats[title] = { olScores: [], epScores: [], olCount: 0, epCount: 0 };
    projectStats[title].epCount++;
    if (e.overall_average != null) projectStats[title].epScores.push(parseFloat(e.overall_average));
  }

  const projectSummary = Object.entries(projectStats)
    .map(([title, s]) => ({
      project: title,
      one_liner_avg: avg(s.olScores) != null ? parseFloat(avg(s.olScores)!.toFixed(1)) : null,
      episodic_avg: avg(s.epScores) != null ? parseFloat(avg(s.epScores)!.toFixed(1)) : null,
      total_evaluations: s.olCount + s.epCount,
    }))
    .sort((a, b) => b.total_evaluations - a.total_evaluations);

  return {
    period: args.period || "all time",
    total_one_liner_evaluations: totalOl,
    total_episodic_evaluations: totalEp,
    total: totalOl + totalEp,
    evaluator_summary: evaluatorSummary,
    project_summary: projectSummary.slice(0, 30),
    recent_one_liner_items: ol.slice(0, 15).map((e: any) => ({
      evaluator: userNames[e.evaluator_id] || e.evaluator_id,
      project: crMap.get(e.call_report_id) || "Unknown",
      score: e.average_score != null ? parseFloat(e.average_score).toFixed(1) : "N/A",
      date: e.submitted_at ? fmtDate(e.submitted_at) : "",
    })),
    recent_episodic_items: ep.slice(0, 15).map((e: any) => {
      const epRow = episodeMap.get(e.episode_id);
      const project = epRow ? (epCrMap.get(epRow.call_report_id) || "Unknown Project") : "Unknown Project";
      const epNum = epRow?.episode_number ?? "?";
      return {
        evaluator: userNames[e.evaluator_id] || e.evaluator_id,
        project,
        episode: `Episode ${epNum}`,
        score: e.overall_average != null ? parseFloat(e.overall_average).toFixed(1) : "N/A",
        date: e.created_at ? fmtDate(e.created_at) : "",
      };
    }),
  };
}

async function toolQueryContent(
  args: { search?: string; logged_by?: string; team_name?: string; period?: string },
  admin: AdminClient,
  scope: TeamScope = null
) {
  const range = parsePeriod(args.period);

  let teamIds: string[] | null = null;
  if (scope) {
    teamIds = [scope.teamId];
  } else if (args.team_name) {
    const { data } = await admin.from("teams").select("id, name").ilike("name", fuzzy(args.team_name));
    const found = data as any[] || [];
    if (found.length === 0) return { message: `No team found matching "${args.team_name}"`, count: 0 };
    teamIds = found.map((t: any) => t.id);
  }

  // Resolve logged_by person name to user ID(s)
  let loggedByIds: string[] | null = null;
  let loggedByNames: Record<string, string> = {};
  if (args.logged_by) {
    const { data } = await admin.from("users").select("id, name").ilike("name", fuzzy(args.logged_by));
    const found = data as any[] || [];
    if (found.length === 0) return { message: `No person found matching "${args.logged_by}"`, count: 0 };
    loggedByIds = found.map((u: any) => u.id);
    for (const u of found) loggedByNames[u.id] = u.name;
  }

  // When search is provided, also check if it matches a person who logged ideas
  // This handles "ideas logged by Parisa" even if LLM puts it in search instead of logged_by
  let searchOrFilter: string | null = null;
  if (args.search) {
    const pattern = fuzzy(args.search);
    const orParts = [`working_title.ilike.${pattern}`, `writer_name.ilike.${pattern}`];
    if (!loggedByIds) {
      const { data: matchedUsers } = await admin.from("users").select("id, name").ilike("name", pattern);
      const matchedIds = (matchedUsers as any[] || []).map((u: any) => u.id);
      if (matchedIds.length > 0) {
        orParts.push(`created_by.in.(${matchedIds.join(",")})`);
        for (const u of (matchedUsers as any[] || [])) loggedByNames[u.id] = u.name;
      }
    }
    searchOrFilter = orParts.join(",");
  }

  // Accurate count
  let cq: any = admin.from("call_reports").select("id", { count: "exact", head: true })
    .eq("meeting_type", "call_report").is("archived_at", null);
  if (searchOrFilter) cq = cq.or(searchOrFilter);
  if (loggedByIds)    cq = cq.in("created_by", loggedByIds);
  if (teamIds)        cq = cq.in("team_id", teamIds);
  if (range)          cq = cq.gte("created_at", range.start.toISOString()).lte("created_at", range.end.toISOString());

  let q: any = admin.from("call_reports")
    .select("id, working_title, writer_name, created_at, team_id, created_by")
    .eq("meeting_type", "call_report")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (searchOrFilter) q = q.or(searchOrFilter);
  if (loggedByIds)    q = q.in("created_by", loggedByIds);
  if (teamIds)        q = q.in("team_id", teamIds);
  if (range)          q = q.gte("created_at", range.start.toISOString()).lte("created_at", range.end.toISOString());

  const [{ count: totalCount }, { data: reports }] = await Promise.all([cq, q]);
  const list = reports as any[] || [];

  // Enrich with team names and logger names
  const tidSet = [...new Set(list.map((r: any) => r.team_id).filter(Boolean))];
  const creatorIds = [...new Set(list.map((r: any) => r.created_by).filter(Boolean))];
  const teamMap = new Map<string, string>();
  if (tidSet.length) {
    const { data: teams } = await admin.from("teams").select("id, name").in("id", tidSet);
    for (const t of (teams as any[] || [])) teamMap.set(t.id, t.name);
  }
  // Resolve creator names (merge with any already resolved from logged_by)
  if (creatorIds.length) {
    const unknownIds = creatorIds.filter(id => !loggedByNames[id]);
    if (unknownIds.length) {
      const { data: users } = await admin.from("users").select("id, name").in("id", unknownIds);
      for (const u of (users as any[] || [])) loggedByNames[u.id] = u.name;
    }
  }

  return {
    count: totalCount ?? list.length,
    period: args.period || "all time",
    items: list.map((r: any) => ({
      title: r.working_title || "Untitled",
      writer: r.writer_name || "Unknown",
      logged_by: loggedByNames[r.created_by] || "Unknown",
      team: teamMap.get(r.team_id) || "Unknown",
      logged_at: r.created_at ? fmtDate(r.created_at) : "",
    })),
  };
}

async function toolQueryPersonActivity(
  args: { person_name: string; period?: string },
  admin: AdminClient,
  scope: TeamScope = null
) {
  const { data: found } = await admin.from("users").select("id, name, role, email").ilike("name", fuzzy(args.person_name)).limit(5);
  let people = found as any[] || [];
  if (scope) people = people.filter((p: any) => scope.memberIds.includes(p.id));
  if (people.length === 0) return { message: scope ? `No team member found matching "${args.person_name}"` : `No person found matching "${args.person_name}"` };

  const range = parsePeriod(args.period);

  const results = await Promise.all(
    people.map(async (person: any) => {
      let q1: any = admin.from("call_reports").select("id", { count: "exact", head: true })
        .eq("created_by", person.id).eq("meeting_type", "call_report");
      let q2: any = admin.from("evaluator_forms").select("id", { count: "exact", head: true })
        .eq("evaluator_id", person.id).not("submitted_at", "is", null);
      let q3: any = admin.from("episodic_evaluations").select("id", { count: "exact", head: true })
        .eq("evaluator_id", person.id);

      if (range) {
        q1 = q1.gte("created_at",   range.start.toISOString()).lte("created_at",   range.end.toISOString());
        q2 = q2.gte("submitted_at", range.start.toISOString()).lte("submitted_at", range.end.toISOString());
        q3 = q3.gte("created_at",   range.start.toISOString()).lte("created_at",   range.end.toISOString());
      }

      const [{ count: ideas }, { count: oneLinerEvals }, { count: episodicEvals }] =
        await Promise.all([q1, q2, q3]);

      return {
        name: person.name,
        role: person.role,
        email: person.email,
        period: args.period || "all time",
        ideas_logged: ideas ?? 0,
        one_liner_evaluations_submitted: oneLinerEvals ?? 0,
        episodic_evaluations_submitted: episodicEvals ?? 0,
        total_evaluations: (oneLinerEvals ?? 0) + (episodicEvals ?? 0),
      };
    })
  );

  return people.length === 1 ? results[0] : results;
}

async function toolQueryEpisodeDelivery(
  args: { project_title?: string; writer_name?: string; status?: string },
  admin: AdminClient,
  scope: TeamScope = null
) {
  // Use consolidated_cms_view — the same source every working portal page uses.
  // It already has actual_received_episodes computed from the episodes table.
  let q: any = admin.from("consolidated_cms_view")
    .select("id, working_title, writer_name, total_episodes, received_episodes, actual_received_episodes, completion_percentage, first_episode_received_at, last_episode_received_at, status, team_id");
  if (scope) q = q.eq("team_id", scope.teamId);

  if (args.project_title) q = q.ilike("working_title", fuzzy(args.project_title));
  if (args.writer_name)   q = q.ilike("writer_name",   fuzzy(args.writer_name));

  const { data, error } = await q;
  if (error) return { count: 0, message: `Query error: ${error.message}`, items: [] };

  const list = (data as any[]) || [];
  if (list.length === 0) {
    return { count: 0, message: `No project found matching "${args.project_title || args.writer_name || "all"}"`, items: [] };
  }

  const enriched = list.map((p: any) => {
    const required = p.total_episodes || null;
    // actual_received_episodes = counted from episodes table (is_current=true)
    // received_episodes = manually entered field on call_reports
    const received = p.actual_received_episodes || p.received_episodes || 0;
    const deliveryStatus = !required ? "no_target" : received >= required ? "complete" : "behind";
    return {
      title: p.working_title || "Untitled",
      writer: p.writer_name || "Unknown",
      required,
      received,
      completion: p.completion_percentage ? `${p.completion_percentage}%` : null,
      first_episode: p.first_episode_received_at ? fmtDate(p.first_episode_received_at) : null,
      last_episode: p.last_episode_received_at ? fmtDate(p.last_episode_received_at) : null,
      project_status: p.status || "unknown",
      status: deliveryStatus,
    };
  });

  // Only filter if status is a known filter value; ignore vague terms like "received"
  const statusArg = (args.status || "").toLowerCase();
  const filtered = (statusArg === "behind" || statusArg === "complete")
    ? enriched.filter((r) => r.status === statusArg)
    : enriched;

  const behind   = filtered.filter((r) => r.status === "behind").length;
  const complete = filtered.filter((r) => r.status === "complete").length;

  return { count: filtered.length, behind, complete, items: filtered };
}

async function toolQueryPending(args: { type?: string }, admin: AdminClient, scope: TeamScope = null) {
  const type = (args.type || "all").toLowerCase();
  const out: Record<string, any> = {};

  if (type === "evaluations" || type === "all") {
    let crQuery = admin.from("call_reports").select("id, working_title, writer_name").eq("meeting_type", "call_report").is("archived_at", null);
    if (scope) crQuery = crQuery.eq("team_id", scope.teamId);
    const [{ data: allCRs }, { data: evaled }] = await Promise.all([
      crQuery,
      admin.from("evaluator_forms").select("call_report_id").not("submitted_at", "is", null),
    ]);
    const evaledSet = new Set((evaled as any[] || []).map((e: any) => e.call_report_id));
    const pending = (allCRs as any[] || []).filter((p: any) => !evaledSet.has(p.id));
    out.pending_evaluations = {
      count: pending.length,
      items: pending.slice(0, 25).map((p: any) => ({ title: p.working_title || "Untitled", writer: p.writer_name || "Unknown" })),
    };
  }

  if (type === "approvals" || type === "all") {
    const { data: mgmtUsers } = await admin.from("users").select("id").in("role", ["management", "executive", "admin"]);
    const mgmtIds = (mgmtUsers as any[] || []).map((u: any) => u.id);

    let evalQuery = admin.from("evaluator_forms").select("call_report_id").not("submitted_at", "is", null);
    if (scope?.crIds) evalQuery = evalQuery.in("call_report_id", scope.crIds);
    const [{ data: allEvaled }, { data: mgmtEvaled }] = await Promise.all([
      evalQuery,
      mgmtIds.length
        ? (() => { let mq = admin.from("evaluator_forms").select("call_report_id").in("evaluator_id", mgmtIds).not("submitted_at", "is", null); if (scope?.crIds) mq = mq.in("call_report_id", scope.crIds); return mq; })()
        : { data: [] },
    ]);

    const mgmtApprovedSet = new Set((mgmtEvaled as any[] || []).map((e: any) => e.call_report_id));
    const allEvaledIds    = [...new Set((allEvaled as any[] || []).map((e: any) => e.call_report_id))];
    const needsApproval   = allEvaledIds.filter((id) => !mgmtApprovedSet.has(id));

    if (needsApproval.length > 0) {
      let crDetailQuery = admin.from("call_reports")
        .select("id, working_title, writer_name").in("id", needsApproval).is("archived_at", null).limit(25);
      if (scope) crDetailQuery = crDetailQuery.eq("team_id", scope.teamId);
      const { data: crDetails } = await crDetailQuery;
      out.pending_approvals = {
        count: needsApproval.length,
        items: (crDetails as any[] || []).map((p: any) => ({ title: p.working_title || "Untitled", writer: p.writer_name || "Unknown" })),
      };
    } else {
      out.pending_approvals = { count: 0, items: [] };
    }
  }

  return out;
}

async function toolQueryTeamStats(args: { team_name?: string; period?: string }, admin: AdminClient, scope: TeamScope = null) {
  const range = parsePeriod(args.period);

  let q: any = admin.from("teams").select("id, name, team_head_id");
  if (scope) q = q.eq("id", scope.teamId);
  else if (args.team_name) q = q.ilike("name", fuzzy(args.team_name));
  const { data: teams } = await q;
  const teamList = teams as any[] || [];
  if (teamList.length === 0) return { message: `No team found matching "${args.team_name}"` };

  const teamIds = teamList.map((t: any) => t.id);
  const { data: allUsers } = await admin.from("users").select("id, name, role, team_id").in("team_id", teamIds);
  const users = allUsers as any[] || [];

  const results = await Promise.all(
    teamList.map(async (team: any) => {
      const members = users.filter((u: any) => u.team_id === team.id);
      const memberIds = members.map((m: any) => m.id);
      const head = members.find((m: any) => m.id === team.team_head_id);

      let ideasCount = 0;
      let evalsCount = 0;

      let episodicEvalsCount = 0;

      if (memberIds.length > 0) {
        let q1: any = admin.from("call_reports").select("id", { count: "exact", head: true }).in("created_by", memberIds);
        let q2: any = admin.from("evaluator_forms").select("id", { count: "exact", head: true }).in("evaluator_id", memberIds).not("submitted_at", "is", null);
        let q3: any = admin.from("episodic_evaluations").select("id", { count: "exact", head: true }).in("evaluator_id", memberIds);
        if (range) {
          q1 = q1.gte("created_at",   range.start.toISOString()).lte("created_at",   range.end.toISOString());
          q2 = q2.gte("submitted_at", range.start.toISOString()).lte("submitted_at", range.end.toISOString());
          q3 = q3.gte("created_at",   range.start.toISOString()).lte("created_at",   range.end.toISOString());
        }
        const [{ count: ic }, { count: ec }, { count: epc }] = await Promise.all([q1, q2, q3]);
        ideasCount = ic ?? 0;
        evalsCount = ec ?? 0;
        episodicEvalsCount = epc ?? 0;
      }

      return {
        team: team.name,
        head: head?.name || "Unknown",
        member_count: members.length,
        members: members.map((m: any) => `${m.name} (${m.role})`),
        ideas_logged: ideasCount,
        one_liner_evaluations: evalsCount,
        episodic_evaluations: episodicEvalsCount,
        total_evaluations: evalsCount + episodicEvalsCount,
        period: args.period || "all time",
      };
    })
  );

  return teamList.length === 1 ? results[0] : results;
}

async function toolQueryOverview(_args: Record<string, never>, admin: AdminClient, scope: TeamScope = null) {
  // Build queries with optional team scoping
  let qProjects = admin.from("call_reports").select("id", { count: "exact", head: true }).eq("meeting_type", "call_report").is("archived_at", null);
  let qEpisodes = admin.from("episodes").select("id", { count: "exact", head: true }).eq("is_current", true);
  let qOlEvals  = admin.from("evaluator_forms").select("id", { count: "exact", head: true }).not("submitted_at", "is", null);
  let qEpEvals: any  = admin.from("episodic_evaluations").select("id", { count: "exact", head: true });
  let qTeams    = admin.from("teams").select("id", { count: "exact", head: true });
  let qContracts = admin.from("negotiations").select("id", { count: "exact", head: true });
  let qMeetings = admin.from("meetings").select("id", { count: "exact", head: true });

  if (scope) {
    qProjects = qProjects.eq("team_id", scope.teamId);
    if (scope.crIds) {
      qEpisodes = qEpisodes.in("call_report_id", scope.crIds);
      qOlEvals  = qOlEvals.in("call_report_id", scope.crIds);
      qContracts = qContracts.in("call_report_id", scope.crIds);
      // Get episode IDs for episodic evals
      const { data: teamEps } = await admin.from("episodes").select("id").in("call_report_id", scope.crIds);
      const epIds = (teamEps as any[] || []).map((e: any) => e.id);
      if (epIds.length > 0) qEpEvals = qEpEvals.in("episode_id", epIds);
      else qEpEvals = qEpEvals.eq("id", "00000000-0000-0000-0000-000000000000"); // no results
    }
    qTeams = qTeams.eq("id", scope.teamId);
    qMeetings = qMeetings.in("created_by", scope.memberIds);
  }

  // Writer count: for scoped users, count distinct writers from team's projects
  let totalWriters: number | null = 0;
  if (scope?.crIds && scope.crIds.length > 0) {
    const { data: teamCRs } = await admin.from("call_reports").select("writer_name").in("id", scope.crIds);
    const uniqueWriters = new Set((teamCRs as any[] || []).map((r: any) => r.writer_name?.toLowerCase()).filter(Boolean));
    totalWriters = uniqueWriters.size;
  } else if (!scope) {
    const { count } = await admin.from("writers").select("id", { count: "exact", head: true });
    totalWriters = count ?? 0;
  }

  const [
    { count: totalProjects },
    { count: totalEpisodes },
    { count: totalOneLinerEvals },
    { count: totalEpisodicEvals },
    { count: totalTeams },
    { count: totalContracts },
    { count: totalMeetings },
  ] = await Promise.all([qProjects, qEpisodes, qOlEvals, qEpEvals, qTeams, qContracts, qMeetings]);

  // This month counts
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let qIdeasMonth = admin.from("call_reports").select("id", { count: "exact", head: true }).eq("meeting_type", "call_report").is("archived_at", null).gte("created_at", monthStart);
  let qOlMonth    = admin.from("evaluator_forms").select("id", { count: "exact", head: true }).not("submitted_at", "is", null).gte("submitted_at", monthStart);
  let qEpMonth: any    = admin.from("episodic_evaluations").select("id", { count: "exact", head: true }).gte("created_at", monthStart);
  let qMeetMonth  = admin.from("meetings").select("id", { count: "exact", head: true }).gte("start_time", monthStart);

  if (scope) {
    qIdeasMonth = qIdeasMonth.eq("team_id", scope.teamId);
    if (scope.crIds) {
      qOlMonth = qOlMonth.in("call_report_id", scope.crIds);
      const { data: teamEps } = await admin.from("episodes").select("id").in("call_report_id", scope.crIds);
      const epIds = (teamEps as any[] || []).map((e: any) => e.id);
      if (epIds.length > 0) qEpMonth = qEpMonth.in("episode_id", epIds);
      else qEpMonth = qEpMonth.eq("id", "00000000-0000-0000-0000-000000000000");
    }
    qMeetMonth = qMeetMonth.in("created_by", scope.memberIds);
  }

  const [
    { count: ideasThisMonth },
    { count: olEvalsThisMonth },
    { count: epEvalsThisMonth },
    { count: meetingsThisMonth },
  ] = await Promise.all([qIdeasMonth, qOlMonth, qEpMonth, qMeetMonth]);

  return {
    all_time: {
      total_projects: totalProjects ?? 0,
      total_episodes_received: totalEpisodes ?? 0,
      total_one_liner_evaluations: totalOneLinerEvals ?? 0,
      total_episodic_evaluations: totalEpisodicEvals ?? 0,
      total_writers: totalWriters ?? 0,
      total_teams: totalTeams ?? 0,
      total_contracts: totalContracts ?? 0,
      total_meetings: totalMeetings ?? 0,
    },
    this_month: {
      ideas_logged: ideasThisMonth ?? 0,
      one_liner_evaluations: olEvalsThisMonth ?? 0,
      episodic_evaluations: epEvalsThisMonth ?? 0,
      meetings_scheduled: meetingsThisMonth ?? 0,
    },
  };
}

async function toolQueryContractsPayments(
  args: { writer_name?: string; project_title?: string; period?: string; status?: string },
  admin: AdminClient,
  scope: TeamScope = null
) {
  const range = parsePeriod(args.period);

  // Resolve project title and/or writer name to call_report IDs upfront
  // so we filter at the DB level instead of post-query (avoids missing data beyond LIMIT)
  let titleCrIds: string[] | null = null;
  if (args.project_title || args.writer_name) {
    let cq: any = admin.from("call_reports").select("id, working_title, writer_name").eq("meeting_type", "call_report");
    if (args.project_title) cq = cq.ilike("working_title", fuzzy(args.project_title));
    if (args.writer_name)   cq = cq.ilike("writer_name", fuzzy(args.writer_name));
    const { data: matched } = await cq;
    titleCrIds = (matched as any[] || []).map((r: any) => r.id);
    if (titleCrIds.length === 0) return { period: args.period || "all time", contracts: { count: 0, items: [] }, payments: { count: 0, total_paid: 0, total_pending: 0, items: [] } };
  }

  // Combine scope + title filters
  const effectiveCrIds = titleCrIds && scope?.crIds
    ? titleCrIds.filter(id => scope.crIds!.includes(id))
    : titleCrIds || scope?.crIds || null;

  // Query negotiations (contract terms)
  let nq: any = admin.from("negotiations")
    .select("id, call_report_id, per_episode_rate, estimated_episodes, total_cost, expected_completion_date, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (effectiveCrIds) nq = nq.in("call_report_id", effectiveCrIds);
  if (range) nq = nq.gte("created_at", range.start.toISOString()).lte("created_at", range.end.toISOString());

  const { data: negotiations } = await nq;
  const negList = negotiations as any[] || [];

  // Enrich with project titles and writer names
  const crIds = [...new Set(negList.map((n: any) => n.call_report_id))];
  const { data: crs } = crIds.length
    ? await admin.from("call_reports").select("id, working_title, writer_name").in("id", crIds)
    : { data: [] };
  const crMap = new Map((crs as any[] || []).map((c: any) => [c.id, c]));

  const items = negList.map((n: any) => {
    const cr = crMap.get(n.call_report_id) || {} as any;
    return {
      project: cr.working_title || "Unknown",
      writer: cr.writer_name || "Unknown",
      per_episode_rate: n.per_episode_rate,
      estimated_episodes: n.estimated_episodes,
      total_cost: n.total_cost,
      deadline: n.expected_completion_date || null,
      date: n.created_at ? fmtDate(n.created_at) : "",
    };
  });

  // Payment summary
  let pq: any = admin.from("payments")
    .select("id, amount, status, payment_date, call_report_id")
    .order("payment_date", { ascending: false })
    .limit(500);
  if (effectiveCrIds) pq = pq.in("call_report_id", effectiveCrIds);
  if (range) pq = pq.gte("payment_date", range.start.toISOString()).lte("payment_date", range.end.toISOString());
  if (args.status) pq = pq.eq("status", args.status.toLowerCase());
  const { data: payments } = await pq;
  const payList = payments as any[] || [];

  // Enrich payments with project names
  const payCrIds = [...new Set(payList.map((p: any) => p.call_report_id).filter(Boolean))];
  const { data: payCrs } = payCrIds.length
    ? await admin.from("call_reports").select("id, working_title, writer_name").in("id", payCrIds)
    : { data: [] };
  const payCrMap = new Map((payCrs as any[] || []).map((c: any) => [c.id, c]));

  const payItems = payList.map((p: any) => {
    const cr = payCrMap.get(p.call_report_id) || {} as any;
    return {
      project: cr.working_title || "Unknown",
      writer: cr.writer_name || "Unknown",
      amount: p.amount,
      status: p.status,
      date: p.payment_date ? fmtDate(p.payment_date) : "",
    };
  });

  const totalPaid = payItems.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payItems.filter(p => p.status !== "paid").reduce((s, p) => s + (p.amount || 0), 0);

  return {
    period: args.period || "all time",
    contracts: { count: items.length, items: items.slice(0, 30) },
    payments: {
      count: payItems.length,
      total_paid: totalPaid,
      total_pending: totalPending,
      items: payItems.slice(0, 30),
    },
  };
}

async function toolQueryWriters(
  args: { writer_name?: string; period?: string },
  admin: AdminClient,
  scope: TeamScope = null
) {
  const range = parsePeriod(args.period);

  let wq: any = admin.from("writers").select("id, name, phone, email, created_at").order("name");
  if (args.writer_name) wq = wq.ilike("name", fuzzy(args.writer_name));
  const { data: writerRows } = await wq;
  const writers = writerRows as any[] || [];
  if (writers.length === 0) return { message: args.writer_name ? `No writer found matching "${args.writer_name}"` : "No writers in the system", count: 0 };

  // Get project and episode data from consolidated_cms_view (same source as all portal pages)
  let cq: any = admin.from("consolidated_cms_view")
    .select("id, working_title, writer_name, created_at, actual_received_episodes, received_episodes, team_id");
  if (scope) cq = cq.eq("team_id", scope.teamId);
  if (range) cq = cq.gte("created_at", range.start.toISOString()).lte("created_at", range.end.toISOString());
  const { data: allCRs } = await cq;
  const crList = allCRs as any[] || [];

  // Build writer stats
  const writerStats = writers.map((w: any) => {
    const writerProjects = crList.filter((cr: any) =>
      cr.writer_name?.toLowerCase().includes(w.name.toLowerCase())
    );
    const totalEps = writerProjects.reduce((s, cr) => s + (cr.actual_received_episodes || cr.received_episodes || 0), 0);
    return {
      name: w.name,
      phone: w.phone || null,
      email: w.email || null,
      projects: writerProjects.length,
      project_titles: writerProjects.slice(0, 10).map((cr: any) => cr.working_title),
      episodes_delivered: totalEps,
    };
  }).sort((a, b) => b.projects - a.projects);

  // Team-scoped: only show writers who have projects with this team
  const filtered = scope ? writerStats.filter((w) => w.projects > 0) : writerStats;

  return {
    count: filtered.length,
    period: args.period || "all time",
    writers: filtered.slice(0, 40),
  };
}

async function toolQueryMeetings(
  args: { person_name?: string; period?: string },
  admin: AdminClient,
  scope: TeamScope = null
) {
  const range = parsePeriod(args.period);

  let q: any = admin.from("meetings")
    .select("id, title, start_time, end_time, created_by, attendees")
    .order("start_time", { ascending: false })
    .limit(200);
  if (scope) q = q.in("created_by", scope.memberIds);
  if (range) {
    q = q.gte("start_time", range.start.toISOString()).lte("start_time", range.end.toISOString());
  }

  const { data: meetings } = await q;
  const meetList = meetings as any[] || [];

  // Get user names for created_by
  const userIds = [...new Set(meetList.map((m: any) => m.created_by).filter(Boolean))];
  const { data: userRows } = userIds.length
    ? await admin.from("users").select("id, name").in("id", userIds)
    : { data: [] };
  const userMap = new Map((userRows as any[] || []).map((u: any) => [u.id, u.name]));

  let items = meetList.map((m: any) => ({
    title: m.title || "Untitled Meeting",
    date: m.start_time ? fmtDate(m.start_time) : "",
    time: m.start_time ? new Date(m.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
    created_by: userMap.get(m.created_by) || "Unknown",
    attendees: Array.isArray(m.attendees) ? m.attendees.length : 0,
  }));

  if (args.person_name) {
    const search = args.person_name.toLowerCase();
    items = items.filter(m => m.created_by.toLowerCase().includes(search));
  }

  return {
    count: items.length,
    period: args.period || "all time",
    items: items.slice(0, 30),
  };
}

async function toolQueryApprovals(
  args: { project_title?: string; status?: string; period?: string },
  admin: AdminClient,
  scope: TeamScope = null
) {
  const range = parsePeriod(args.period);

  let q: any = admin.from("story_approvals")
    .select("id, call_report_id, status, approved_by, comments, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (scope?.crIds) q = q.in("call_report_id", scope.crIds);
  if (args.status) q = q.eq("status", args.status.toLowerCase());
  if (range) q = q.gte("created_at", range.start.toISOString()).lte("created_at", range.end.toISOString());

  const { data: approvals } = await q;
  const appList = approvals as any[] || [];

  // Enrich with project titles and approver names
  const crIds = [...new Set(appList.map((a: any) => a.call_report_id))];
  const approverIds = [...new Set(appList.map((a: any) => a.approved_by).filter(Boolean))];

  const [{ data: crs }, { data: approvers }] = await Promise.all([
    crIds.length ? admin.from("call_reports").select("id, working_title, writer_name").in("id", crIds) : { data: [] },
    approverIds.length ? admin.from("users").select("id, name").in("id", approverIds) : { data: [] },
  ]);

  const crMap = new Map((crs as any[] || []).map((c: any) => [c.id, c]));
  const approverMap = new Map((approvers as any[] || []).map((u: any) => [u.id, u.name]));

  let items = appList.map((a: any) => {
    const cr = crMap.get(a.call_report_id) || {} as any;
    return {
      project: cr.working_title || "Unknown",
      writer: cr.writer_name || "Unknown",
      status: a.status,
      approved_by: approverMap.get(a.approved_by) || "Unknown",
      comments: a.comments || null,
      date: a.created_at ? fmtDate(a.created_at) : "",
    };
  });

  if (args.project_title) items = items.filter(i => i.project.toLowerCase().includes(args.project_title!.toLowerCase()));

  const approved = items.filter(i => i.status === "approved").length;
  const rejected = items.filter(i => i.status === "rejected").length;

  return {
    count: items.length,
    approved,
    rejected,
    period: args.period || "all time",
    items: items.slice(0, 30),
  };
}

async function executeTool(name: string, args: any, admin: AdminClient, scope: TeamScope = null): Promise<any> {
  // Pre-populate team CR IDs once for scoped access (cached across multiple tool calls)
  if (scope && !scope.crIds) {
    const { data } = await admin.from("call_reports").select("id").eq("team_id", scope.teamId);
    scope.crIds = (data as any[] || []).map((r: any) => r.id);
  }

  switch (name) {
    case "query_evaluations":        return toolQueryEvaluations(args, admin, scope);
    case "query_content":            return toolQueryContent(args, admin, scope);
    case "query_person_activity":    return toolQueryPersonActivity(args, admin, scope);
    case "query_episode_delivery":   return toolQueryEpisodeDelivery(args, admin, scope);
    case "query_pending":            return toolQueryPending(args, admin, scope);
    case "query_team_stats":         return toolQueryTeamStats(args, admin, scope);
    case "query_overview":           return toolQueryOverview(args, admin, scope);
    case "query_contracts_payments": return toolQueryContractsPayments(args, admin, scope);
    case "query_writers":            return toolQueryWriters(args, admin, scope);
    case "query_meetings":           return toolQueryMeetings(args, admin, scope);
    case "query_approvals":          return toolQueryApprovals(args, admin, scope);
    default:                         return { error: `Unknown tool: ${name}` };
  }
}

// ─── System prompts ────────────────────────────────────────────────────────────
const TOOL_SELECTION_PROMPT = `You are a data routing assistant for Dastaan Portal at GEO TV. Your ONLY job is to pick the right tool and arguments for the user's question, then output valid JSON.

AVAILABLE TOOLS:
1. query_evaluations — Search evaluations. Args: evaluator_name?, project_title?, period?
2. query_content — Search call reports/ideas. Args: search?, team_name?, period?
3. query_person_activity — Full activity summary for a person. Args: person_name (required), period?
4. query_episode_delivery — Episode delivery status. Args: project_title?, writer_name?, status?
5. query_pending — Pending evaluations/approvals. Args: type? ("evaluations"|"approvals"|"all")
6. query_team_stats — Team membership & performance. Args: team_name?, period?

ROUTING RULES:
- "how many evaluations did X do / what did X score" → query_evaluations
- "what has X been doing / X's activity / X's work" → query_person_activity
- "which projects are behind / delivery status / episodes" → query_episode_delivery
- "how many ideas / stories logged / call reports" → query_content
- "pending evaluations / unapproved ideas" → query_pending
- "who is on team X / team performance / list teams" → query_team_stats

PERIOD VALUES: this_month, last_month, this_year, last_7_days, last_30_days, last_2_weeks, last_3_months, last_1_year

You MUST respond with ONLY a JSON object, no explanation, no markdown, no thinking tags:
{"tool": "tool_name", "args": {"param": "value"}}

If the question needs multiple tools, return an array:
[{"tool": "tool_name", "args": {...}}, {"tool": "tool_name", "args": {...}}]

If it is purely a navigation question (how do I, where is), respond with:
{"tool": "none", "answer": "your answer here"}`;

const SHARED_CONTEXT = `
ABOUT DASTAAN PORTAL:
Dastaan (meaning "Story" in Urdu) is a story development management system for a Pakistani media organisation (GEO TV). It manages the full lifecycle of a TV drama — from the initial idea/pitch, through writer engagement meetings, script evaluations, approval, contract signing, and episode delivery.

KEY TERMINOLOGY (memorise these — users will use them interchangeably):
- Story / Project: A TV drama or show idea being developed. Has a working title, writer, slot (TV broadcast time), content type (Serial, Telefilm, Mini-serial, Ramadan Serial, etc.), and goes through multiple workflow stages.
- Call Report / Writer Engagement Report / One-Liner (as a DOCUMENT): All three names mean the EXACT same thing — a post-meeting report written after a session with a writer. It includes logline, synopsis, genre, theme, target slot, discussion notes, and next steps. Mirror whatever term the user uses.
- One-Liner Evaluation / Evaluating a One-Liner: A SEPARATE scored assessment attached to a call report. Not the same as the call report itself. Evaluators score 5 criteria each 1–10.
- Detailed One-Liner: A deep structured analysis form (Plot, Emotional Arena, Character Relationships, Narrative Breakdown, etc.) attached to an existing call report. Completely different from logging a basic call report.
- Episodic Evaluation: A scored assessment of actual episode scripts delivered by a writer.
- Slot: TV broadcast time slot (e.g. 7 PM, 9 PM).
- Team Head: Senior person leading a content/evaluation team.
- Episode Delivery: Writers submit episode scripts in batches; the system tracks received vs required vs deadline.
- Contract Terms: Per-episode payment rate and payment structure agreed with a writer.
- Cross-Team Share: When one team shares a call report or episode with another team for their review/evaluation.

CRITICAL DISTINCTIONS — never confuse these:
1. SCHEDULING / LOGGING A MEETING → Calendar only. Click a time slot. No other section can create meetings.
2. LOGGING A CALL REPORT / ONE-LINER / WRITER ENGAGEMENT REPORT (the post-meeting document) → Writer Engagement Reports section → click "Log New Writer Engagement Report" (or "Log New Report").
3. LOG DETAILED ONE-LINER → A completely separate deep-analysis form for an EXISTING call report. Not for basic logging.
`;

const PORTAL_KNOWLEDGE: Record<string, { name: string; role: string; overview: string; features: string }> = {
  programmer: {
    name: "Programmer Portal",
    role: "Programmers are senior team members who oversee content development, evaluate writers, and monitor episode delivery across all content teams. They have global access to all teams' data.",
    overview: "The Programmer Portal is where programmers oversee the full content development pipeline at GEO TV. Your main work is reviewing and scoring writer pitches (call reports / one-liners), tracking whether writers are delivering episode scripts on time via Content Aging, logging post-meeting reports, managing contract terms, and monitoring the Idea Roadmap. The Dashboard gives you a live snapshot of pending evaluations, recent reports, and quick links to your most common tasks.",
    features: `
SIDEBAR SECTIONS — EXACT DETAILS:

━━ DASHBOARD ━━
Home screen. Four stat cards: Total Evaluations, My Evaluations, Total Writer Engagement Reports, Scheduled Meetings. Recent One-Liners card (last 5 call reports). Recent Evaluations card. Quick actions: Log Writer Engagement Report, Schedule a Meeting, Evaluate Projects, View All Reports.

━━ CALENDAR ━━
The ONLY place to schedule or log a meeting. Click any empty time slot to open the Quick Meeting Dialog. Toggle Day/Week/Month views. Click any existing meeting to open the Meeting Peek Panel.

━━ WRITERS ━━
Full list of all writers with engagement tracking stats. Click any writer to view their profile.

━━ WRITER ENGAGEMENT REPORTS ━━
Log post-meeting reports (also called "call report" or "one-liner"). Button: "Log New Writer Engagement Report". Report form fields: Logged By, Source of Idea, Writers/Originators, Working Title, Director, Total Episodes, Logline, Synopsis, Genre, Theme, Target Slot, Content Type, Notes, Next Steps, file attachments. Form auto-saves drafts.

━━ ONE-LINER EVALUATIONS ━━
Browse and submit scored evaluations of call reports. Toggle: All Projects or Evaluated. "Evaluated" shows all call reports that any programmer on the team has already evaluated — each card shows evaluator badge pills with name and score. Clicking a card in "Evaluated" opens the filled evaluation form in read-only mode; an Edit button appears only for the programmer who originally submitted the evaluation.

━━ STORY FEEDBACK ━━
Where programmers log written feedback about specific stories (call reports). Each feedback entry has: a date, a linked story (searchable by title or writer name), free-form feedback text (multi-line), and optional file attachments (PDFs, Word, Excel, PowerPoint, images, up to 20 files × 20 MB each). Entries are shown grouped by date in reverse-chronological order. Search across story title, feedback text, and writer name. Only the programmer who created an entry can edit or delete it. To add feedback: click "Add Story Feedback", select the story, write feedback, optionally attach files, then save.

━━ EPISODES ━━
Three tabs: Episodes List, Log Episodes, My Evaluations. Episodes grouped by project with collapsible rows.

━━ STATUS REPORT ━━
Delivery status board: ON TRACK, BEHIND, or FULLY RECEIVED per project.

━━ CONTRACT TERMS ━━
Contract terms/negotiations linked to stories. Create new or view existing.

━━ CONTENT AGING ━━
Analytics dashboard: sticky project list + evaluator scores + week-by-week episode delivery columns.

━━ FEEDBACK TIMELINE ━━
Chronological feedback given to writers across all projects.

━━ IDEA ROADMAP ━━
Pipeline view grouped by workflow stage.

━━ CROSS-TEAM SHARES ━━
Tracks shared call reports and episodes across teams.

━━ NOTIFICATIONS ━━
Alerts for new assignments, status changes, evaluation completions.`,
  },

  content_department: {
    name: "Content Department Portal",
    role: "Content Department users work directly with writers — they schedule meetings, log post-meeting reports, and track episode submissions for their team.",
    overview: "The Content Department Portal is where your team works directly with writers. You schedule meetings on the Calendar, log post-meeting reports in Writer Engagement Reports, and track episode submissions in Episodes.",
    features: `
SIDEBAR SECTIONS — EXACT DETAILS:

━━ DASHBOARD ━━
Stat cards: Scheduled Meetings, Writer Engagement Reports, Episodes Logged, Total Stories. Quick actions and Upcoming Meetings card.

━━ CALENDAR ━━
The ONLY place to schedule or log a meeting. Click any empty time slot. Toggle Day/Week/Month views.

━━ WRITERS ━━
Writers assigned to your team with engagement tracking. Click to see profile.

━━ WRITER ENGAGEMENT REPORTS ━━
Log post-meeting reports. Button: "Log New Report". Fields: Logged By, Source of Idea, Writers/Originators, Working Title, Director, Total Episodes, Logline, Synopsis, Genre, Theme, Slot, Content Type, Notes, Next Steps, file attachments. Form auto-saves drafts. No "Log Detailed One-Liner" button in this portal.

━━ EPISODES ━━
Two tabs: Episodes List, Log Episodes. Log new episodes with file upload and Initial Assessment score (1-10).

━━ NOTIFICATIONS ━━
Alerts for new assignments and feedback.`,
  },

  evaluator: {
    name: "Evaluator Portal",
    role: "Evaluators score writer call reports and episode scripts. They submit one-liner evaluations and episodic evaluations, collaborate within their team, and handle cross-team shares.",
    overview: "The Evaluator Portal is built for scoring. Your core tasks are evaluating writer pitches (one-liner evaluations) and episode scripts (episodic evaluations) assigned to you.",
    features: `
SIDEBAR SECTIONS — EXACT DETAILS:

━━ DASHBOARD ━━
Stat cards: Pending Evaluations, Completed Evaluations, Total Writer Engagement Reports, Scheduled Meetings. Pending and completed evaluation cards. Quick actions.

━━ CALENDAR ━━
The ONLY place to schedule or log a meeting.

━━ WRITERS ━━
Browse writer profiles before evaluating their work.

━━ TEAM ━━
View all members of your evaluation team and their activity.

━━ WRITER ENGAGEMENT REPORTS ━━
Log post-meeting reports. Button: "Log New Writer Engagement Report". Click any report then "Evaluate" to score it.

━━ ONE-LINER EVALUATIONS ━━
Two tabs: Pending Evaluations and Completed Evaluations. Score call reports on 5 criteria each 1-10.

━━ INCOMING EVALUATIONS ━━
Call reports shared from other teams for cross-team review.

━━ EPISODES ━━
Three tabs: Episodes List, Log Episodes, My Evaluations. Evaluate episode scripts from here.

━━ NOTIFICATIONS ━━
Alerts for new evaluation requests and cross-team shares.`,
  },

  management: {
    name: "Management Portal",
    role: "Management users are senior executives at GEO TV with global read access to all teams, all projects, all evaluations, and all financial data. They oversee, track, and approve.",
    overview: "The Management Portal is an oversight and decision-making view. Your work is reviewing approval requests in Approval Tracking, monitoring episode delivery in Content Aging, tracking team performance in Teams, and getting a full pipeline view from the Dashboard.",
    features: `
SIDEBAR SECTIONS — EXACT DETAILS:

━━ DASHBOARD ━━
Executive Summary with six stat cards: Active Projects, Pipeline Value (PKR), Active Contracts, Overdue Payments, Weekly Activities, Approval Tracking. Export button (PNG/PDF). Below: Critical Alerts, Team-wise Projects, Team Performance, Scripting & Episode Evaluation, Pipeline Overview, Evaluator Performance, Contract Terms, Writer Financials.

━━ CALENDAR ━━
The ONLY place to schedule or view meetings. Default Week view.

━━ WRITER ENGAGEMENT ━━
Writer Engagement Tracker — log engagement sessions per writer (not full call reports).

━━ WHAT'S COOKING ━━
Visual analytics: genre breakdown, slot allocation, rating distribution, episode progress. Read-only.

━━ SCRIPT BANK ━━
Two tabs: Writer Engagement Reports (all as cards) and Episodes (all linked episodes). Browse only.

━━ IDEA ROADMAP ━━
Ideas grouped by workflow stage. Search and filter. Click to open detail modal.

━━ PROJECT STATUS ━━
Live table of active ideas with status dropdowns (read-only for management), rating, episodes, completion.

━━ APPROVAL TRACKING ━━
Two tabs: One-Liners and Episodes. Review evaluated stories, approve/reject. "My Decisions" section shows past approvals.

━━ EVALUATIONS ━━
Four tabs: Overview, Internal Evaluations, Overall, External Evaluations. Generate external evaluation links.

━━ EVALUATIONS BY STORY ━━
Per-story score breakdown by evaluator and team.

━━ CONTENT AGING ━━
Two tabs: Content Aging (full weekly delivery grid + evaluator scores) and Target Aging (simplified). Export to Excel.

━━ CROSS-TEAM SHARES TRACKING ━━
Monitor cross-team share requests: status, completion, time taken.

━━ TEAMS ━━
Team Performance Analytics: overview stats, charts, detailed comparison, Team Accountability, Key Personnel Activity (visible only to mir@geo.tv).`,
  },
};

function buildSystemPrompt(portalKey: string): string {
  const portal = PORTAL_KNOWLEDGE[portalKey] ?? PORTAL_KNOWLEDGE.programmer;
  return `You are a helpful navigation assistant embedded inside Dastaan Portal, a story development management system for GEO TV (a Pakistani TV media organisation).

${SHARED_CONTEXT}

WHO YOU ARE TALKING TO:
${portal.role}
They are currently in the ${portal.name}.

${portal.features}

PORTAL OVERVIEW:
${portal.overview}

HOW TO RESPOND:
- Be conversational and direct. Always name the exact sidebar section.
- Keep answers to 2–4 sentences. Never invent features not listed above.
- Respond in plain text — no bullet points or markdown.
- Mirror the user's terminology.
- NEVER say meetings can be created anywhere other than the Calendar.
- For anything unrelated to the portal, politely decline.
- For technical issues, direct to Rao Muhammad at rao.muhammad@geo.tv or +92 313 2909993.`;
}

// ─── LLM helper (Gemini OpenAI-compatible API) ────────────────────────────────
async function callLLM(apiKey: string, body: object): Promise<any> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${err}`);
  }
  return res.json();
}

// ─── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const { data: profile } = await supabase
      .from("users").select("role, email, team_id, name").eq("id", user.id).single();

    const role = profile?.role ?? "";
    const isUnrestricted = ["admin", "management"].includes(role);

    const body = await request.json();
    const { message, portalKey, history = [], memory = [] } = body as {
      message: string;
      portalKey: string;
      history: { role: "user" | "assistant"; content: string }[];
      memory: string[];
    };

    if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: "The AI assistant isn't configured yet. Please add a GEMINI_API_KEY." });

    // ── Users without a team and not admin/management → navigation-only ──────
    if (!isUnrestricted && !profile?.team_id) {
      const messages = [
        { role: "system", content: buildSystemPrompt(portalKey) },
        ...history.slice(-6),
        { role: "user", content: message.trim() },
      ];
      try {
        const data = await callLLM(apiKey, { model: MODEL, messages, max_tokens: 400, temperature: 0.4 });
        return NextResponse.json({ reply: data.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response." });
      } catch {
        return NextResponse.json({ reply: "Sorry, I ran into an issue. Please try again." });
      }
    }

    // ── Set up team scope for non-admin users ────────────────────────────────
    let scope: TeamScope = null;
    let teamName = "";
    let teamMemberNames: string[] = [];
    if (!isUnrestricted && profile?.team_id) {
      const adminForScope = createAdminClient();
      const [{ data: teamMembers }, { data: teamRow }] = await Promise.all([
        adminForScope.from("users").select("id, name, role").eq("team_id", profile.team_id),
        adminForScope.from("teams").select("name").eq("id", profile.team_id).single(),
      ]);
      const members = teamMembers as any[] || [];
      teamName = teamRow?.name || "Unknown Team";
      const memberRoleLabels: Record<string, string> = {
        content_creator: "Content Creator", content_manager: "Content Manager",
        evaluator: "Evaluator", programmer: "Programmer", gcm: "GCM",
        management: "Management", admin: "Admin", executive: "Executive",
      };
      teamMemberNames = members.map((m: any) => `${m.name} (${memberRoleLabels[m.role] || m.role})`);
      scope = {
        teamId: profile.team_id,
        memberIds: members.map((m: any) => m.id),
      };
    }

    // ── Determine available tools based on role ──────────────────────────────
    const ROLE_BLOCKED_TOOLS: Record<string, string[]> = {
      content_creator:  ["query_contracts_payments", "query_approvals"],
      content_manager:  ["query_contracts_payments", "query_approvals"],
      evaluator:        ["query_contracts_payments", "query_approvals"],
      gcm:              ["query_approvals"],
      programmer:       ["query_approvals"],
    };
    const blockedToolNames = isUnrestricted ? [] : (ROLE_BLOCKED_TOOLS[role] || ["query_approvals"]);
    const availableTools = DATA_TOOLS.filter(t => !blockedToolNames.includes(t.function.name));

    // ── Data-access agent — native function calling ──────────────────────────
    const userName = profile?.name || "User";
    const ROLE_LABELS: Record<string, string> = {
      content_creator: "Content Creator",
      content_manager: "Content Manager",
      evaluator: "Evaluator",
      programmer: "Programmer",
      gcm: "GCM",
      management: "Management",
      admin: "Admin",
      executive: "Executive",
      management_viewer: "Management Viewer",
    };
    const roleLabel = ROLE_LABELS[role] || role;
    const teamContext = scope
      ? `\nTeam: ${teamName}\nTeam members: ${teamMemberNames.join(", ")}`
      : "";
    const scopeNote = scope
      ? `\n\nIMPORTANT: The current user is ${userName} (${profile?.email || "unknown"}, role: ${roleLabel}).${teamContext}\nYou are serving a team member, NOT an executive. All data returned is scoped to their team only. If the user asks "who am I", tell them their name and role. If the user asks about their team or team members, use the info above. If the user asks about another team's data, other teams' performance, or people outside their team, do NOT call any tools — instead respond with a short message explaining that you can only access data for their own team. Respond: "I can only access data for your team. For information about other teams, please contact management."`
      : `\n\nThe current user is ${userName} (${profile?.email || "unknown"}, role: ${roleLabel}).`;

    const DATA_SYSTEM = `You are a data assistant for Dastaan Portal at GEO TV.${scopeNote}

WHEN TO CALL TOOLS:
- Call tools when the user asks a NEW question that requires fresh data from the database.
- Call MULTIPLE tools for broad or ambiguous questions.
- NEVER guess or make up numbers — if you need data you don't have, call the tool.

WHEN TO SKIP TOOLS (respond with text instead):
- If the conversation history already contains the answer (e.g., previous responses listed specific projects, scores, or counts), respond directly instead of re-querying.
- Follow-up questions like "list those projects", "which one scored highest?", "tell me more about the third one" should be answered from the prior conversation.
- Previous assistant messages may contain <!-- data-digest ... --> blocks with raw data from that turn — use these to answer follow-ups accurately.

TOOL ROUTING GUIDE:
- Overall summary / big picture / how are we doing → query_overview
- Evaluation scores, counts, highest rated → query_evaluations
- Person's work / activity / what has X done → query_person_activity
- Episode delivery / behind / received → query_episode_delivery
- Pending evaluations or approvals → query_pending
- Team info, members, performance → query_team_stats
- Call reports, ideas logged, ideas logged BY a person → query_content (use logged_by param for the person who created the report)
- Contracts, payments, money, rates → query_contracts_payments
- Writers list, writer engagement → query_writers
- Meetings, calendar → query_meetings
- Story approvals, approved/rejected → query_approvals

IMPORTANT: If the question is ambiguous or broad AND requires new data, call MULTIPLE tools. For example:
- "How are things going?" → query_overview + query_pending + query_episode_delivery
- "Tell me about project X" → query_evaluations(project_title=X) + query_episode_delivery(project_title=X) + query_contracts_payments(project_title=X)
- "How is the team performing?" → query_team_stats + query_evaluations`;

    const memoryContext = memory.length > 0
      ? `\n\nRELEVANT MEMORY FROM PAST CONVERSATIONS:\n${memory.slice(-20).map((m, i) => `${i + 1}. ${m}`).join("\n")}`
      : "";

    const NARRATION_SYSTEM = scope
      ? `You are a helpful data assistant for Dastaan Portal at GEO TV, briefing a team member on their team's data. Present data clearly using markdown.

FORMATTING RULES:
- Start with a one-line summary sentence answering the question directly.
- When there are 3+ items, use a markdown table.
- Use **bold** for key numbers, names, and statuses.
- Use ### headings to separate sections when needed.
- For 1-2 items, a short paragraph is fine.
- Mark statuses with labels: "Behind", "On Track", "Complete".

CONTENT RULES:
- Lead with the direct answer in the first sentence.
- All data shown is scoped to the user's team — do not mention "all teams" or imply global scope.
- Use actual names — never UUIDs or IDs.
- If results are empty, say so plainly and suggest why.
- Keep it concise and helpful.
- Use the conversation history to connect follow-up answers to prior context.

MEMORY EXTRACTION:
After your main answer, on a new line output a memory block:
<memory>["fact 1", "fact 2"]</memory>
Extract 1-3 key facts. If nothing noteworthy: <memory>[]</memory>.`
      : `You are a senior analyst briefing the CEO of GEO TV on data from the Dastaan content portal. Present data in a clear, structured, professional format using markdown.

FORMATTING RULES:
- Start with a one-line summary sentence answering the question directly.
- When there are 3+ items, ALWAYS use a markdown table. Example:
  | Project | Score | Evaluator | Date |
  |---------|-------|-----------|------|
  | Kabhi kabhi | 8.6 | Parisa | May 6, 2026 |
- Use **bold** for key numbers, names, and statuses.
- Use ### headings to separate sections (e.g. "### One-Liner Evaluations" and "### Episodic Evaluations").
- For 1-2 items, a short paragraph is fine — no table needed.
- When showing per-person summaries, use a table with columns like Name, One-Liner Count, Episodic Count, Total, Avg Score.
- When showing delivery status, use a table with Project, Writer, Required, Received, Status.
- Mark statuses with labels: "Behind", "On Track", "Complete".

CONTENT RULES:
- Lead with the direct answer in the first sentence.
- Break down totals by category when relevant.
- Use actual names — never UUIDs or IDs.
- Format episodes as "Episode [number] of [Project Title]".
- If results are empty, say so plainly and suggest why.
- If multiple people matched a name, list each separately.
- Keep it concise — this is an executive briefing.
- Use the conversation history to connect follow-up answers to prior context.
- Use memory from past conversations for richer context when relevant.

MEMORY EXTRACTION:
After your main answer, on a new line output a memory block:
<memory>["fact 1", "fact 2"]</memory>
Extract 1-3 key facts (scores, statuses, trends). If nothing noteworthy: <memory>[]</memory>.`;

    // Step 1: Ask LLM to pick and call tools (native function calling, tool_choice=auto)
    let firstPass: any;
    try {
      firstPass = await callLLM(apiKey, {
        model: MODEL,
        messages: [
          { role: "system", content: DATA_SYSTEM },
          ...history.slice(-16),
          { role: "user", content: message.trim() },
        ],
        tools: availableTools,
        tool_choice: "auto",
        max_tokens: 4096,
        temperature: 0.1,
      });
    } catch (err: any) {
      console.error("[AI Agent] First-pass error:", err.message);
      return NextResponse.json({ reply: "Sorry, I ran into an issue. Please try again." });
    }

    const assistantMsg = firstPass.choices?.[0]?.message;
    const toolCalls = assistantMsg?.tool_calls;
    const historyForNarration = history.slice(-10).map(
      (m: { role: string; content: string }) => ({ role: m.role, content: m.content })
    );

    // If no tools called — LLM answered from conversation context
    if (!toolCalls || toolCalls.length === 0) {
      console.log("[AI Agent] No tools called — answering from conversation context");
      const directContent = assistantMsg?.content?.trim() || "";

      if (directContent.length > 0) {
        // Route through narration for consistent formatting
        let secondData: any;
        try {
          secondData = await callLLM(apiKey, {
            model: MODEL,
            messages: [
              { role: "system", content: NARRATION_SYSTEM },
              ...historyForNarration,
              { role: "user", content: `User's question: ${message.trim()}${memoryContext}\n\nContext from prior conversation (no new data fetched):\n\n${directContent}` },
            ],
            max_tokens: 4096,
            temperature: 0.3,
          });
        } catch {
          return NextResponse.json({ reply: directContent });
        }

        let fullReply = secondData.choices?.[0]?.message?.content?.trim() ?? directContent;
        let memoryExtract: string[] = [];
        const memoryMatch = fullReply.match(/<memory>([\s\S]*?)<\/memory>/);
        if (memoryMatch) {
          try { memoryExtract = JSON.parse(memoryMatch[1]); } catch {}
          fullReply = fullReply.replace(/<memory>[\s\S]*?<\/memory>/, "").trim();
        }
        return NextResponse.json({ reply: fullReply, memoryExtract });
      }

      return NextResponse.json({ reply: "I couldn't determine what data to look up. Could you rephrase your question?" });
    }

    console.log("[AI Agent] Tools called:", toolCalls.map((tc: any) => tc.function.name).join(", "));

    // Step 2: Execute the selected tools (with team scope applied)
    const admin = createAdminClient();
    const toolResults: { name: string; data: string }[] = [];
    try {
      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments || "{}");
        const result = await executeTool(fnName, fnArgs, admin, scope);
        toolResults.push({ name: fnName, data: JSON.stringify(result) });
      }
    } catch (err: any) {
      console.error("[AI Agent] Tool execution error:", err.message);
      return NextResponse.json({ reply: "I had trouble fetching that data. Please try again." });
    }

    console.log("[AI Agent] Tool results size:", toolResults.reduce((s, r) => s + r.data.length, 0), "chars");

    // Step 3: Narrate the results with conversation history for continuity
    const dataContext = toolResults
      .map((tr) => `[${tr.name}]\n${tr.data}`)
      .join("\n\n");

    let secondData: any;
    try {
      secondData = await callLLM(apiKey, {
        model: MODEL,
        messages: [
          { role: "system", content: NARRATION_SYSTEM },
          ...historyForNarration,
          { role: "user", content: `User's question: ${message.trim()}${memoryContext}\n\nData retrieved from the database:\n\n${dataContext}` },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      });
    } catch (err: any) {
      console.error("[AI Agent] Narration error:", err.message);
      return NextResponse.json({ reply: "I got the data but had trouble formatting the response. Please try again." });
    }

    let fullReply = secondData.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";

    // Extract memory items from the response
    let memoryExtract: string[] = [];
    const memoryMatch = fullReply.match(/<memory>([\s\S]*?)<\/memory>/);
    if (memoryMatch) {
      try {
        memoryExtract = JSON.parse(memoryMatch[1]);
      } catch {}
      // Strip the memory tag from the visible reply
      fullReply = fullReply.replace(/<memory>[\s\S]*?<\/memory>/, "").trim();
    }

    // Embed a compact data digest as an HTML comment so follow-up turns can access raw data.
    // ReactMarkdown strips HTML comments — invisible to the user but persists in history.
    const compactResults = toolResults.map((tr) => {
      try {
        const parsed = JSON.parse(tr.data);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 20) {
          parsed.items = parsed.items.slice(0, 20);
          parsed._truncated = true;
        }
        if (parsed.recent_one_liner_items && parsed.recent_one_liner_items.length > 10) {
          parsed.recent_one_liner_items = parsed.recent_one_liner_items.slice(0, 10);
        }
        if (parsed.recent_episodic_items && parsed.recent_episodic_items.length > 10) {
          parsed.recent_episodic_items = parsed.recent_episodic_items.slice(0, 10);
        }
        if (parsed.writers && Array.isArray(parsed.writers) && parsed.writers.length > 20) {
          parsed.writers = parsed.writers.slice(0, 20);
          parsed._truncated = true;
        }
        return `[${tr.name}] ${JSON.stringify(parsed)}`;
      } catch {
        return `[${tr.name}] ${tr.data.slice(0, 2000)}`;
      }
    }).join("\n");
    fullReply += `\n\n<!-- data-digest\n${compactResults}\n-->`;

    return NextResponse.json({ reply: fullReply, memoryExtract });
  } catch (error) {
    console.error("Assistant chat error:", error);
    return NextResponse.json({ reply: "Something went wrong. Please try again." });
  }
}
