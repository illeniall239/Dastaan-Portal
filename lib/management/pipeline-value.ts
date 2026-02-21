import { createAdminClient } from '@/lib/supabase/admin';

export interface PipelineItem {
  id: string;
  type: 'contract' | 'negotiation';
  story_id: string;
  story_title: string;
  value: number;
  status: string;
  stage: string;
  last_update: string;
  created_at: string;
}

export async function getPipelineValue(): Promise<PipelineItem[]> {
  const supabase = createAdminClient();
  const items: PipelineItem[] = [];

  // Get contracts (use * to avoid column name issues)
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select(`
      *,
      story:stories (
        id,
        story_id,
        title
      )
    `)
    .in('status', ['active', 'pending', 'in_progress', 'signed']);

  if (contractsError) {
    console.error('[pipeline-value] contracts query error:', contractsError.message);
  } else {
    (contracts || []).forEach((contract: any) => {
      const story = contract.story;
      // Handle both total_amount and total_value column names
      const value = contract.total_amount ?? contract.total_value ?? 0;
      items.push({
        id: contract.id,
        type: 'contract',
        story_id: story?.story_id || 'N/A',
        story_title: story?.title || 'Unknown',
        value,
        status: contract.status,
        stage: 'Contracted',
        last_update: contract.updated_at || contract.created_at,
        created_at: contract.signed_date || contract.signing_date || contract.updated_at || contract.created_at,
      });
    });
  }

  // Get negotiations (contract terms)
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
    .in('status', ['in_progress', 'agreed']);

  if (negotiationsError) {
    console.error('[pipeline-value] negotiations query error:', negotiationsError.message);
  } else {
    (negotiations || []).forEach((negotiation: any) => {
      const story = negotiation.stories;
      const callReport = negotiation.call_reports;
      const value = negotiation.status === 'agreed'
        ? (negotiation.agreed_price ?? negotiation.proposed_price ?? 0)
        : (negotiation.proposed_price ?? 0);
      items.push({
        id: negotiation.id,
        type: 'negotiation',
        story_id: story?.story_id || callReport?.call_report_id || 'N/A',
        story_title: story?.title || callReport?.working_title || 'Unknown',
        value,
        status: negotiation.status,
        stage: 'Contract Terms',
        last_update: negotiation.updated_at || negotiation.created_at,
        created_at: negotiation.created_at,
      });
    });
  }

  return items.sort(
    (a, b) => new Date(b.last_update).getTime() - new Date(a.last_update).getTime()
  );
}

export async function getPipelineValueStats() {
  const items = await getPipelineValue();

  const contractItems = items.filter(i => i.type === 'contract');
  const negotiationItems = items.filter(i => i.type === 'negotiation');

  const stats = {
    totalValue: items.reduce((sum, i) => sum + (i.value || 0), 0),
    contractValue: contractItems.reduce((sum, i) => sum + (i.value || 0), 0),
    negotiationValue: negotiationItems.reduce((sum, i) => sum + (i.value || 0), 0),
    totalCount: items.length,
    contractCount: contractItems.length,
    negotiationCount: negotiationItems.length,
    avgDealSize: 0,
  };

  if (items.length > 0) {
    stats.avgDealSize = Math.round(stats.totalValue / items.length);
  }

  return stats;
}
