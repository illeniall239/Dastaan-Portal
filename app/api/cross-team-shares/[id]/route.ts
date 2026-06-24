import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

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
        shared_by_user:users!cross_team_shares_shared_by_fkey (id, name, email, role),
        shared_episodes:cross_team_share_episodes (
          id,
          episode_id,
          episode:episodes (
            id,
            episode_number,
            title,
            call_report_id
          )
        )
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
        conflict_of_content_score,
        characterization_score,
        story_progression_score,
        whats_next_element_score,
        overall_oneliner_grade_score,
        average_score,
        decision,
        comments,
        submitted_at,
        evaluator:users!evaluator_forms_evaluator_id_fkey (id, name, email)
      `)
      .eq('cross_team_share_id', id)
      .order('submitted_at', { ascending: false });

    // Also fetch episodic evaluations linked to this share
    // Apply team isolation for management-type teams
    let episodicEvalsQuery = supabase
      .from('episodic_evaluations')
      .select(`
        id,
        episode_id,
        evaluator_id,
        average_score,
        decision,
        comments,
        submitted_at,
        evaluator:users!episodic_evaluations_evaluator_id_fkey (id, name, email),
        episode:episodes!episodic_evaluations_episode_id_fkey (id, episode_number, title)
      `)
      .eq('cross_team_share_id', id);

    if (["programmer", "management"].includes(user.role)) {
      const adminDb = createAdminClient();
      const { data: userProfile } = await adminDb
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .single();
      if (userProfile?.team_id) {
        const { data: team } = await adminDb
          .from("teams")
          .select("team_type")
          .eq("id", userProfile.team_id)
          .single();
        if (team?.team_type === "management") {
          const { data: members } = await adminDb
            .from("users")
            .select("id")
            .eq("team_id", userProfile.team_id);
          const memberIds = (members || []).map((m: any) => m.id);
          episodicEvalsQuery = episodicEvalsQuery.in("evaluator_id", memberIds);
        }
      }
    }

    const { data: episodicEvaluations } = await episodicEvalsQuery
      .order('submitted_at', { ascending: false });

    return new Response(JSON.stringify({ ...data, evaluations: evaluations || [], episodic_evaluations: episodicEvaluations || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching cross-team share:', error);
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

    const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
    if (!rate.success) return rate.response!;

    const supabase = createAdminClient();
    const { id } = await params;
    const body = await request.json();

    // Only allow updating status (cancel), notes, deadline
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: user.id };

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

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "cross_team_share",
      entityId: id,
      action: "updated",
      performedBy: user.id,
      details: { ...requestContext, newValues: updates },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return new Response(JSON.stringify(data[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error updating cross-team share:', error);
    return new Response(JSON.stringify({ error: 'Failed to update cross-team share' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
