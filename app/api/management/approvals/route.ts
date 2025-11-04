import { NextRequest, NextResponse } from 'next/server';
import { getPendingApprovals, getPendingApprovalsStats } from '@/lib/management/pending-approvals';
import { getSamplePendingApprovals } from '@/lib/management/sample-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useSampleData = searchParams.get('sample') === 'true';

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

    const [approvals, stats] = await Promise.all([
      getPendingApprovals(),
      getPendingApprovalsStats(),
    ]);

    return NextResponse.json({
      approvals,
      stats,
    });
  } catch (error) {
    console.error('Error in approvals API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}
