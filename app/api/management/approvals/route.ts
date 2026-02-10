import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { ApprovalAnalyticsService } from '@/lib/services/analytics';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const service = new ApprovalAnalyticsService('server');
    const [approvals, stats] = await Promise.all([
      service.getPendingApprovals(),
      service.getPendingApprovalsStats(),
    ]);

    return NextResponse.json({
      approvals,
      stats,
    });
  } catch (error) {
    logger.error(`Error in approvals API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}
