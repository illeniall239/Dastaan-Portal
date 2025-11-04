import { NextRequest, NextResponse } from 'next/server';
import { getOverduePayments, getOverduePaymentsStats } from '@/lib/management/overdue-payments';
import { getSampleOverduePayments } from '@/lib/management/sample-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useSampleData = searchParams.get('sample') === 'true';

    if (useSampleData) {
      const samplePayments = getSampleOverduePayments();

      // Calculate stats from sample data
      const severityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      let totalAmount = 0;

      samplePayments.forEach(payment => {
        const daysOverdue = payment.days_overdue;
        const severity = daysOverdue >= 60 ? 'critical' :
                        daysOverdue >= 30 ? 'high' :
                        daysOverdue >= 14 ? 'medium' : 'low';
        severityCounts[severity]++;
        totalAmount += payment.amount;
      });

      const stats = {
        total: samplePayments.length,
        bySeverity: severityCounts,
        totalAmount,
        averageDaysOverdue: Math.round(
          samplePayments.reduce((sum, p) => sum + p.days_overdue, 0) / samplePayments.length
        ),
      };

      return NextResponse.json({
        payments: samplePayments,
        stats,
      });
    }

    const [payments, stats] = await Promise.all([
      getOverduePayments(),
      getOverduePaymentsStats(),
    ]);

    return NextResponse.json({
      payments,
      stats,
    });
  } catch (error) {
    console.error('Error in overdue payments API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overdue payments' },
      { status: 500 }
    );
  }
}
