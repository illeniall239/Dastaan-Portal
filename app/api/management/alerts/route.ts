import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getCriticalAlerts } from '@/lib/management/critical-alerts';
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';
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

    const alerts = await getCriticalAlerts();

    // Cache for 1 minute (real-time alerts need fresher data)
    return NextResponse.json(
      { alerts },
      {
        headers: {
          'Cache-Control': createCacheControl(CACHE_DURATION.REALTIME),
        },
      }
    );
  } catch (error) {
    logger.error(`Error in alerts API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
