import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireApiAuth } from '@/lib/api/auth';
import { logger } from '@/lib/logger';
import ExcelJS from 'exceljs';
import { format, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth();
    if (!auth.success) return auth.response;
    const { user } = auth;

    const supabase = await createClient();

    // Fetch current user's team_id and role for team isolation
    const { data: currentUser } = await supabase
      .from('users')
      .select('team_id, role')
      .eq('id', user.id)
      .single();

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const hasGlobalAccess =
      currentUser?.role && ['admin', 'management', 'programmer'].includes(currentUser.role);

    let query = supabase
      .from('writer_engagements')
      .select(`
        id,
        writer_id,
        date_engaged,
        time_slot,
        notes,
        created_by,
        team_id,
        created_at,
        writer:writers (id, name)
      `)
      .order('date_engaged', { ascending: false })
      .order('time_slot', { ascending: true });

    if (!hasGlobalAccess && currentUser?.team_id) {
      query = query.eq('team_id', currentUser.team_id);
    }

    if (dateFrom) query = query.gte('date_engaged', dateFrom);
    if (dateTo) query = query.lte('date_engaged', dateTo);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    // Batch-fetch creator names
    const createdByIds = [...new Set((data || []).map((d) => d.created_by).filter(Boolean))] as string[];
    let creatorsMap: Record<string, string> = {};
    if (createdByIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', createdByIds);
      if (usersData) {
        creatorsMap = Object.fromEntries(usersData.map((u: { id: string; name: string }) => [u.id, u.name]));
      }
    }

    const rows = (data || []).map((d) => ({
      writer: (d.writer as { name?: string } | null)?.name || '',
      date_engaged: d.date_engaged,
      time_slot: d.time_slot || '',
      notes: d.notes || '',
      logged_by: d.created_by ? creatorsMap[d.created_by] || '' : '',
    }));

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dastaan Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Writer Engagements');

    // Header row styling
    sheet.columns = [
      { header: 'Writer', key: 'writer', width: 28 },
      { header: 'Date Engaged', key: 'date_engaged', width: 18 },
      { header: 'Time Slot', key: 'time_slot', width: 16 },
      { header: 'Purpose / Notes', key: 'notes', width: 45 },
      { header: 'Logged By', key: 'logged_by', width: 24 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Data rows
    rows.forEach((row) => {
      const r = sheet.addRow({
        ...row,
        date_engaged: row.date_engaged ? format(parseISO(row.date_engaged), 'MMM d, yyyy') : '',
      });
      r.alignment = { vertical: 'middle', wrapText: true };
    });

    // Alternating row background
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowNumber % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
    });

    // Filename reflects applied filter
    let filename = 'writer-engagements';
    if (dateFrom && dateTo) {
      filename += `_${dateFrom}_to_${dateTo}`;
    }
    filename += '.xlsx';

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('Error exporting writer engagements:', error);
    return NextResponse.json({ error: 'Failed to export engagements' }, { status: 500 });
  }
}
