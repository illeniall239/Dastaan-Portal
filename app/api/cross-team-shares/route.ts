import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { NotificationRepository } from '@/lib/repositories/notification-repository';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction') || 'all'; // sent | received | all

    // Get user's team_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single();

    const teamId = userProfile?.team_id;

    let query = supabase
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
          team_id
        ),
        from_team:teams!cross_team_shares_from_team_id_fkey (id, name, team_type),
        to_team:teams!cross_team_shares_to_team_id_fkey (id, name, team_type),
        shared_by_user:users!cross_team_shares_shared_by_fkey (id, name, email, role)
      `)
      .order('shared_at', { ascending: false });

    // Filter by direction for non-admin/management users
    if (!['admin', 'management'].includes(user.role) && teamId) {
      if (direction === 'sent') {
        query = query.eq('from_team_id', teamId);
      } else if (direction === 'received') {
        query = query.eq('to_team_id', teamId);
      } else {
        query = query.or(`from_team_id.eq.${teamId},to_team_id.eq.${teamId}`);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching cross-team shares:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch cross-team shares' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const { call_report_id, to_team_id, notes, evaluation_deadline, required_evaluations } = body;

    if (!call_report_id || !to_team_id) {
      return new Response(JSON.stringify({ error: 'call_report_id and to_team_id are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user's team
    const { data: userProfile } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.team_id) {
      return new Response(JSON.stringify({ error: 'User is not assigned to a team' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const from_team_id = userProfile.team_id;

    if (from_team_id === to_team_id) {
      return new Response(JSON.stringify({ error: 'Cannot share to your own team' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the call report belongs to the user's team
    const { data: callReport } = await supabase
      .from('call_reports')
      .select('id, team_id')
      .eq('id', call_report_id)
      .single();

    if (!callReport) {
      return new Response(JSON.stringify({ error: 'Call report not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user is team head or admin/management
    const isAdmin = ['admin', 'management'].includes(user.role);
    if (!isAdmin) {
      const { data: team } = await supabase
        .from('teams')
        .select('team_head_id')
        .eq('id', from_team_id)
        .single();

      if (team?.team_head_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Only team heads can share content' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Verify target team exists
    const { data: targetTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('id', to_team_id)
      .single();

    if (!targetTeam) {
      return new Response(JSON.stringify({ error: 'Target team not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('cross_team_shares')
      .insert([{
        call_report_id,
        from_team_id,
        to_team_id,
        shared_by: user.id,
        notes: notes || null,
        evaluation_deadline: evaluation_deadline || null,
        required_evaluations: required_evaluations || 3,
      }])
      .select(`
        *,
        call_report:call_reports (id, call_report_id, working_title),
        from_team:teams!cross_team_shares_from_team_id_fkey (id, name),
        to_team:teams!cross_team_shares_to_team_id_fkey (id, name),
        shared_by_user:users!cross_team_shares_shared_by_fkey (id, name, email)
      `);

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'An evaluation request already exists for this team' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(error.message);
    }

    // Send notifications to receiving team's evaluators (non-blocking)
    try {
      const shareRecord = data[0];
      const fromTeamName = shareRecord.from_team?.name || 'Another team';
      const reportTitle = shareRecord.call_report?.working_title || 'A call report';

      // Get all members of the receiving team
      const { data: teamMembers } = await supabase
        .from('users')
        .select('id, role')
        .eq('team_id', to_team_id);

      if (teamMembers && teamMembers.length > 0) {
        // Notify evaluators + team head
        const recipientIds = teamMembers
          .filter((m) => m.role === 'evaluator' || m.role === 'content_creator' || m.role === 'content_manager')
          .map((m) => m.id);

        if (recipientIds.length > 0) {
          const notifRepo = new NotificationRepository('admin');
          await notifRepo.createNotificationsForUsers(
            recipientIds,
            'info',
            'New evaluation request from another team',
            `"${reportTitle}" — ${fromTeamName} is requesting your team's evaluation`,
            'call_report',
            call_report_id
          );
        }
      }
    } catch (notifError) {
      // Notification failure should not fail the share
      logger.error('Failed to send cross-team share notifications:', notifError);
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "cross_team_share",
      entityId: data[0].id,
      action: "created",
      performedBy: user.id,
      details: { ...requestContext, newValues: { call_report_id, from_team_id, to_team_id } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return new Response(JSON.stringify(data[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error creating cross-team share:', error);
    return new Response(JSON.stringify({ error: 'Failed to create cross-team share' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
