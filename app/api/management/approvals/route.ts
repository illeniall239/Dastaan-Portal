import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { ApprovalAnalyticsService } from '@/lib/services/analytics';
import { getSamplePendingApprovals } from '@/lib/management/sample-data';
import { approvalsQuerySchema } from '@/lib/validations/management-filters';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      sample: searchParams.get('sample') || undefined,
    };

    // Validate query parameters
    const validation = approvalsQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const useSampleData = validation.data.sample === true;

    if (useSampleData) {
      const sampleApprovals = getSamplePendingApprovals();

      // Calculate stats from sample data
      const recommendationCounts: Record<string, number> = {};
      const scoreCounts: Record<string, number> = {};

      sampleApprovals.forEach(approval => {
        recommendationCounts[approval.recommendation] = (recommendationCounts[approval.recommendation] || 0) + 1;

        const scoreRange = approval.evaluation_score >= 80 ? 'high' :
                          approval.evaluation_score >= 60 ? 'medium' : 'low';
        scoreCounts[scoreRange] = (scoreCounts[scoreRange] || 0) + 1;
      });

      const stats = {
        total: sampleApprovals.length,
        byRecommendation: recommendationCounts,
        byScoreRange: scoreCounts,
      };

      return NextResponse.json({
        approvals: sampleApprovals,
        stats,
      });
    }

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
