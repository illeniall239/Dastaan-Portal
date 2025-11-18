import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getActiveContracts, getActiveContractsStats } from '@/lib/management/active-contracts';

export async function GET(request: NextRequest) {
  try {
    const [contracts, stats] = await Promise.all([
      getActiveContracts(),
      getActiveContractsStats(),
    ]);

    return NextResponse.json({
      contracts,
      stats,
    });
  } catch (error) {
    logger.error(`Error in contracts API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch active contracts' },
      { status: 500 }
    );
  }
}
