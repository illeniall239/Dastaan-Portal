import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireApiAuth } from '@/lib/api/auth';
import { createWriterEngagementSchema } from '@/lib/validations/writer-engagements';
import { applyRateLimit, addRateLimitHeaders } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const auth = await requireApiAuth();
    if (!auth.success) return auth.response;

    const supabase = await createClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const writerId = searchParams.get('writerId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let query = supabase
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
      .order('date_engaged', { ascending: false })
      .order('time_slot', { ascending: true });

    if (writerId) {
      query = query.eq('writer_id', writerId);
    }

    if (dateFrom) {
      query = query.gte('date_engaged', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date_engaged', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Batch-fetch creator names (avoids PostgREST FK dependency on users table)
    const createdByIds = [...new Set(
      (data || []).map(d => d.created_by).filter(Boolean)
    )] as string[];

    let creatorsMap: Record<string, { id: string; name: string }> = {};
    if (createdByIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', createdByIds);
      if (usersData) {
        creatorsMap = Object.fromEntries(
          usersData.map((u: { id: string; name: string }) => [u.id, { id: u.id, name: u.name }])
        );
      }
    }

    const result = (data || []).map(d => ({
      ...d,
      creator: d.created_by ? creatorsMap[d.created_by] || null : null,
    }));

    return addRateLimitHeaders(
      NextResponse.json(result),
      rate.result
    );
  } catch (error) {
    console.error('Error fetching writer engagements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch writer engagements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const auth = await requireApiAuth();
    if (!auth.success) return auth.response;
    const { user } = auth;

    const supabase = await createClient();
    const body = await request.json();

    const validation = createWriterEngagementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { writer_id, date_engaged, time_slot, notes } = validation.data;

    const { data, error } = await supabase
      .from('writer_engagements')
      .insert([{
        writer_id,
        date_engaged,
        time_slot: time_slot || null,
        notes: notes || null,
        created_by: user.id,
      }])
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return addRateLimitHeaders(
      NextResponse.json(data[0], { status: 201 }),
      rate.result
    );
  } catch (error) {
    console.error('Error creating writer engagement:', error);
    return NextResponse.json(
      { error: 'Failed to create writer engagement' },
      { status: 500 }
    );
  }
}
