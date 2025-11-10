import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getActiveContracts, getActiveContractsStats } from '@/lib/management/active-contracts';
import { getSampleActiveContracts } from '@/lib/management/sample-data';
import { contractsQuerySchema } from '@/lib/validations/management-filters';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      sample: searchParams.get('sample') || undefined,
    };

    // Validate query parameters
    const validation = contractsQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const useSampleData = validation.data.sample === true;

    if (useSampleData) {
      const sampleContracts = getSampleActiveContracts();

      // Calculate stats from sample data
      let totalValue = 0;
      let totalPaid = 0;
      let totalRemaining = 0;
      let totalProgress = 0;

      sampleContracts.forEach(contract => {
        totalValue += contract.total_amount;
        totalPaid += contract.paid_amount;
        totalRemaining += contract.remaining_amount;
        totalProgress += contract.milestone_progress;
      });

      const stats = {
        total: sampleContracts.length,
        totalValue,
        totalPaid,
        totalRemaining,
        avgProgress: sampleContracts.length > 0 ? Math.round(totalProgress / sampleContracts.length) : 0,
      };

      return NextResponse.json({
        contracts: sampleContracts,
        stats,
      });
    }

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
