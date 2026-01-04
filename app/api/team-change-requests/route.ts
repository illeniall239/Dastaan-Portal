import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { team_id, request_type, user_id, reason } = body;

    // Get user profile to include name in notification
    const { data: requester } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single();

    const { data: targetUser } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user_id)
      .single();

    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', team_id)
      .single();

    // Get all admin users to send notifications
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    // Create notifications for all admins
    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: 'team_change_request',
        title: `Team Change Request from ${requester?.name}`,
        message: `${requester?.name} requests to ${request_type} ${targetUser?.name} (${targetUser?.email}) ${request_type === 'add' ? 'to' : 'from'} ${team?.name || 'their team'}. Reason: ${reason}`,
        metadata: {
          team_id,
          request_type,
          requested_user_id: user_id,
          requester_id: user.id,
          reason,
        },
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Team change request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}
