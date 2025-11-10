import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getCriticalAlerts } from '@/lib/management/critical-alerts';
import { getSampleCriticalAlerts } from '@/lib/management/sample-data';
import { alertsQuerySchema } from '@/lib/validations/management-filters';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      sample: searchParams.get('sample') || undefined,
    };

    // Validate query parameters
    const validation = alertsQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const useSampleData = validation.data.sample === true;

    if (useSampleData) {
      const alerts = getSampleCriticalAlerts();
      return NextResponse.json({ alerts });
    }

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
