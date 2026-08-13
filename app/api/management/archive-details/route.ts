import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getCombinedArchiveDetails, getArchiveDetailsStats } from '@/lib/management/archive-details';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { requireApiAuth } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;
    const user = auth.user;

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const searchParams = request.nextUrl.searchParams;
    const genre = searchParams.get('genre') || undefined;

    const [details, stats] = await Promise.all([
      getCombinedArchiveDetails(genre),
      getArchiveDetailsStats(genre),
    ]);

    return NextResponse.json({
      details,
      stats,
    });
  } catch (error) {
    logger.error(`Error in archive-details API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch archive details' },
      { status: 500 }
    );
  }
}
