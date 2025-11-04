import { NextRequest, NextResponse } from 'next/server';
import { getPipelineValue, getPipelineValueStats } from '@/lib/management/pipeline-value';
import { getSamplePipelineValue } from '@/lib/management/sample-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useSampleData = searchParams.get('sample') === 'true';

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
    console.error('Error in pipeline-value API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline value' },
      { status: 500 }
    );
  }
}
