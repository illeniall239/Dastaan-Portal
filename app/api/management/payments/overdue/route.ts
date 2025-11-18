import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { PaymentAnalyticsService } from '@/lib/services/analytics';

export async function GET(request: NextRequest) {
  try {
    const service = new PaymentAnalyticsService('server');
    const [payments, stats] = await Promise.all([
      service.getOverduePayments(),
      service.getOverduePaymentsStats(),
    ]);

    return NextResponse.json({
      payments,
      stats,
    });
  } catch (error) {
    logger.error(`Error in overdue payments API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch overdue payments' },
      { status: 500 }
    );
  }
}
