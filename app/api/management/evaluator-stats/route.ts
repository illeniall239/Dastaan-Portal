import { NextRequest, NextResponse } from "next/server";
import { getAllEvaluatorStats } from "@/lib/management/evaluator-performance";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { evaluatorStatsDateSchema } from "@/lib/validations/date-filters";
import { logger } from "@/lib/logger";
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';
import { requireApiAuth } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;
    const user = auth.user;

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    };

    // Validate query parameters
    const validation = evaluatorStatsDateSchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const fromDate = validation.data.from;
    const toDate = validation.data.to;

    // Fetch evaluator stats with optional date filtering
    const stats = await getAllEvaluatorStats(fromDate, toDate);

    return NextResponse.json(
      {
        success: true,
        stats,
        filter: {
          from: fromDate ? fromDate.toISOString().split('T')[0] : null,
          to: toDate ? toDate.toISOString().split('T')[0] : null,
        },
      },
      {
        headers: {
          'Cache-Control': createCacheControl(CACHE_DURATION.ANALYTICS),
        },
      }
    );
  } catch (error) {
    logger.error(`Error fetching evaluator stats: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Failed to fetch evaluator stats" },
      { status: 500 }
    );
  }
}
