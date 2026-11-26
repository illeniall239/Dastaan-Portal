import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { CACHE_DURATION, createCacheControl } from "@/lib/constants";
import { fetchAll } from "@/lib/supabase/fetch-all";

type Admin = ReturnType<typeof createAdminClient>;

/** Current episodes per project (all pages: there are more than 1000 episodes) */
async function episodeCounts(admin: Admin) {
  const episodes = await fetchAll<{ call_report_id: string }>((f, t) => admin
    .from("episodes").select("id, call_report_id").eq("is_current", true)
    .not("call_report_id", "is", null).order("id").range(f, t));
  const count: Record<string, number> = {};
  for (const ep of episodes) count[ep.call_report_id] = (count[ep.call_report_id] || 0) + 1;
  return count;
}

/**
 * Every active project with what the tracker filters and groups by: its content head (the project
 * team's head; "Programming" for the Programming Team), slot (8PM, 7/9PM or No slot) and episodes in hand.
 */
async function trackerProjects(admin: Admin, countByProject: Record<string, number>) {
  const [projects, { data: teams }] = await Promise.all([
    fetchAll<any>((f, t) => admin.from("call_reports")
      .select("id, working_title, writer_name, target_slot, content_type, team_id")
      .eq("meeting_type", "call_report").is("archived_at", null).order("id").range(f, t)),
    admin.from("teams").select("id, name, team_type, team_head:users!teams_team_head_id_fkey(name)"),
  ]);
  const headOfTeam = new Map((teams || []).map((t: any) => {
    const head = Array.isArray(t.team_head) ? t.team_head[0] : t.team_head;
    return [t.id, t.team_type === "programmer" ? "Programming" : head?.name || t.name];
  }));
  return projects.map((p) => ({
    id: p.id as string,
    title: (p.working_title as string) || "Untitled",
    writer: (p.writer_name as string) || "—",
    head: (p.team_id && headOfTeam.get(p.team_id)) || "(no team)",
    slot: p.target_slot === "8:00 PM" ? "8PM" : p.target_slot === "7:00 PM" || p.target_slot === "9:00 PM" ? "7/9PM" : "No slot",
    contentType: (p.content_type as string) || null,
    episodes: countByProject[p.id] || 0,
  }));
}

// Buckets: [min, max) — last bucket has no upper bound
const SERIAL_BUCKETS = [
  { min: 20, max: Infinity, label: "20+" },
  { min: 15, max: 20, label: "15–19" },
  { min: 10, max: 15, label: "10–14" },
  { min: 5, max: 10, label: "5–9" },
];
const LONG_SERIAL_BUCKETS = [
  { min: 40, max: Infinity, label: "40+" },
  { min: 30, max: 40, label: "30–39" },
  { min: 20, max: 30, label: "20–29" },
  { min: 10, max: 20, label: "10–19" },
];

// Valid min values for drill-down validation
const VALID_SERIAL_MINS = SERIAL_BUCKETS.map((b) => b.min);
const VALID_LONG_SERIAL_MINS = LONG_SERIAL_BUCKETS.map((b) => b.min);

function getBuckets(type: string) {
  return type === "Serial" ? SERIAL_BUCKETS : LONG_SERIAL_BUCKETS;
}

function inBucket(epCount: number, min: number, max: number) {
  return epCount >= min && epCount < max;
}

/**
 * GET /api/management/episode-milestones
 * ?drilldown=1&type=Serial&min=20  → returns project rows for that bucket
 * Otherwise returns bucket counts + labels
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(["management", "management_viewer", "executive"]);
  if (!auth.success) return auth.response;

  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, auth.user.id);
  if (!rate.success) return rate.response!;

  const { searchParams } = request.nextUrl;
  const drilldown = searchParams.get("drilldown");

  if (drilldown === "1") {
    return handleDrillDown(searchParams);
  }

  return handleSummary();
}

async function handleDrillDown(params: URLSearchParams) {
  const contentType = params.get("type");
  const min = Number(params.get("min"));

  if (!contentType || !["Serial", "Long Serial"].includes(contentType)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const validMins = contentType === "Serial" ? VALID_SERIAL_MINS : VALID_LONG_SERIAL_MINS;
  if (!validMins.includes(min)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  const bucket = getBuckets(contentType).find((b) => b.min === min)!;
  const admin = createAdminClient();

  const { data: projects, error: projectError } = await admin
    .from("call_reports")
    .select("id, working_title, writer_name, target_slot, team:teams!call_reports_team_id_fkey(name)")
    .eq("content_type", contentType)
    .is("archived_at", null);

  if (projectError) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json({ success: true, columns: [], rows: [] });
  }

  const countByProject = await episodeCounts(admin);

  const rows = projects
    .filter((p) => inBucket(countByProject[p.id] || 0, bucket.min, bucket.max))
    .map((p) => ({
      working_title: p.working_title || "—",
      writer_name: p.writer_name || "—",
      team: (p.team as any)?.name || "—",
      target_slot: p.target_slot || "—",
      current_episodes: countByProject[p.id] || 0,
    }))
    .sort((a, b) => b.current_episodes - a.current_episodes);

  return NextResponse.json({
    success: true,
    columns: [
      { key: "working_title", label: "Title" },
      { key: "writer_name", label: "Writer" },
      { key: "team", label: "Team" },
      { key: "target_slot", label: "Slot" },
      { key: "current_episodes", label: "Episodes" },
    ],
    rows,
  }, {
    headers: { "Cache-Control": createCacheControl(CACHE_DURATION.ANALYTICS) },
  });
}

async function handleSummary() {
  const admin = createAdminClient();

  const { data: projects, error: projectError } = await admin
    .from("call_reports")
    .select("id, content_type")
    .in("content_type", ["Serial", "Long Serial"])
    .is("archived_at", null);

  if (projectError) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json({
      serials: SERIAL_BUCKETS.map((b) => ({ min: b.min, label: b.label, count: 0 })),
      longSerials: LONG_SERIAL_BUCKETS.map((b) => ({ min: b.min, label: b.label, count: 0 })),
      projects: await trackerProjects(admin, await episodeCounts(admin)),
    }, {
      headers: { "Cache-Control": createCacheControl(CACHE_DURATION.ANALYTICS) },
    });
  }

  const countByProject = await episodeCounts(admin);

  // Count into distinct buckets
  const serialCounts: Record<number, number> = {};
  const longSerialCounts: Record<number, number> = {};
  for (const b of SERIAL_BUCKETS) serialCounts[b.min] = 0;
  for (const b of LONG_SERIAL_BUCKETS) longSerialCounts[b.min] = 0;

  for (const project of projects) {
    const epCount = countByProject[project.id] || 0;
    if (project.content_type === "Serial") {
      for (const b of SERIAL_BUCKETS) {
        if (inBucket(epCount, b.min, b.max)) { serialCounts[b.min]++; break; }
      }
    } else if (project.content_type === "Long Serial") {
      for (const b of LONG_SERIAL_BUCKETS) {
        if (inBucket(epCount, b.min, b.max)) { longSerialCounts[b.min]++; break; }
      }
    }
  }

  return NextResponse.json({
    serials: SERIAL_BUCKETS.map((b) => ({ min: b.min, label: b.label, count: serialCounts[b.min] })),
    longSerials: LONG_SERIAL_BUCKETS.map((b) => ({ min: b.min, label: b.label, count: longSerialCounts[b.min] })),
    projects: await trackerProjects(admin, countByProject),
  }, {
    headers: { "Cache-Control": createCacheControl(CACHE_DURATION.ANALYTICS) },
  });
}
