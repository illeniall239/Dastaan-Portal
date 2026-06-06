import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

const GROQ_URL  = "https://api.groq.com/openai/v1/chat/completions";
const MODEL      = "llama-3.3-70b-versatile"; // first pass — smart tool selection
const MODEL_FAST = "llama-3.1-8b-instant";    // second pass — narrates tool results

type AdminClient = ReturnType<typeof createAdminClient>;

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
        "Search call reports and ideas logged in the system. Use for: how many ideas were logged, find ideas by writer or team, what was submitted in a period.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Search term to match against project title or writer name.",
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
            description: "Filter by status: behind or received.",
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
];

// ─── Tool execution ────────────────────────────────────────────────────────────

async function toolQueryEvaluations(
  args: { evaluator_name?: string; project_title?: string; period?: string },
  admin: AdminClient
) {
  const range = parsePeriod(args.period);

  // Resolve evaluator(s)
  let userIds: string[] | null = null;
  let userNames: Record<string, string> = {};
  if (args.evaluator_name) {
    const { data } = await admin.from("users").select("id, name").ilike("name", `%${args.evaluator_name}%`);
    const found = data as any[] || [];
    if (found.length === 0) return { message: `No person found matching "${args.evaluator_name}"`, total: 0 };
    userIds = found.map((u: any) => u.id);
    for (const u of found) userNames[u.id] = u.name;
  }

  // Resolve project(s) for title filter
  let crIds: string[] | null = null;
  if (args.project_title) {
    const { data } = await admin.from("call_reports").select("id, working_title").ilike("working_title", `%${args.project_title}%`);
    const found = data as any[] || [];
    if (found.length === 0) return { message: `No project found matching "${args.project_title}"`, total: 0 };
    crIds = found.map((r: any) => r.id);
  }

  // Query both evaluation tables in parallel
  let q1: any = admin.from("evaluator_forms")
    .select("id, average_score, submitted_at, evaluator_id, call_report_id")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(100);
  let q2: any = admin.from("episodic_evaluations")
    .select("id, overall_average, created_at, evaluator_id, episode_id")
    .order("created_at", { ascending: false })
    .limit(100);

  if (userIds) { q1 = q1.in("evaluator_id", userIds); q2 = q2.in("evaluator_id", userIds); }
  if (crIds)   { q1 = q1.in("call_report_id", crIds); }
  if (range) {
    q1 = q1.gte("submitted_at", range.start.toISOString()).lte("submitted_at", range.end.toISOString());
    q2 = q2.gte("created_at",   range.start.toISOString()).lte("created_at",   range.end.toISOString());
  }

  const [{ data: oneLinerEvals }, { data: episodicEvals }] = await Promise.all([q1, q2]);
  const ol = oneLinerEvals as any[] || [];
  const ep = episodicEvals as any[] || [];

  // Collect all IDs needed for enrichment
  const olCrIds = [...new Set(ol.map((e: any) => e.call_report_id))];
  const epEpisodeIds = [...new Set(ep.map((e: any) => e.episode_id))];
  const olEvIds = [...new Set([...ol.map((e: any) => e.evaluator_id), ...ep.map((e: any) => e.evaluator_id)])];

  // Fetch episode details + call report titles in parallel
  const [{ data: crs }, { data: evalUsers }, { data: episodeRows }] = await Promise.all([
    olCrIds.length ? admin.from("call_reports").select("id, working_title").in("id", olCrIds) : { data: [] },
    olEvIds.length && !args.evaluator_name ? admin.from("users").select("id, name").in("id", olEvIds) : { data: [] },
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

  return {
    period: args.period || "all time",
    one_liner_evaluations: {
      count: ol.length,
      items: ol.slice(0, 20).map((e: any) => ({
        evaluator: userNames[e.evaluator_id] || e.evaluator_id,
        project: crMap.get(e.call_report_id) || "Unknown",
        score: e.average_score != null ? parseFloat(e.average_score).toFixed(1) : "N/A",
        date: e.submitted_at ? fmtDate(e.submitted_at) : "",
      })),
    },
    episodic_evaluations: {
      count: ep.length,
      items: ep.slice(0, 20).map((e: any) => {
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
    },
    total: ol.length + ep.length,
  };
}

async function toolQueryContent(
  args: { search?: string; team_name?: string; period?: string },
  admin: AdminClient
) {
  const range = parsePeriod(args.period);

  let teamIds: string[] | null = null;
  if (args.team_name) {
    const { data } = await admin.from("teams").select("id, name").ilike("name", `%${args.team_name}%`);
    const found = data as any[] || [];
    if (found.length === 0) return { message: `No team found matching "${args.team_name}"`, count: 0 };
    teamIds = found.map((t: any) => t.id);
  }

  let q: any = admin.from("call_reports")
    .select("id, working_title, writer_name, created_at, team_id")
    .eq("meeting_type", "call_report")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (args.search) q = q.or(`working_title.ilike.%${args.search}%,writer_name.ilike.%${args.search}%`);
  if (teamIds)     q = q.in("team_id", teamIds);
  if (range)       q = q.gte("created_at", range.start.toISOString()).lte("created_at", range.end.toISOString());

  const { data: reports } = await q;
  const list = reports as any[] || [];

  const tidSet = [...new Set(list.map((r: any) => r.team_id).filter(Boolean))];
  const teamMap = new Map<string, string>();
  if (tidSet.length) {
    const { data: teams } = await admin.from("teams").select("id, name").in("id", tidSet);
    for (const t of (teams as any[] || [])) teamMap.set(t.id, t.name);
  }

  return {
    count: list.length,
    period: args.period || "all time",
    items: list.map((r: any) => ({
      title: r.working_title || "Untitled",
      writer: r.writer_name || "Unknown",
      team: teamMap.get(r.team_id) || "Unknown",
      logged_at: r.created_at ? fmtDate(r.created_at) : "",
    })),
  };
}

async function toolQueryPersonActivity(
  args: { person_name: string; period?: string },
  admin: AdminClient
) {
  const { data: found } = await admin.from("users").select("id, name, role, email").ilike("name", `%${args.person_name}%`).limit(5);
  const people = found as any[] || [];
  if (people.length === 0) return { message: `No person found matching "${args.person_name}"` };

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
  admin: AdminClient
) {
  let q: any = admin.from("call_reports")
    .select("id, working_title, writer_name, total_episodes")
    .eq("meeting_type", "call_report")
    .is("archived_at", null)
    .limit(100);

  if (args.project_title) q = q.ilike("working_title", `%${args.project_title}%`);
  if (args.writer_name)   q = q.ilike("writer_name",   `%${args.writer_name}%`);

  const { data: projects } = await q;
  const list = projects as any[] || [];
  if (list.length === 0) return { count: 0, items: [] };

  const ids = list.map((p: any) => p.id);
  const [{ data: eps }, { data: negs }] = await Promise.all([
    admin.from("episodes").select("call_report_id").in("call_report_id", ids).eq("is_current", true),
    admin.from("negotiations").select("call_report_id, estimated_episodes, expected_completion_date").in("call_report_id", ids),
  ]);

  const epCounts = new Map<string, number>();
  for (const ep of (eps as any[] || [])) epCounts.set(ep.call_report_id, (epCounts.get(ep.call_report_id) || 0) + 1);
  const negMap = new Map((negs as any[] || []).map((n: any) => [n.call_report_id, n]));

  const enriched = list.map((p: any) => {
    const neg = negMap.get(p.id);
    const required = p.total_episodes || neg?.estimated_episodes || null;
    const received = epCounts.get(p.id) || 0;
    const deliveryStatus = !required ? "no_target" : received >= required ? "received" : "behind";
    return {
      title: p.working_title || "Untitled",
      writer: p.writer_name || "Unknown",
      required,
      received,
      status: deliveryStatus,
      deadline: neg?.expected_completion_date || null,
    };
  });

  const filtered = args.status
    ? enriched.filter((r) => r.status === args.status!.toLowerCase())
    : enriched;

  const behind   = filtered.filter((r) => r.status === "behind").length;
  const received = filtered.filter((r) => r.status === "received").length;

  return { count: filtered.length, behind, received, items: filtered };
}

async function toolQueryPending(args: { type?: string }, admin: AdminClient) {
  const type = (args.type || "all").toLowerCase();
  const out: Record<string, any> = {};

  if (type === "evaluations" || type === "all") {
    const [{ data: allCRs }, { data: evaled }] = await Promise.all([
      admin.from("call_reports").select("id, working_title, writer_name").eq("meeting_type", "call_report").is("archived_at", null),
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

    const [{ data: allEvaled }, { data: mgmtEvaled }] = await Promise.all([
      admin.from("evaluator_forms").select("call_report_id").not("submitted_at", "is", null),
      mgmtIds.length
        ? admin.from("evaluator_forms").select("call_report_id").in("evaluator_id", mgmtIds).not("submitted_at", "is", null)
        : { data: [] },
    ]);

    const mgmtApprovedSet = new Set((mgmtEvaled as any[] || []).map((e: any) => e.call_report_id));
    const allEvaledIds    = [...new Set((allEvaled as any[] || []).map((e: any) => e.call_report_id))];
    const needsApproval   = allEvaledIds.filter((id) => !mgmtApprovedSet.has(id));

    if (needsApproval.length > 0) {
      const { data: crDetails } = await admin.from("call_reports")
        .select("id, working_title, writer_name").in("id", needsApproval).is("archived_at", null).limit(25);
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

async function toolQueryTeamStats(args: { team_name?: string; period?: string }, admin: AdminClient) {
  const range = parsePeriod(args.period);

  let q: any = admin.from("teams").select("id, name, team_head_id");
  if (args.team_name) q = q.ilike("name", `%${args.team_name}%`);
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

      if (memberIds.length > 0) {
        let q1: any = admin.from("call_reports").select("id", { count: "exact", head: true }).in("created_by", memberIds);
        let q2: any = admin.from("evaluator_forms").select("id", { count: "exact", head: true }).in("evaluator_id", memberIds).not("submitted_at", "is", null);
        if (range) {
          q1 = q1.gte("created_at",   range.start.toISOString()).lte("created_at",   range.end.toISOString());
          q2 = q2.gte("submitted_at", range.start.toISOString()).lte("submitted_at", range.end.toISOString());
        }
        const [{ count: ic }, { count: ec }] = await Promise.all([q1, q2]);
        ideasCount = ic ?? 0;
        evalsCount = ec ?? 0;
      }

      return {
        team: team.name,
        head: head?.name || "Unknown",
        member_count: members.length,
        members: members.map((m: any) => `${m.name} (${m.role})`),
        ideas_logged: ideasCount,
        evaluations_submitted: evalsCount,
        period: args.period || "all time",
      };
    })
  );

  return teamList.length === 1 ? results[0] : results;
}

async function executeTool(name: string, args: any, admin: AdminClient): Promise<any> {
  switch (name) {
    case "query_evaluations":    return toolQueryEvaluations(args, admin);
    case "query_content":        return toolQueryContent(args, admin);
    case "query_person_activity": return toolQueryPersonActivity(args, admin);
    case "query_episode_delivery": return toolQueryEpisodeDelivery(args, admin);
    case "query_pending":        return toolQueryPending(args, admin);
    case "query_team_stats":     return toolQueryTeamStats(args, admin);
    default:                     return { error: `Unknown tool: ${name}` };
  }
}

// ─── System prompts ────────────────────────────────────────────────────────────
const DATA_SYSTEM_PROMPT = `You are a live data assistant for Dastaan Portal at GEO TV, a Pakistani TV drama development system. You are speaking with a senior executive (CEO level). Always be professional, direct, and factual.

SYSTEM KNOWLEDGE:
- call_reports = story pitches / writer engagement reports logged after meetings with writers
- evaluator_forms = one-liner evaluations: scored assessments (5 criteria, 1–10) of call reports
- episodic_evaluations = episodic evaluations: scored assessments of episode scripts submitted by writers
- episodes = individual episode scripts submitted by writers; tracked per project
- teams = content/evaluation teams; each has a head and multiple members

TOOL SELECTION RULES:
- "how many evaluations did X do" → query_evaluations (covers both one-liner + episodic)
- "what has X been doing / X's activity / X's work" → query_person_activity
- "which projects are behind / delivery status" → query_episode_delivery
- "how many ideas / stories logged / call reports" → query_content
- "pending evaluations / unapproved ideas" → query_pending
- "who is on team X / team performance" → query_team_stats
- Follow-up questions ("what did he evaluate", "show me those") → use context from conversation history to infer the subject, then call the appropriate tool with that context

CRITICAL RULES:
- ALWAYS use a tool for any data question. Never guess counts or names.
- If the user's question refers to a person, project, or period mentioned earlier in the conversation, extract it from history and pass it to the tool.
- If a question is genuinely about portal navigation (how do I log X, where is Y), answer directly without a tool call.
- Never refuse a data question or say you cannot check.`;

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

// ─── Groq helper ───────────────────────────────────────────────────────────────
async function callGroq(apiKey: string, body: object): Promise<any> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${err}`);
  }
  return res.json();
}

// ─── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users").select("role, email").eq("id", user.id).single();

    const hasDataAccess =
      ["admin", "management"].includes(profile?.role ?? "") ||
      profile?.email === "mir@geo.tv";

    const body = await request.json();
    const { message, portalKey, history = [] } = body as {
      message: string;
      portalKey: string;
      history: { role: "user" | "assistant"; content: string }[];
    };

    if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: "The AI assistant isn't configured yet. Please add a GROQ_API_KEY." });

    // ── Standard navigation assistant (non-management users) ─────────────────
    if (!hasDataAccess) {
      const messages = [
        { role: "system", content: buildSystemPrompt(portalKey) },
        ...history.slice(-6),
        { role: "user", content: message.trim() },
      ];
      try {
        const data = await callGroq(apiKey, { model: MODEL, messages, max_tokens: 400, temperature: 0.4 });
        return NextResponse.json({ reply: data.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response." });
      } catch {
        return NextResponse.json({ reply: "Sorry, I ran into an issue. Please try again." });
      }
    }

    // ── Data-access agent (management/admin) — two-pass tool calling ──────────
    const messages = [
      { role: "system", content: DATA_SYSTEM_PROMPT },
      ...history.slice(-4),
      { role: "user", content: message.trim() },
    ];

    let firstData: any;
    try {
      firstData = await callGroq(apiKey, {
        model: MODEL,
        messages,
        tools: DATA_TOOLS,
        tool_choice: "auto",
        max_tokens: 500,
        temperature: 0.2,
      });
    } catch (err: any) {
      console.error("Groq first-pass error:", err.message);
      return NextResponse.json({ reply: "Sorry, I ran into an issue. Please try again." });
    }

    const assistantMsg = firstData.choices?.[0]?.message;
    if (!assistantMsg) return NextResponse.json({ reply: "Sorry, I couldn't generate a response." });

    // No tool call — direct answer (navigation question or simple response)
    if (!assistantMsg.tool_calls?.length) {
      return NextResponse.json({ reply: assistantMsg.content?.trim() ?? "Sorry, I couldn't generate a response." });
    }

    // Execute tool calls
    const admin = createAdminClient();
    let toolResults: any[];
    try {
      toolResults = await Promise.all(
        (assistantMsg.tool_calls as any[]).map(async (tc: any) => {
          const args = JSON.parse(tc.function.arguments || "{}") ?? {};
          const result = await executeTool(tc.function.name, args, admin);
          return { role: "tool" as const, tool_call_id: tc.id, content: JSON.stringify(result) };
        })
      );
    } catch (err: any) {
      console.error("Tool execution error:", err.message);
      return NextResponse.json({ reply: "I had trouble fetching that data. Please try again." });
    }

    // Second pass — fast model narrates tool results
    const NARRATION_SYSTEM = `You are a senior analyst briefing the CEO of GEO TV on data from the Dastaan content portal. Translate raw database results into a clear, professional spoken summary.

RESPONSE RULES:
- Lead with the direct answer (the number, name, or status) in the first sentence.
- Break down totals by category when relevant (e.g. "X one-liner evaluations and Y episodic evaluations").
- When listing items (episodes, projects, people), use their actual names — never UUIDs or IDs.
- Format episodes as "Episode [number] of [Project Title]", not raw IDs.
- If the result set is 10 or fewer items, name every one with its score and date.
- If there are more than 10 items, summarise by pattern (e.g. "mostly scoring between 7–8, across 3 projects") and mention the total count.
- If results are empty, say so plainly and suggest why (e.g. "No evaluations found for this period — they may fall outside the selected date range").
- If multiple people matched a name, list each separately.
- Keep the tone professional and concise — this is an executive briefing, not a data dump.
- Do not use markdown, bullet points, or headers. Write in flowing prose.
- Never mention UUIDs, internal IDs, or technical field names.`;

    let secondData: any;
    try {
      secondData = await callGroq(apiKey, {
        model: MODEL_FAST,
        messages: [
          { role: "system", content: NARRATION_SYSTEM },
          ...history.slice(-4),
          { role: "user", content: message.trim() },
          assistantMsg,
          ...toolResults,
        ],
        max_tokens: 800,
        temperature: 0.3,
      });
    } catch (err: any) {
      console.error("Groq second-pass error:", err.message);
      return NextResponse.json({ reply: "I got the data but had trouble formatting the response. Please try again." });
    }

    const reply = secondData.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Assistant chat error:", error);
    return NextResponse.json({ reply: "Something went wrong. Please try again." });
  }
}
