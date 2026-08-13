import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { ProjectAnalyticsService } from '@/lib/services/analytics';
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';
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
