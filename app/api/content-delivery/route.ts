import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getContentDeliveryItemsPaginated, getContentDeliveryStats } from '@/lib/content-delivery/server';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/utils/pagination';
import { contentDeliveryQuerySchema } from '@/lib/validations/query-params';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { requireApiAuth } from '@/lib/api/auth';

/**
 * GET /api/content-delivery
 * Get content delivery items (projects with episode tracking) with pagination
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Field to sort by (default: created_at)
 * - sortOrder: asc or desc (default: desc)
 * - search: Search across project name, writer, negotiation ID, story ID
 * - genre: Filter by genre (or 'all')
 * - status: Filter by status (or 'all')
 * - contract_type: Filter by contract type (or 'all')
 * - time_slot: Filter by time slot (or 'all')
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, auth.user.id);
    if (!rate.success) return rate.response!;

    // Parse pagination parameters
    const paginationParams = parsePaginationParams(request);

    // Parse and validate filter parameters
    const searchParams = request.nextUrl.searchParams;
    const rawFilters = {
      search: searchParams.get('search') || undefined,
      genre: searchParams.get('genre') || undefined,
      status: searchParams.get('status') || undefined,
      contract_type: searchParams.get('contract_type') || undefined,
      time_slot: searchParams.get('time_slot') || undefined,
    };

    // Validate query parameters
    const validation = contentDeliveryQuerySchema.safeParse(rawFilters);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const filters = {
      search: validation.data.search?.toLowerCase(),
      genre: validation.data.genre,
      status: validation.data.status,
      contractType: validation.data.contract_type,
      timeSlot: validation.data.time_slot,
    };

    // Fetch paginated items with filters applied at database level
    const { items, count } = await getContentDeliveryItemsPaginated(paginationParams, filters);

    // Get stats (unchanged - still gets all data for statistics)
    const stats = await getContentDeliveryStats();

    // Create standardized paginated response
    const response = createPaginatedResponse(
      items,
      paginationParams.page,
      paginationParams.limit,
      count
    );

    return NextResponse.json({
      ...response,
      stats, // Include stats alongside paginated data
    });
  } catch (error) {
    logger.error(`Error in content-delivery API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch content delivery data' },
      { status: 500 }
    );
  }
}
