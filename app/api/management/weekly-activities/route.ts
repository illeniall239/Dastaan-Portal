import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getWeeklyActivities, getWeeklyActivityStats } from '@/lib/management/weekly-activities';
import { getSampleWeeklyActivities } from '@/lib/management/sample-data';
import { weeklyActivitiesQuerySchema } from '@/lib/validations/management-filters';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      sample: searchParams.get('sample') || undefined,
    };

    // Validate query parameters
    const validation = weeklyActivitiesQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const useSampleData = validation.data.sample === true;

    if (useSampleData) {
      const sampleActivities = getSampleWeeklyActivities();

      // Calculate stats from sample data
      const activityTypeCounts: Record<string, number> = {};
      const dailyCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};

      sampleActivities.forEach(activity => {
        const typeKey = activity.entityType as string;
        activityTypeCounts[typeKey] = (activityTypeCounts[typeKey] || 0) + 1;

        const date = new Date(activity.timestamp).toLocaleDateString();
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;

        userCounts[activity.performedBy] = (userCounts[activity.performedBy] || 0) + 1;
      });

      // Find most active day and user
      const mostActiveDay = Object.entries(dailyCounts).reduce((a, b) => a[1] > b[1] ? a : b);
      const mostActiveUser = Object.entries(userCounts).reduce((a, b) => a[1] > b[1] ? a : b);

      const topPerformers = Object.entries(userCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topActivityType = Object.entries(activityTypeCounts)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0] as any;

      const stats = {
        total: sampleActivities.length,
        byType: activityTypeCounts,
        byDay: dailyCounts,
        topPerformers,
        mostActiveDay: mostActiveDay[0],
        topActivityType,
        comparisonToPreviousWeek: 0,
      };

      return NextResponse.json({
        activities: sampleActivities,
        stats,
      });
    }

    const [activities, stats] = await Promise.all([
      getWeeklyActivities(),
      getWeeklyActivityStats(),
    ]);

    return NextResponse.json({
      activities,
      stats,
    });
  } catch (error) {
    logger.error(`Error in weekly-activities API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch weekly activities' },
      { status: 500 }
    );
  }
}
