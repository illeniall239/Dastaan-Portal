import { NextRequest, NextResponse } from 'next/server';
import { getActiveIdeasByGenre, getActiveIdeasStats } from '@/lib/management/active-ideas-details';
import { getSampleActiveIdeasDetails } from '@/lib/management/sample-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const genre = searchParams.get('genre') || undefined;
    const useSampleData = searchParams.get('sample') === 'true';

    if (useSampleData) {
      const sampleDetails = getSampleActiveIdeasDetails(genre);

      // Calculate stats from sample data
      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, number> = {};

      sampleDetails.forEach(idea => {
        byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
        byCategory[idea.category] = (byCategory[idea.category] || 0) + 1;
      });

      const avgDaysActive = sampleDetails.length > 0
        ? Math.round(sampleDetails.reduce((sum, idea) => sum + idea.days_active, 0) / sampleDetails.length)
        : 0;

      const stats = {
        total: sampleDetails.length,
        byStatus,
        byCategory,
        avgDaysActive,
      };

      return NextResponse.json({
        details: sampleDetails,
        stats,
      });
    }

    const [details, stats] = await Promise.all([
      getActiveIdeasByGenre(genre),
      getActiveIdeasStats(genre),
    ]);

    return NextResponse.json({
      details,
      stats,
    });
  } catch (error) {
    console.error('Error in active-ideas-details API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active ideas details' },
      { status: 500 }
    );
  }
}
