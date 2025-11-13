import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createMultipleEpisodesSchema, episodesQuerySchema } from "@/lib/validations/episodes";
import { withApiPerf, applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { parsePaginationParams, applyPagination, createPaginatedResponse } from "@/lib/utils/pagination";

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

    // Check for duplicate episode numbers within the incoming batch
    const episodeNumbers = episodes.map(ep => ep.episode_number);
    const duplicatesInBatch = episodeNumbers.filter((num, idx) =>
      episodeNumbers.indexOf(num) !== idx
    );

    if (duplicatesInBatch.length > 0) {
      const uniqueDuplicates = [...new Set(duplicatesInBatch)].sort((a, b) => a - b);
      return NextResponse.json(
        {
          error: "Duplicate episode numbers in submission",
          details: `Episode number(s) ${uniqueDuplicates.join(', ')} appear multiple times in your submission`
        },
        { status: 400 }
      );
    }

    // Check for existing episodes in database
    let existingQuery = supabase
      .from("episodes")
      .select("episode_number")
      .in("episode_number", episodeNumbers);

    if (call_report_id) {
      existingQuery = existingQuery.eq("call_report_id", call_report_id);
    } else if (story_id) {
      existingQuery = existingQuery.eq("story_id", story_id);
    }

    const { data: existingEpisodes } = await existingQuery;

    if (existingEpisodes && existingEpisodes.length > 0) {
      const existingNumbers = existingEpisodes.map(ep => ep.episode_number).sort((a, b) => a - b);
      return NextResponse.json(
        {
          error: "Duplicate episode numbers detected",
          details: `Episode number(s) ${existingNumbers.join(', ')} already exist for this project`
        },
        { status: 409 } // 409 Conflict
      );
    }

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
      logger.error(`Error creating episodes: ${error instanceof Error ? error.message : String(error)}`);
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
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * GET /api/episodes
 * List episodes with optional filters
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Field to sort by (default: created_at)
 * - sortOrder: asc or desc (default: desc)
 * - call_report_id: Filter by call report
 * - story_id: Filter by story
 * - logged_by: Filter by user who logged the episode
 * - episode_number: Filter by episode number
 */
export async function GET(request: NextRequest) {
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
    // Parse pagination parameters (page, limit, sortBy, sortOrder)
    const paginationParams = parsePaginationParams(request);

    // Parse and validate filter parameters
    const { searchParams } = request.nextUrl;
    const rawFilters = {
      call_report_id: searchParams.get("call_report_id") || undefined,
      story_id: searchParams.get("story_id") || undefined,
      logged_by: searchParams.get("logged_by") || undefined,
      episode_number: searchParams.get("episode_number") || undefined,
    };

    // Validate query parameters
    const validation = episodesQuerySchema.safeParse(rawFilters);
    if (!validation.success) {
      return addRateLimitHeaders(
        withCors(
          request,
          NextResponse.json(
            { error: "Invalid query parameters", details: validation.error.format() },
            { status: 400 }
          )
        ),
        rate.result
      );
    }

    const filters = validation.data;

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
    if (filters.call_report_id) {
      query = query.eq("call_report_id", filters.call_report_id);
    }
    if (filters.story_id) {
      query = query.eq("story_id", filters.story_id);
    }
    if (filters.logged_by) {
      query = query.eq("logged_by", filters.logged_by);
    }
    if (filters.episode_number) {
      query = query.eq("episode_number", filters.episode_number);
    }

    // Apply pagination and sorting
    query = applyPagination(query, paginationParams);

    const { data: episodes, error, count } = await query;

    if (error) {
      logger.error(`Error fetching episodes: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: "Failed to fetch episodes", details: error.message },
        { status: 500 }
      );
    }

    // Create standardized paginated response
    const response = createPaginatedResponse(
      episodes || [],
      paginationParams.page,
      paginationParams.limit,
      count || 0
    );

    return withApiPerf(async () => {
      const res = NextResponse.json(response);
      return addRateLimitHeaders(withCors(request, res), rate.result);
    }, request);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}
