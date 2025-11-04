import { NextRequest, NextResponse } from 'next/server';
import { getCriticalAlerts } from '@/lib/management/critical-alerts';
import { getSampleCriticalAlerts } from '@/lib/management/sample-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useSampleData = searchParams.get('sample') === 'true';

    if (useSampleData) {
      const alerts = getSampleCriticalAlerts();
      return NextResponse.json({ alerts });
    }

    const alerts = await getCriticalAlerts();

    return NextResponse.json({
      alerts,
    });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
