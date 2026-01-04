import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { ProjectAnalyticsService } from '@/lib/services/analytics';
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const service = new ProjectAnalyticsService('server');
    const [projects, stats] = await Promise.all([
      service.getActiveProjects(),
      service.getActiveProjectsStats(),
    ]);

    return NextResponse.json(
      {
        projects,
        stats,
      },
      {
        headers: {
          'Cache-Control': createCacheControl(CACHE_DURATION.ANALYTICS),
        },
      }
    );
  } catch (error) {
    logger.error(`Error in active-projects API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch active projects' },
      { status: 500 }
    );
  }
}
