import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { PaymentAnalyticsService } from '@/lib/services/analytics';
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
