import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getPipelineValue, getPipelineValueStats } from '@/lib/management/pipeline-value';
import { getSamplePipelineValue } from '@/lib/management/sample-data';
import { pipelineValueQuerySchema } from '@/lib/validations/management-filters';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      sample: searchParams.get('sample') || undefined,
    };

    // Validate query parameters
    const validation = pipelineValueQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const useSampleData = validation.data.sample === true;

    if (useSampleData) {
      const sampleItems = getSamplePipelineValue();

      // Calculate stats from sample data
      const stageCounts: Record<string, number> = {};
      let totalValue = 0;

      sampleItems.forEach(item => {
        stageCounts[item.stage] = (stageCounts[item.stage] || 0) + 1;
        totalValue += item.value;
      });

      const stats = {
        total: sampleItems.length,
        byStage: stageCounts,
        totalValue,
        averageValue: totalValue / sampleItems.length,
      };

      return NextResponse.json({
        items: sampleItems,
        stats,
      });
    }

    const [items, stats] = await Promise.all([
      getPipelineValue(),
      getPipelineValueStats(),
    ]);

    return NextResponse.json({
      items,
      stats,
    });
  } catch (error) {
    logger.error(`Error in pipeline-value API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline value' },
      { status: 500 }
    );
  }
}
