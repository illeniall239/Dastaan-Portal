import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getCombinedArchiveDetails, getArchiveDetailsStats } from '@/lib/management/archive-details';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const genre = searchParams.get('genre') || undefined;

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
