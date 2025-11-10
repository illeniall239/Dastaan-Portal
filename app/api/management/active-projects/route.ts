import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { ProjectAnalyticsService } from '@/lib/services/analytics';
import { getSampleActiveProjects } from '@/lib/management/sample-data';
import { activeProjectsQuerySchema } from '@/lib/validations/management-filters';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      sample: searchParams.get('sample') || undefined,
    };

    // Validate query parameters
    const validation = activeProjectsQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const useSampleData = validation.data.sample === true;

    if (useSampleData) {
      const sampleProjects = getSampleActiveProjects();

      // Calculate stats from sample data
      const statusCounts: Record<string, number> = {};
      const genreCounts: Record<string, number> = {};

      sampleProjects.forEach(project => {
        statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
        genreCounts[project.genre] = (genreCounts[project.genre] || 0) + 1;
      });

      const stats = {
        total: sampleProjects.length,
        byStatus: statusCounts,
        byGenre: genreCounts,
      };

      return NextResponse.json({
        projects: sampleProjects,
        stats,
      });
    }

    const service = new ProjectAnalyticsService('server');
    const [projects, stats] = await Promise.all([
      service.getActiveProjects(),
      service.getActiveProjectsStats(),
    ]);

    return NextResponse.json({
      projects,
      stats,
    });
  } catch (error) {
    logger.error(`Error in active-projects API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch active projects' },
      { status: 500 }
    );
  }
}
