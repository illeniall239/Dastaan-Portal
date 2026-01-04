import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getCriticalAlerts } from '@/lib/management/critical-alerts';
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
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
