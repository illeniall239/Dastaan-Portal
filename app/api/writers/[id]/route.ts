import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireApiAuth } from '@/lib/api/auth';
import { updateWriterEngagementSchema } from '@/lib/validations/writer-engagements';
import { logger } from '@/lib/logger';
import { applyRateLimit, addRateLimitHeaders } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const auth = await requireApiAuth();
    if (!auth.success) return auth.response;

    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('writer_engagements')
      .select(`
        id,
        writer_id,
        date_engaged,
        time_slot,
        notes,
        created_by,
        created_at,
        updated_at,
        writer:writers (id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Fetch creator name separately (avoids PostgREST FK dependency on users table)
    let creator = null;
    if (data.created_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', data.created_by)
        .single();
      creator = userData || null;
    }

    return addRateLimitHeaders(
      NextResponse.json({ ...data, creator }),
      rate.result
    );
  } catch (error) {
    logger.error('Error fetching writer engagement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch writer engagement' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const auth = await requireApiAuth();
    if (!auth.success) return auth.response;

    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    const validation = updateWriterEngagementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { writer_id, date_engaged, time_slot, notes } = validation.data;

    const { user } = auth;

    const { data, error } = await supabase
      .from('writer_engagements')
      .update({
        writer_id,
        date_engaged,
        time_slot: time_slot || null,
        notes: notes || null,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "writer_engagement",
      entityId: id,
      action: "updated",
      performedBy: user.id,
      details: { ...requestContext, newValues: { writer_id, date_engaged, time_slot } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return addRateLimitHeaders(
      NextResponse.json(data[0]),
      rate.result
    );
  } catch (error) {
    logger.error('Error updating writer engagement:', error);
    return NextResponse.json(
      { error: 'Failed to update writer engagement' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.strict);
    if (!rate.success) return rate.response!;

    const auth = await requireApiAuth();
    if (!auth.success) return auth.response;

    const supabase = await createClient();
    const { id } = await params;

    const { user } = auth;

    const { error } = await supabase
      .from('writer_engagements')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "writer_engagement",
      entityId: id,
      action: "deleted",
      performedBy: user.id,
      details: { ...requestContext },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return addRateLimitHeaders(
      NextResponse.json({ success: true }),
      rate.result
    );
  } catch (error) {
    logger.error('Error deleting writer engagement:', error);
    return NextResponse.json(
      { error: 'Failed to delete writer engagement' },
      { status: 500 }
    );
  }
}
