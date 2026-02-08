import { createAdminClient } from '@/lib/supabase/admin';
import { handleError } from '@/lib/errors';

export interface PipelineItem {
  id: string;
  type: 'contract' | 'contractTerm';
  story_id: string;
  story_title: string;
  value: number;
  status: string;
  stage: string;
  last_update: string;
  created_at: string;
}

export async function getPipelineValue() {
  const supabase = createAdminClient();

  const { data: contracts, error: contractsError } = await supabase
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

  if (contractsError) {
    return handleError(contractsError, {
      context: 'getPipelineValue:contracts',
      fallbackValue: [],
      userMessage: 'Failed to fetch contract values',
    });
  }

  // Get negotiations
  const { data: contractTerms, error: negotiationsError } = await supabase
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

  if (negotiationsError) {
    return handleError(negotiationsError, {
      context: 'getPipelineValue:negotiations',
      fallbackValue: [],
      userMessage: 'Failed to fetch negotiation values',
    });
  }

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

  // Process contract terms
  (contractTerms || []).forEach(contractTerm => {
    const story = contractTerm.story as any;
    items.push({
      id: contractTerm.id,
      type: 'contractTerm',
      story_id: story?.story_id || 'N/A',
      story_title: story?.title || 'Unknown',
      value: contractTerm.proposed_price,
      status: contractTerm.status,
      stage: 'Contract Terms',
      last_update: contractTerm.last_updated || contractTerm.created_at,
      created_at: contractTerm.created_at,
    });
  });

  return items.sort((a, b) => new Date(b.last_update).getTime() - new Date(a.last_update).getTime());
}

export async function getPipelineValueStats() {
  const items = await getPipelineValue();

  const stats = {
    totalValue: items.reduce((sum, item) => sum + item.value, 0),
    contractValue: items.filter(i => i.type === 'contract').reduce((sum, i) => sum + i.value, 0),
    contractTermValue: items.filter(i => i.type === 'contractTerm').reduce((sum, i) => sum + i.value, 0),
    totalCount: items.length,
    contractCount: items.filter(i => i.type === 'contract').length,
    contractTermCount: items.filter(i => i.type === 'contractTerm').length,
    avgDealSize: 0,
  };

  if (items.length > 0) {
    stats.avgDealSize = Math.round(stats.totalValue / items.length);
  }

  return stats;
}
