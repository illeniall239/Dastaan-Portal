import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id: shareId } = await params;
    const body = await request.json();

    // Verify the share exists and is not cancelled/completed
    const { data: share, error: shareError } = await supabase
      .from('cross_team_shares')
      .select('*, to_team:teams!cross_team_shares_to_team_id_fkey (id, name)')
      .eq('id', shareId)
      .single();

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: 'Cross-team share not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (share.status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'This share has been cancelled' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user belongs to the receiving team (or is admin)
    const isAdmin = ['admin', 'management'].includes(user.role);
    if (!isAdmin) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.team_id !== share.to_team_id) {
        return new Response(JSON.stringify({ error: 'You are not part of the receiving team' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Check if user already submitted for this share
    const { data: existing } = await supabase
      .from('evaluator_forms')
      .select('id')
      .eq('cross_team_share_id', shareId)
      .eq('evaluator_id', user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'You have already submitted an evaluation for this share' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      conflict_of_content_score,
      characterization_score,
      story_progression_score,
      whats_next_element_score,
      overall_oneliner_grade_score,
      decision,
      comments,
    } = body;

    // Validate scores
    const scores = [conflict_of_content_score, characterization_score, story_progression_score, whats_next_element_score, overall_oneliner_grade_score];
    if (scores.some(s => s === undefined || s === null || s < 1 || s > 10)) {
      return new Response(JSON.stringify({ error: 'All scores must be between 1 and 10' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const average_score = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Generate form_id
    const timestamp = Date.now().toString(36);
    const form_id = `CTX-${timestamp}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

    const { data, error } = await supabase
      .from('evaluator_forms')
      .insert([{
        form_id,
        call_report_id: share.call_report_id,
        evaluator_id: user.id,
        cross_team_share_id: shareId,
        conflict_of_content_score,
        characterization_score,
        story_progression_score,
        whats_next_element_score,
        overall_oneliner_grade_score,
        average_score,
        decision: decision || null,
        comments: comments || null,
        submitted_at: new Date().toISOString(),
      }])
      .select();

    if (error) {
      throw new Error(error.message);
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "cross_team_evaluation",
      entityId: data[0].id,
      action: "submitted",
      performedBy: user.id,
      details: { ...requestContext, newValues: { cross_team_share_id: shareId, average_score, decision } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return new Response(JSON.stringify(data[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error submitting cross-team evaluation:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit evaluation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
