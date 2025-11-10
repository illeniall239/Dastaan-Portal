import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { PaymentAnalyticsService } from '@/lib/services/analytics';
import { getSampleOverduePayments } from '@/lib/management/sample-data';
import { overduePaymentsQuerySchema } from '@/lib/validations/management-filters';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      sample: searchParams.get('sample') || undefined,
    };

    // Validate query parameters
    const validation = overduePaymentsQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const useSampleData = validation.data.sample === true;

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

    const service = new PaymentAnalyticsService('server');
    const [payments, stats] = await Promise.all([
      service.getOverduePayments(),
      service.getOverduePaymentsStats(),
    ]);

    return NextResponse.json({
      payments,
      stats,
    });
  } catch (error) {
    logger.error(`Error in overdue payments API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch overdue payments' },
      { status: 500 }
    );
  }
}
