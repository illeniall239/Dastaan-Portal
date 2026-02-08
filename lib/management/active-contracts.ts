import { createAdminClient } from '@/lib/supabase/admin';
import { handleError } from '@/lib/errors';

export interface ActiveContract {
  id: string;
  contract_id: string;
  story_title: string;
  story_id: string;
  total_amount: number;
  signed_date: string;
  status: string;
  milestones_completed: number;
  milestones_total: number;
  milestone_progress: number;
  paid_amount: number;
  remaining_amount: number;
}

export async function getActiveContracts() {
  const supabase = createAdminClient();

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_number,
      total_amount,
      signed_date,
      status,
      updated_at,
      story:stories (
        id,
        story_id,
        title
      ),
      payment_schedules (
        id,
        milestone_number,
        status
      ),
      payments (
        amount,
        status
      )
    `)
    .eq('status', 'active')
    .order('signed_date', { ascending: false });

  if (error) {
    return handleError(error, {
      context: 'getActiveContracts',
      fallbackValue: [],
      userMessage: 'Failed to fetch active contracts',
    });
  }

  const activeContracts: ActiveContract[] = (contracts || []).map(contract => {
    const story = contract.story as any;
    const paymentSchedules = (contract.payment_schedules as any[]) || [];
    const payments = (contract.payments as any[]) || [];

    // Calculate milestone progress
    const milestonesTotal = paymentSchedules.length;
    const milestonesCompleted = paymentSchedules.filter(
      (ps: any) => ps.status === 'completed' || ps.status === 'paid'
    ).length;
    const milestoneProgress = milestonesTotal > 0
      ? Math.round((milestonesCompleted / milestonesTotal) * 100)
      : 0;

    // Calculate paid amount
    const paidAmount = payments
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    return {
      id: contract.id,
      contract_id: contract.contract_number || `CON-${contract.id.slice(0, 8).toUpperCase()}`,
      story_title: story?.title || 'Unknown',
      story_id: story?.story_id || 'N/A',
      total_amount: contract.total_amount,
      signed_date: contract.signed_date || contract.updated_at,
      status: contract.status,
      milestones_completed: milestonesCompleted,
      milestones_total: milestonesTotal,
      milestone_progress: milestoneProgress,
      paid_amount: paidAmount,
      remaining_amount: contract.total_amount - paidAmount,
    };
  });

  return activeContracts;
}

export async function getActiveContractsStats() {
  const contracts = await getActiveContracts();

  const stats = {
    total: contracts.length,
    totalValue: contracts.reduce((sum, c) => sum + c.total_amount, 0),
    totalPaid: contracts.reduce((sum, c) => sum + c.paid_amount, 0),
    totalRemaining: contracts.reduce((sum, c) => sum + c.remaining_amount, 0),
    avgProgress: 0,
  };

  if (contracts.length > 0) {
    stats.avgProgress = Math.round(
      contracts.reduce((sum, c) => sum + c.milestone_progress, 0) / contracts.length
    );
  }

  return stats;
}
