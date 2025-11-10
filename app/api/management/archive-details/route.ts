import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getCombinedArchiveDetails, getArchiveDetailsStats } from '@/lib/management/archive-details';
import { getSampleArchiveDetails } from '@/lib/management/sample-data';
import { archiveDetailsQuerySchema } from '@/lib/validations/management-filters';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      genre: searchParams.get('genre') || undefined,
      sample: searchParams.get('sample') || undefined,
    };

    // Validate query parameters
    const validation = archiveDetailsQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const genre = validation.data.genre;
    const useSampleData = validation.data.sample === true;

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
    logger.error(`Error in archive-details API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch archive details' },
      { status: 500 }
    );
  }
}
