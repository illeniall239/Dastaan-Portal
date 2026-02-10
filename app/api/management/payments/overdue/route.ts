import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { PaymentAnalyticsService } from '@/lib/services/analytics';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

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
