import { NextRequest, NextResponse } from 'next/server';
import { getActiveProjects, getActiveProjectsStats } from '@/lib/management/active-projects';
import { getSampleActiveProjects } from '@/lib/management/sample-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useSampleData = searchParams.get('sample') === 'true';

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

    const [projects, stats] = await Promise.all([
      getActiveProjects(),
      getActiveProjectsStats(),
    ]);

    return NextResponse.json({
      projects,
      stats,
    });
  } catch (error) {
    console.error('Error in active-projects API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active projects' },
      { status: 500 }
    );
  }
}
