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
        shared_by_user:users!cross_team_shares_shared_by_fkey (id, name, email, role),
        shared_episodes:cross_team_share_episodes (
          id,
          episode_id,
          revision_id,
          episode:episodes (
            id,
            episode_number,
            title,
            call_report_id
          )
        )
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

    const shareIds = (data || []).map((s: any) => s.id);

    // Fetch call report revisions linked to these shares
    let crRevRows: any[] = [];
    if (shareIds.length > 0) {
      const { data: crRevData } = await supabase
        .from('cross_team_share_call_report_revisions')
        .select(`
          cross_team_share_id,
          call_report_revision_id,
          revision:call_report_revisions (
            id,
            revision_number,
            attachment_name,
            comment,
            created_at,
            original_submission_date
          )
        `)
        .in('cross_team_share_id', shareIds);
      crRevRows = crRevData || [];
    }

    // Bulk check which shares/items the current user has already evaluated
    let myEvaluatedShareIds = new Set<string>();
    const myEvaluatedEpisodeShareKeys = new Set<string>();  // "episodeId|shareId" (base)
    const myCRRevKeys = new Set<string>();                  // "shareId|revisionId"
    const myEpRevKeys = new Set<string>();                  // "episodeId|shareId|revisionId"

    if (shareIds.length > 0) {
      const [
        { data: myEvals },
        { data: myEpEvals },
        { data: myCRRevEvals },
        { data: myEpRevEvals },
      ] = await Promise.all([
        // Call report base evaluations (revision_id IS NULL)
        supabase
          .from('evaluator_forms')
          .select('cross_team_share_id')
          .eq('evaluator_id', user.id)
          .in('cross_team_share_id', shareIds)
          .is('revision_id', null),
        // Episode base evaluations (revision_id IS NULL)
        supabase
          .from('episodic_evaluations')
          .select('cross_team_share_id, episode_id')
          .eq('evaluator_id', user.id)
          .in('cross_team_share_id', shareIds)
          .is('revision_id', null),
        // Call report revision evaluations (revision_id IS NOT NULL)
        supabase
          .from('evaluator_forms')
          .select('cross_team_share_id, revision_id')
          .eq('evaluator_id', user.id)
          .in('cross_team_share_id', shareIds)
          .not('revision_id', 'is', null),
        // Episode revision evaluations (revision_id IS NOT NULL)
        supabase
          .from('episodic_evaluations')
          .select('cross_team_share_id, episode_id, revision_id')
          .eq('evaluator_id', user.id)
          .in('cross_team_share_id', shareIds)
          .not('revision_id', 'is', null),
      ]);

      myEvaluatedShareIds = new Set((myEvals || []).map((e: any) => e.cross_team_share_id));

      for (const e of myEpEvals || []) {
        myEvaluatedEpisodeShareKeys.add(`${e.episode_id}|${e.cross_team_share_id}`);
      }
      for (const e of myCRRevEvals || []) {
        myCRRevKeys.add(`${e.cross_team_share_id}|${e.revision_id}`);
      }
      for (const e of myEpRevEvals || []) {
        myEpRevKeys.add(`${e.episode_id}|${e.cross_team_share_id}|${e.revision_id}`);
      }
    }

    const enriched = (data || []).map((s: any) => {
      // Call report revisions for this share
      const sharecrRevs = crRevRows.filter((r: any) => r.cross_team_share_id === s.id);

      // Which CR revisions has this user already evaluated?
      const myEvaluatedCRRevisionIds = sharecrRevs
        .filter((r: any) => myCRRevKeys.has(`${s.id}|${r.call_report_revision_id}`))
        .map((r: any) => r.call_report_revision_id);

      // Which episode+revision pairs has this user already evaluated?
      const myEvaluatedEpisodeRevisionKeys = Array.from(myEpRevKeys)
        .filter((k: string) => k.includes(`|${s.id}|`))
        .map((k: string) => {
          const parts = k.split('|');
          return `${parts[0]}|${parts[2]}`; // "episodeId|revisionId"
        });

      return {
        ...s,
        currentUserHasEvaluated: myEvaluatedShareIds.has(s.id),
        myEvaluatedEpisodeIds: (s.shared_episodes || [])
          .filter((se: any) => se.episode_id && !se.revision_id && myEvaluatedEpisodeShareKeys.has(`${se.episode_id}|${s.id}`))
          .map((se: any) => se.episode_id),
        sharedCallReportRevisions: sharecrRevs,
        myEvaluatedCRRevisionIds,
        myEvaluatedEpisodeRevisionKeys,
      };
    });

    return new Response(JSON.stringify(enriched), {
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
    const body = await request.json();
    const {
      call_report_id,
      to_team_id,
      notes,
      evaluation_deadline,
      episode_ids,              // backward compat: plain episode UUID array
      episode_shares,           // new format: [{episode_id, revision_id?}]
      call_report_revision_ids, // new: call report revision UUIDs to share
    } = body;

    // Normalize episode list: prefer episode_shares, fall back to episode_ids
    const normalizedEpisodeShares: { episode_id: string; revision_id: string | null }[] =
      episode_shares
        ? episode_shares.map((s: any) => ({ episode_id: s.episode_id, revision_id: s.revision_id || null }))
        : (episode_ids ?? []).map((id: string) => ({ episode_id: id, revision_id: null }));

    const hasCallReportRevisions = Array.isArray(call_report_revision_ids) && call_report_revision_ids.length > 0;

    // Validate: must share at least something
    if (
      !to_team_id ||
      (!call_report_id && !hasCallReportRevisions && normalizedEpisodeShares.length === 0)
    ) {
      return new Response(JSON.stringify({ error: 'to_team_id and at least one item to share are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user's team and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'management'].includes(user.role);

    // Non-admin users must be on a team
    if (!isAdmin && !userProfile?.team_id) {
      return new Response(JSON.stringify({ error: 'User is not assigned to a team' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let from_team_id: string | null = userProfile?.team_id || null;

    if (from_team_id && from_team_id === to_team_id) {
      return new Response(JSON.stringify({ error: 'Cannot share to your own team' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the call report exists (if provided); also use its team as from_team for management
    if (call_report_id) {
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

      // Management users without a team_id borrow the call report's team
      if (!from_team_id && isAdmin && callReport.team_id) {
        from_team_id = callReport.team_id;
      }
    }

    // Verify user is team head or admin/management
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

    // For episode-only shares by management with no team_id yet, derive from first episode's call report
    if (!from_team_id && isAdmin && normalizedEpisodeShares.length > 0) {
      const { data: epRow } = await supabase
        .from('episodes')
        .select('call_report_id, call_reports!inner(team_id)')
        .eq('id', normalizedEpisodeShares[0].episode_id)
        .single();
      from_team_id = (epRow?.call_reports as any)?.team_id || null;
    }

    if (!from_team_id) {
      return new Response(JSON.stringify({ error: 'Unable to determine source team for this share' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requiredEvaluations =
      (call_report_id ? 1 : 0) +
      (hasCallReportRevisions ? call_report_revision_ids.length : 0) +
      normalizedEpisodeShares.length;

    const { data, error } = await supabase
      .from('cross_team_shares')
      .insert([{
        call_report_id: call_report_id || null,
        from_team_id,
        to_team_id,
        shared_by: user.id,
        notes: notes || null,
        evaluation_deadline: evaluation_deadline || null,
        required_evaluations: requiredEvaluations,
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

    const shareRecord = data[0];

    // Link episodes (base + revisions) to the share
    if (normalizedEpisodeShares.length > 0) {
      const episodeRows = normalizedEpisodeShares.map((s) => ({
        cross_team_share_id: shareRecord.id,
        episode_id: s.episode_id,
        revision_id: s.revision_id || null,
      }));

      const { error: epError } = await supabase
        .from('cross_team_share_episodes')
        .insert(episodeRows);

      if (epError) {
        logger.error('Failed to link episodes to cross-team share:', epError);
      }
    }

    // Link call report revisions to the share
    if (hasCallReportRevisions) {
      const crRevRows = call_report_revision_ids.map((revId: string) => ({
        cross_team_share_id: shareRecord.id,
        call_report_revision_id: revId,
      }));

      const { error: crRevError } = await supabase
        .from('cross_team_share_call_report_revisions')
        .insert(crRevRows);

      if (crRevError) {
        logger.error('Failed to link call report revisions to cross-team share:', crRevError);
      }
    }

    // Send notifications to receiving team's evaluators (non-blocking)
    try {
      const fromTeamName = shareRecord.from_team?.name || 'Another team';
      const reportTitle = shareRecord.call_report?.working_title || null;

      const episodeCount = normalizedEpisodeShares.length;
      const revisionCount = (hasCallReportRevisions ? call_report_revision_ids.length : 0) + normalizedEpisodeShares.filter((s) => s.revision_id).length;

      let notifTitle = 'New evaluation request from another team';
      let notifMessage = '';

      if (reportTitle && episodeCount > 0) {
        notifMessage = `"${reportTitle}" + ${episodeCount} episode${episodeCount !== 1 ? 's' : ''}${revisionCount > 0 ? ` + ${revisionCount} revision${revisionCount !== 1 ? 's' : ''}` : ''} — ${fromTeamName} is requesting your team's evaluation`;
      } else if (reportTitle) {
        notifMessage = `"${reportTitle}"${revisionCount > 0 ? ` + ${revisionCount} revision${revisionCount !== 1 ? 's' : ''}` : ''} — ${fromTeamName} is requesting your team's evaluation`;
      } else {
        notifMessage = `${episodeCount} episode${episodeCount !== 1 ? 's' : ''} shared for evaluation — ${fromTeamName} is requesting your team's evaluation`;
      }

      // Get all members of the receiving team
      const { data: teamMembers } = await supabase
        .from('users')
        .select('id, role')
        .eq('team_id', to_team_id);

      if (teamMembers && teamMembers.length > 0) {
        const recipientIds = teamMembers
          .filter((m) => m.role === 'evaluator' || m.role === 'content_creator' || m.role === 'content_manager')
          .map((m) => m.id);

        if (recipientIds.length > 0) {
          const notifRepo = new NotificationRepository('admin');
          await notifRepo.createNotificationsForUsers(
            recipientIds,
            'info',
            notifTitle,
            notifMessage,
            call_report_id ? 'call_report' : 'cross_team_share',
            call_report_id || shareRecord.id
          );
        }
      }
    } catch (notifError) {
      logger.error('Failed to send cross-team share notifications:', notifError);
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "cross_team_share",
      entityId: shareRecord.id,
      action: "created",
      performedBy: user.id,
      details: {
        ...requestContext,
        newValues: {
          call_report_id: call_report_id || null,
          from_team_id,
          to_team_id,
          episode_shares: normalizedEpisodeShares,
          call_report_revision_ids: call_report_revision_ids || [],
        },
      },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return new Response(JSON.stringify(shareRecord), {
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
