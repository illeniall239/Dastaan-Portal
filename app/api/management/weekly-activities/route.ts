import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getWeeklyActivities, getWeeklyActivityStats } from '@/lib/management/weekly-activities';
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { requireApiAuth } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(["management", "management_viewer"]);
  if (!auth.success) return auth.response;
  const user = auth.user;

  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
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
