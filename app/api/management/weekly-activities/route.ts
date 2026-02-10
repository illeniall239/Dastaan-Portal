import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getWeeklyActivities, getWeeklyActivityStats } from '@/lib/management/weekly-activities';
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const [activities, stats] = await Promise.all([
      getWeeklyActivities(),
      getWeeklyActivityStats(),
    ]);

    return NextResponse.json(
      {
        activities,
        stats,
      },
      {
        headers: {
          'Cache-Control': createCacheControl(CACHE_DURATION.ANALYTICS),
        },
      }
    );
  } catch (error) {
    logger.error(`Error in weekly-activities API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch weekly activities' },
      { status: 500 }
    );
  }
}
