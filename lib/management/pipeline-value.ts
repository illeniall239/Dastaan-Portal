import { createClient } from '@/lib/supabase/server';

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

export async function getPipelineValue() {
  const supabase = await createClient();

  // Get contracts
  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      id,
      total_amount,
      status,
      signed_date,
      updated_at,
      story:stories (
        id,
        story_id,
        title
      )
    `)
    .in('status', ['active', 'pending', 'in_progress']);

  // Get negotiations
  const { data: negotiations } = await supabase
    .from('negotiations')
    .select(`
      id,
      proposed_price,
      status,
      last_updated,
      created_at,
      story:stories (
        id,
        story_id,
        title
      )
    `)
    .in('status', ['pending', 'in_progress', 'counter_offer']);

  const items: PipelineItem[] = [];

  // Process contracts
  (contracts || []).forEach(contract => {
    const story = contract.story as any;
    items.push({
      id: contract.id,
      type: 'contract',
      story_id: story?.story_id || 'N/A',
      story_title: story?.title || 'Unknown',
      value: contract.total_amount,
      status: contract.status,
      stage: 'Contracted',
      last_update: contract.updated_at,
      created_at: contract.signed_date || contract.updated_at,
    });
  });

  // Process negotiations
  (negotiations || []).forEach(negotiation => {
    const story = negotiation.story as any;
    items.push({
      id: negotiation.id,
      type: 'negotiation',
      story_id: story?.story_id || 'N/A',
      story_title: story?.title || 'Unknown',
      value: negotiation.proposed_price,
      status: negotiation.status,
      stage: 'In Negotiation',
      last_update: negotiation.last_updated || negotiation.created_at,
      created_at: negotiation.created_at,
    });
  });

  return items.sort((a, b) => new Date(b.last_update).getTime() - new Date(a.last_update).getTime());
}

export async function getPipelineValueStats() {
  const items = await getPipelineValue();

  const stats = {
    totalValue: items.reduce((sum, item) => sum + item.value, 0),
    contractValue: items.filter(i => i.type === 'contract').reduce((sum, i) => sum + i.value, 0),
    negotiationValue: items.filter(i => i.type === 'negotiation').reduce((sum, i) => sum + i.value, 0),
    totalCount: items.length,
    contractCount: items.filter(i => i.type === 'contract').length,
    negotiationCount: items.filter(i => i.type === 'negotiation').length,
    avgDealSize: 0,
  };

  if (items.length > 0) {
    stats.avgDealSize = Math.round(stats.totalValue / items.length);
  }

  return stats;
}
