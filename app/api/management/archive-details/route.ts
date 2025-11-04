import { NextRequest, NextResponse } from 'next/server';
import { getCombinedArchiveDetails, getArchiveDetailsStats } from '@/lib/management/archive-details';
import { getSampleArchiveDetails } from '@/lib/management/sample-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const genre = searchParams.get('genre') || undefined;
    const useSampleData = searchParams.get('sample') === 'true';

    if (useSampleData) {
      const sampleDetails = getSampleArchiveDetails(genre);

      // Calculate stats from sample data
      const byType: Record<string, number> = {};
      const byRejectionStage: Record<string, number> = {};
      let totalDaysInSystem = 0;
      let countWithDays = 0;

      sampleDetails.forEach(detail => {
        const typeKey = detail.type as string;
        byType[typeKey] = (byType[typeKey] || 0) + 1;

        if (detail.rejection_stage) {
          byRejectionStage[detail.rejection_stage] = (byRejectionStage[detail.rejection_stage] || 0) + 1;
        }

        if (detail.days_in_system !== null) {
          totalDaysInSystem += detail.days_in_system;
          countWithDays++;
        }
      });

      const avgDaysInSystem = countWithDays > 0
        ? Math.round(totalDaysInSystem / countWithDays)
        : 0;

      const stats = {
        total: sampleDetails.length,
        byType,
        byRejectionStage,
        avgDaysInSystem,
      };

      return NextResponse.json({
        details: sampleDetails,
        stats,
      });
    }

    const [details, stats] = await Promise.all([
      getCombinedArchiveDetails(genre),
      getArchiveDetailsStats(genre),
    ]);

    return NextResponse.json({
      details,
      stats,
    });
  } catch (error) {
    console.error('Error in archive-details API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archive details' },
      { status: 500 }
    );
  }
}
