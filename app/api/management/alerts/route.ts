import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getCriticalAlerts } from '@/lib/management/critical-alerts';

export async function GET(request: NextRequest) {
  try {
    const alerts = await getCriticalAlerts();

    return NextResponse.json({
      alerts,
    });
  } catch (error) {
    logger.error(`Error in alerts API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
