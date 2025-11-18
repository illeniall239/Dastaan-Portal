import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getPipelineValue, getPipelineValueStats } from '@/lib/management/pipeline-value';

export async function GET(request: NextRequest) {
  try {
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
