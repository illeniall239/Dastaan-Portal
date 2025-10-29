import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMultipleEpisodesSchema, episodesQuerySchema } from "@/lib/validations/episodes";
import { withApiPerf, applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

/**
 * POST /api/episodes
 * Create one or multiple episodes
 */
export async function POST(request: Request) {
  // Rate limit POSTs (creation)
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_creator", "content_manager", "evaluator", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = createMultipleEpisodesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const { call_report_id, story_id, episodes } = validation.data;

    // Prepare episodes for insertion
    const episodesToInsert = episodes.map((episode) => ({
      call_report_id: call_report_id || null,
      story_id: story_id || null,
      episode_number: episode.episode_number,
      title: episode.title || null,
      attachment_url: episode.attachment_url || null,
      attachment_name: episode.attachment_name || null,
      attachment_type: episode.attachment_type || null,
      additional_info: episode.additional_info || null,
      logged_by: user.id,
    }));

    // Insert episodes
    const { data: createdEpisodes, error } = await supabase
      .from("episodes")
      .insert(episodesToInsert)
      .select();

    if (error) {
      console.error("Error creating episodes:", error);
      return NextResponse.json(
        { error: "Failed to create episodes", details: error.message },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      message: `Successfully created ${createdEpisodes.length} episode(s)`,
      episodes: createdEpisodes,
    }, { status: 201 });
    return addRateLimitHeaders(withCors(request, res), rate.result);

  } catch (error) {
    console.error("Unexpected error:", error);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * GET /api/episodes
 * List episodes with optional filters
 */
export async function GET(request: Request) {
  // Rate limit GETs listing/search
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_creator", "content_manager", "evaluator", "executive", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      call_report_id: searchParams.get("call_report_id") || undefined,
      story_id: searchParams.get("story_id") || undefined,
      logged_by: searchParams.get("logged_by") || undefined,
      episode_number: searchParams.get("episode_number")
        ? parseInt(searchParams.get("episode_number")!)
        : undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 50,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : 0,
      sort_by: searchParams.get("sort_by") || "created_at",
      sort_order: searchParams.get("sort_order") || "desc",
    };

    const validation = episodesQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      call_report_id,
      story_id,
      logged_by,
      episode_number,
      limit,
      offset,
      sort_by,
      sort_order,
    } = validation.data;

    // Build query
    let query = supabase
      .from("episodes")
      .select(`
        *,
        logged_by_user:users!logged_by(name, email),
        call_report:call_reports(working_title, writer_name),
        story:stories(title, status)
      `, { count: "exact" });

    // Apply filters
    if (call_report_id) {
      query = query.eq("call_report_id", call_report_id);
    }
    if (story_id) {
      query = query.eq("story_id", story_id);
    }
    if (logged_by) {
      query = query.eq("logged_by", logged_by);
    }
    if (episode_number) {
      query = query.eq("episode_number", episode_number);
    }

    // Apply sorting
    query = query.order(sort_by!, { ascending: sort_order === "asc" });

    // Apply pagination
    query = query.range(offset!, offset! + limit! - 1);

    const { data: episodes, error, count } = await query;

    if (error) {
      console.error("Error fetching episodes:", error);
      return NextResponse.json(
        { error: "Failed to fetch episodes", details: error.message },
        { status: 500 }
      );
    }

    return withApiPerf(async () => {
      const res = NextResponse.json({
      episodes,
      total: count,
      limit,
      offset,
      });
      return addRateLimitHeaders(withCors(request, res), rate.result);
    }, request);

  } catch (error) {
    console.error("Unexpected error:", error);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}
