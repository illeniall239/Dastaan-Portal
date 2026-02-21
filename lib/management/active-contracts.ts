import { createAdminClient } from '@/lib/supabase/admin';

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
  source: 'contract' | 'negotiation';
}

export async function getActiveContracts(): Promise<ActiveContract[]> {
  const supabase = createAdminClient();
  const results: ActiveContract[] = [];

  // --- 1. Fetch actual contracts (if any exist) ---
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select(`
      *,
      stories!left (
        id,
        story_id,
        title
      )
    `)
    .order('created_at', { ascending: false });

  if (contractsError) {
    console.error('[active-contracts] contracts query error:', contractsError.message);
  } else {
    for (const contract of contracts || []) {
      const story = (contract as any).stories;
      const totalValue = parseFloat((contract as any).total_value) || 0;
      const signedDate =
        (contract as any).party_b_signature_date ||
        (contract as any).party_a_signature_date ||
        (contract as any).contract_start_date ||
        (contract as any).created_at;

      results.push({
        id: contract.id,
        contract_id: (contract as any).contract_id || `CON-${contract.id.slice(0, 8).toUpperCase()}`,
        story_title: story?.title || (contract as any).project_title || 'Unknown',
        story_id: story?.story_id || 'N/A',
        total_amount: totalValue,
        signed_date: signedDate,
        status: (contract as any).status || 'unknown',
        milestones_completed: 0,
        milestones_total: 0,
        milestone_progress: 0,
        paid_amount: 0,
        remaining_amount: totalValue,
        source: 'contract',
      });
    }
  }

  // --- 2. Fetch agreed negotiations as completed contract terms ---
  const { data: negotiations, error: negotiationsError } = await supabase
    .from('negotiations')
    .select(`
      *,
      stories!left (
        id,
        story_id,
        title
      ),
      call_reports!left (
        call_report_id,
        working_title
      )
    `)
    .in('status', ['agreed', 'in_progress'])
    .order('updated_at', { ascending: false });

  if (negotiationsError) {
    console.error('[active-contracts] negotiations query error:', negotiationsError.message);
  } else {
    for (const neg of negotiations || []) {
      const story = (neg as any).stories;
      const callReport = (neg as any).call_reports;
      const value =
        parseFloat((neg as any).agreed_price) ||
        parseFloat((neg as any).proposed_price) ||
        0;

      results.push({
        id: neg.id,
        contract_id: (neg as any).negotiation_id || `NEG-${neg.id.slice(0, 8).toUpperCase()}`,
        story_title:
          story?.title || callReport?.working_title || 'Unknown',
        story_id:
          story?.story_id || callReport?.call_report_id || 'N/A',
        total_amount: value,
        signed_date: (neg as any).updated_at || (neg as any).created_at,
        status: (neg as any).status,
        milestones_completed: 0,
        milestones_total: 0,
        milestone_progress: 0,
        paid_amount: 0,
        remaining_amount: value,
        source: 'negotiation',
      });
    }
  }

  // Sort by signed_date descending
  return results.sort(
    (a, b) => new Date(b.signed_date).getTime() - new Date(a.signed_date).getTime()
  );
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
