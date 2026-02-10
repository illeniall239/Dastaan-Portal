import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getActiveIdeasByGenre, getActiveIdeasStats } from '@/lib/management/active-ideas-details';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const searchParams = request.nextUrl.searchParams;
    const genre = searchParams.get('genre') || undefined;

    const [details, stats] = await Promise.all([
      getActiveIdeasByGenre(genre),
      getActiveIdeasStats(genre),
    ]);

    return NextResponse.json({
      details,
      stats,
    });
  } catch (error) {
    logger.error(`Error in active-ideas-details API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch active ideas details' },
      { status: 500 }
    );
  }
}
