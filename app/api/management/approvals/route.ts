import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { ApprovalAnalyticsService } from '@/lib/services/analytics';

export async function GET(request: NextRequest) {
  try {
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
