import { createAdminClient } from '@/lib/supabase/admin';
import { handleError } from '@/lib/errors';

export interface OverduePayment {
  id: string;
  payment_id: string;
  story_title: string;
  story_id: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  milestone: string;
  status: string;
  contract_id: string;
}

export async function getOverduePayments() {
  const supabase = createAdminClient();

  const now = new Date();

  // Get all payments that are overdue (status = 'pending' and due_date < now)
  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      due_date,
      milestone_description,
      status,
      contract_id,
      contract:contracts (
        id,
        story:stories (
          id,
          story_id,
          title
        )
      )
    `)
    .eq('status', 'pending')
    .lt('due_date', now.toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    return handleError(error, {
      context: 'getOverduePayments',
      fallbackValue: [],
      userMessage: 'Failed to fetch overdue payments',
    });
  }

  const overduePayments: OverduePayment[] = (payments || []).map(payment => {
    const dueDate = new Date(payment.due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const story = (payment.contract as any)?.story;

    return {
      id: payment.id,
      payment_id: `PAY-${payment.id.slice(0, 8).toUpperCase()}`,
      story_title: story?.title || 'Unknown',
      story_id: story?.story_id || 'N/A',
      amount: payment.amount,
      due_date: payment.due_date,
      days_overdue: daysOverdue,
      milestone: payment.milestone_description || 'N/A',
      status: payment.status,
      contract_id: payment.contract_id,
    };
  });

  return overduePayments;
}

export async function getOverduePaymentsStats() {
  const payments = await getOverduePayments();

  const stats = {
    total: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    avgDaysOverdue: 0,
    criticalCount: 0, // >30 days overdue
  };

  if (payments.length > 0) {
    stats.avgDaysOverdue = Math.round(
      payments.reduce((sum, p) => sum + p.days_overdue, 0) / payments.length
    );
    stats.criticalCount = payments.filter(p => p.days_overdue > 30).length;
  }

  return stats;
}
