import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { CACHE_DURATION, createCacheControl } from "@/lib/constants";

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

  const projectIds = projects.map((p) => p.id);

  const { data: episodes, error: epError } = await admin
    .from("episodes")
    .select("call_report_id")
    .in("call_report_id", projectIds)
    .eq("is_current", true);

  if (epError) {
    return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }

  const countByProject: Record<string, number> = {};
  for (const ep of episodes || []) {
    countByProject[ep.call_report_id] = (countByProject[ep.call_report_id] || 0) + 1;
  }

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
    }, {
      headers: { "Cache-Control": createCacheControl(CACHE_DURATION.ANALYTICS) },
    });
  }

  const projectIds = projects.map((p) => p.id);

  const { data: episodes, error: epError } = await admin
    .from("episodes")
    .select("call_report_id")
    .in("call_report_id", projectIds)
    .eq("is_current", true);

  if (epError) {
    return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }

  const countByProject: Record<string, number> = {};
  for (const ep of episodes || []) {
    countByProject[ep.call_report_id] = (countByProject[ep.call_report_id] || 0) + 1;
  }

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
  }, {
    headers: { "Cache-Control": createCacheControl(CACHE_DURATION.ANALYTICS) },
  });
}
