import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  createContractTermSchema,
  contractTermsQuerySchema,
} from "@/lib/validations/contract-terms";
import {
  withApiPerf,
  applyRateLimit,
  addRateLimitHeaders,
  withCors,
} from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { parsePaginationParams, applyPagination, createPaginatedResponse } from "@/lib/utils/pagination";
import { revalidatePath } from 'next/cache';

/**
 * GET /api/contract-terms
 * Fetch all contract terms (filtered by RLS)
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Field to sort by (default: created_at)
 * - sortOrder: asc or desc (default: desc)
 * - status: Filter by status
 * - story_id: Filter by story
 */
export async function GET(request: NextRequest) {
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
    // Parse pagination parameters
    const paginationParams = parsePaginationParams(request);

    // Parse and validate filter parameters
    const { searchParams } = request.nextUrl;
    const rawFilters = {
      status: searchParams.get("status") || undefined,
      story_id: searchParams.get("story_id") || undefined,
    };

    // Validate query parameters
    const validation = contractTermsQuerySchema.safeParse(rawFilters);
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
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.story_id) {
      query = query.eq("story_id", filters.story_id);
    }

    // Apply pagination and sorting
    query = applyPagination(query, paginationParams);

    const { data, error, count } = await query;

    if (error) {
      logger.error("Error fetching negotiations", { error, context: "GET /api/contract-terms" });
      return NextResponse.json(
        { error: "Failed to fetch contract terms" },
        { status: 500 }
      );
    }

    // Create standardized paginated response
    const response = createPaginatedResponse(
      data || [],
      paginationParams.page,
      paginationParams.limit,
      count || 0
    );

    const res = NextResponse.json(response);
    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    logger.error(`Error in GET /api/contract-terms: ${error instanceof Error ? error.message : String(error)}`);
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
    const validation = createContractTermSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const contractTermData = validation.data;

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
        story_id: contractTermData.story_id,
        writer_producer_name: contractTermData.writer_producer_name,
        genre: contractTermData.genre,
        contract_type: contractTermData.contract_type,
        proposed_price: contractTermData.proposed_price,
        rate_range: contractTermData.rate_range,
        payment_structure: contractTermData.payment_structure,
        price_justification: contractTermData.price_justification,
        estimated_episodes: contractTermData.estimated_episodes,
        suggested_time_slot: contractTermData.suggested_time_slot,
        project_start_date: contractTermData.project_start_date,
        expected_start_date: contractTermData.project_start_date,
        expected_completion_date: contractTermData.expected_completion_date,
        delivery_schedule: contractTermData.delivery_schedule,
        status: "agreed",
        agreed_price: contractTermData.agreed_price,
        agreed_terms: contractTermData.agreed_terms,
        created_by: user.id,
        currency: "PKR",
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating negotiation", { error, context: "POST /api/contract-terms" });
      return NextResponse.json(
        { error: "Failed to create contract term" },
        { status: 500 }
      );
    }

    // Update story status to 'in_legal_review' since negotiation is agreed
    const { error: storyError } = await supabase
      .from("stories")
      .update({
        status: "in_legal_review",
        current_stage: "legal_review",
      })
      .eq("id", contractTermData.story_id);

    if (storyError) {
      logger.error("Error updating story status", { error: storyError, context: "POST /api/contract-terms" });
      // Continue even if story update fails
    }

    // Revalidate contract terms list pages to show new term immediately
    revalidatePath('/content-department/contract-terms');
    revalidatePath('/evaluator/contract-terms');

    const res = NextResponse.json(
      {
        message: "Contract term created successfully",
        negotiation,
      },
      { status: 201 }
    );

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    logger.error(`Error in POST /api/negotiations: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
