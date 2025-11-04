import { NextRequest, NextResponse } from 'next/server';
import { getActiveContracts, getActiveContractsStats } from '@/lib/management/active-contracts';
import { getSampleActiveContracts } from '@/lib/management/sample-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useSampleData = searchParams.get('sample') === 'true';

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
    console.error('Error in contracts API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active contracts' },
      { status: 500 }
    );
  }
}
