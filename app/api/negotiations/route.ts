import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createNegotiationSchema,
  negotiationsQuerySchema,
} from "@/lib/validations/negotiations";
import {
  withApiPerf,
  applyRateLimit,
  addRateLimitHeaders,
  withCors,
} from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

/**
 * GET /api/negotiations
 * Fetch all negotiations (filtered by RLS)
 */
export async function GET(request: Request) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !userData ||
    ![
      "content_manager",
      "evaluator",
      "executive",
      "finance",
      "management",
      "admin",
    ].includes(userData.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // Parse query parameters
    const validation = negotiationsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const { status, story_id, limit, offset, sort_by, sort_order } =
      validation.data;

    // Build query
    let query = supabase.from("negotiations").select(
      `
        *,
        stories!inner(
          story_id,
          title,
          writer_originator_name,
          genre
        )
      `,
      { count: "exact" }
    );

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (story_id) {
      query = query.eq("story_id", story_id);
    }

    // Apply sorting
    query = query.order(sort_by || "created_at", {
      ascending: sort_order === "asc",
    });

    // Apply pagination
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching negotiations:", error);
      return NextResponse.json(
        { error: "Failed to fetch negotiations", details: error.message },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      negotiations: data,
      count,
      limit: limit || 50,
      offset: offset || 0,
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    console.error("Error in GET /api/negotiations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/negotiations
 * Create a new negotiation
 */
export async function POST(request: Request) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !userData ||
    !["content_manager", "content_creator", "evaluator", "admin"].includes(userData.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = createNegotiationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const negotiationData = validation.data;

    // Generate unique negotiation_id in format NEG-YYYY-NNNN
    const now = new Date();
    const year = now.getFullYear();
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const negotiation_id = `NEG-${year}-${randomNum}`;

    // Insert negotiation
    const { data: negotiation, error } = await supabase
      .from("negotiations")
      .insert({
        negotiation_id,
        story_id: negotiationData.story_id,
        writer_producer_name: negotiationData.writer_producer_name,
        genre: negotiationData.genre,
        contract_type: negotiationData.contract_type,
        proposed_price: negotiationData.proposed_price,
        rate_range: negotiationData.rate_range,
        payment_structure: negotiationData.payment_structure,
        price_justification: negotiationData.price_justification,
        estimated_episodes: negotiationData.estimated_episodes,
        suggested_time_slot: negotiationData.suggested_time_slot,
        project_start_date: negotiationData.project_start_date,
        expected_start_date: negotiationData.project_start_date,
        expected_completion_date: negotiationData.expected_completion_date,
        delivery_schedule: negotiationData.delivery_schedule,
        status: "in_progress",
        created_by: user.id,
        currency: "PKR",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating negotiation:", error);
      return NextResponse.json(
        { error: "Failed to create negotiation", details: error.message },
        { status: 500 }
      );
    }

    // Update story status to 'in_negotiation'
    const { error: storyError } = await supabase
      .from("stories")
      .update({
        status: "in_negotiation",
        current_stage: "negotiation",
      })
      .eq("id", negotiationData.story_id);

    if (storyError) {
      console.error("Error updating story status:", storyError);
      // Continue even if story update fails
    }

    const res = NextResponse.json(
      {
        message: "Negotiation created successfully",
        negotiation,
      },
      { status: 201 }
    );

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    console.error("Error in POST /api/negotiations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
