import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createAdminClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('cross_team_shares')
      .select(`
        *,
        call_report:call_reports (
          id,
          call_report_id,
          working_title,
          logline,
          genre,
          writer_name,
          content_type,
          target_slot,
          team_id,
          evaluation_status,
          average_score
        ),
        from_team:teams!cross_team_shares_from_team_id_fkey (id, name, team_type),
        to_team:teams!cross_team_shares_to_team_id_fkey (id, name, team_type),
        shared_by_user:users!cross_team_shares_shared_by_fkey (id, name, email, role)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Also fetch evaluations linked to this share
    const { data: evaluations } = await supabase
      .from('evaluator_forms')
      .select(`
        id,
        form_id,
        evaluator_id,
        premise_conflict_score,
        storyline_plot_score,
        episodic_progression_score,
        characters_score,
        overall_assessment_score,
        average_score,
        decision,
        comments,
        submitted_at,
        evaluator:users!evaluator_forms_evaluator_id_fkey (id, name, email)
      `)
      .eq('cross_team_share_id', id)
      .order('submitted_at', { ascending: false });

    return new Response(JSON.stringify({ ...data, evaluations: evaluations || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching cross-team share:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch cross-team share' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createAdminClient();
    const { id } = await params;
    const body = await request.json();

    // Only allow updating status (cancel), notes, deadline
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status === 'cancelled') {
      updates.status = 'cancelled';
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    if (body.evaluation_deadline !== undefined) {
      updates.evaluation_deadline = body.evaluation_deadline;
    }
    if (body.required_evaluations !== undefined) {
      updates.required_evaluations = body.required_evaluations;
    }

    const { data, error } = await supabase
      .from('cross_team_shares')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify(data[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating cross-team share:', error);
    return new Response(JSON.stringify({ error: 'Failed to update cross-team share' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
