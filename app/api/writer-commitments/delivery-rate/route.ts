import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  expectedPerDay,
  expectedPerMonth,
  scheduleLabel,
  weeklyToMonthly,
} from "@/lib/writers/commitment-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const [
      { data: commitments },
      { data: waadas },
      { data: episodes },
      { data: callReports },
    ] = await Promise.all([
      admin.from("writer_commitments")
        .select("id, call_report_id, writer_id, commitment_schedule, project_initiation_date, commitment_date, revised_commitment_date, is_delivered"),
      admin.from("writer_waadas")
        .select("id, writer_commitment_id, waada_number, start_date, end_date, commitment_per_week")
        .order("waada_number"),
      admin.from("episodes")
        .select("id, call_report_id, created_at")
        .eq("is_current", true),
      admin.from("call_reports")
        .select("id, working_title, writer_name, total_episodes, team_id, target_slot, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))")
        .is("archived_at", null)
        .eq("meeting_type", "call_report"),
    ]);

    // Episode data per call_report: dates + count
    const epMap = new Map<string, { count: number; dates: Date[]; firstDate: Date | null }>();
    for (const ep of episodes || []) {
      if (!ep.call_report_id) continue;
      const e = epMap.get(ep.call_report_id) || { count: 0, dates: [], firstDate: null };
      e.count++;
      const d = new Date(ep.created_at);
      e.dates.push(d);
      if (!e.firstDate || d < e.firstDate) e.firstDate = d;
      epMap.set(ep.call_report_id, e);
    }

    // Waadas grouped by writer_commitment_id
    const waadaMap = new Map<string, typeof waadas>();
    for (const w of waadas || []) {
      const arr = waadaMap.get(w.writer_commitment_id) || [];
      arr.push(w);
      waadaMap.set(w.writer_commitment_id, arr);
    }

    // Call reports map
    const crMap = new Map((callReports || []).map((cr) => [cr.id, cr]));
    const now = new Date();

    type WaadaDetail = {
      id: string;
      number: number;
      startDate: string;
      endDate: string | null;
      weeks: number;
      commitmentPerWeek: number;
      commitmentPerMonth: number;
      committedEps: number;
      receivedEps: number;
      months: number;
      ratePerMonth: number;
      deliveryRatePercent: number;
      cumulativeCommittedEps: number | null; // null for waada 1
      cumulativeReceivedEps: number | null;  // null for waada 1
    };

    type ProjectRow = {
      id: string;
      commitmentId: string;
      title: string;
      writer: string;
      teamName: string | null;
      teamId: string | null;
      slot: string | null;
      totalEpisodes: number | null;
      inHandEpisodes: number;
      commitmentDate: string | null;
      deadline: string | null;
      standard: {
        commitmentPerWeek: number;
        commitmentPerMonth: number;
        scheduleLabel: string;
        firstEpDate: string | null;
        weeks: number;
        months: number;
        totalCommitted: number;
        deliveryRatePerMonth: number;
        deliveryRatePercent: number;
      };
      waadas: WaadaDetail[];
      summaryRates: {
        standard: number;
        waada1: number | null;
        waada2: number | null;
        waada3: number | null;
        waada4: number | null;
      };
    };

    const projects: ProjectRow[] = [];

    for (const wc of commitments || []) {
      const cr = crMap.get(wc.call_report_id);
      if (!cr) continue;

      const schedule = wc.commitment_schedule;
      const rate = expectedPerDay(schedule);
      const perMonth = expectedPerMonth(schedule);
      const perWeek = rate * 7;

      const ep = epMap.get(cr.id);
      const actualEps = ep?.count || 0;
      const firstDate = ep?.firstDate || null;

      // Standard delivery rate — always from project_initiation_date
      const startRef = new Date(wc.project_initiation_date);
      // End reference: use deadline if it exists and has passed, otherwise now
      const deadlineDate = wc.revised_commitment_date ? new Date(wc.revised_commitment_date) : (wc.commitment_date ? new Date(wc.commitment_date) : null);
      const endRef = (deadlineDate && deadlineDate <= now) ? deadlineDate : now;
      const msElapsed = endRef.getTime() - startRef.getTime();
      const weeks = Math.max(msElapsed / (1000 * 60 * 60 * 24 * 7), 0.1);
      const months = Math.max(msElapsed / (1000 * 60 * 60 * 24 * 30), 0.1);
      let totalCommitted = perMonth * months;
      if (cr.total_episodes) totalCommitted = Math.min(totalCommitted, cr.total_episodes);
      const deliveryRatePerMonth = months > 0 ? actualEps / months : 0;
      const standardRate = totalCommitted > 0 ? Math.round((actualEps / totalCommitted) * 100) : 0;

      // Team display name
      const team: any = Array.isArray(cr.team) ? cr.team[0] : cr.team;
      const head: any = team?.team_head ? (Array.isArray(team.team_head) ? team.team_head[0] : team.team_head) : null;
      const teamDisplay = head?.name ? `Team ${head.name.split(" ")[0]}` : team?.name || null;

      // Waada details
      const wcWaadas = waadaMap.get(wc.id) || [];
      const waadaDetails: WaadaDetail[] = wcWaadas.map((w) => {
        const wStart = new Date(w.start_date);
        const wEndRaw = w.end_date ? new Date(w.end_date) : null;
        // Use end_date if it's in the past, otherwise use now (ongoing waada)
        const wEnd = wEndRaw && wEndRaw <= now ? wEndRaw : now;
        const wMs = wEnd.getTime() - wStart.getTime();
        const wWeeks = Math.max(wMs / (1000 * 60 * 60 * 24 * 7), 0.1);
        const wMonths = Math.max(wMs / (1000 * 60 * 60 * 24 * 30), 0.1);
        const wpw = Number(w.commitment_per_week);
        const wCommitted = wpw * wWeeks;
        const wPerMonth = wpw * 4; // commitment/week * 4

        // Count episodes received during this waada period (use actual end date for range, or now if ongoing)
        const epEnd = wEndRaw || now;
        const epsInRange = (ep?.dates || []).filter((d) => d >= wStart && d <= epEnd).length;
        const wRate = wCommitted > 0 ? Math.round((epsInRange / wCommitted) * 100) : 0;
        const wRatePerMonth = wMonths > 0 ? epsInRange / wMonths : 0;

        return {
          id: w.id,
          number: w.waada_number,
          startDate: w.start_date,
          endDate: w.end_date,
          weeks: Math.round(wWeeks * 10) / 10,
          commitmentPerWeek: wpw,
          commitmentPerMonth: Math.round(wPerMonth * 10) / 10,
          committedEps: Math.round(wCommitted * 10) / 10,
          receivedEps: epsInRange,
          months: Math.round(wMonths * 10) / 10,
          ratePerMonth: Math.round(wRatePerMonth * 10) / 10,
          deliveryRatePercent: wRate,
          cumulativeCommittedEps: null,
          cumulativeReceivedEps: null,
        };
      });

      // Compute cumulative totals for waada 2+
      waadaDetails.sort((a, b) => a.number - b.number);
      let cumCommitted = 0;
      let cumReceived = 0;
      for (const wd of waadaDetails) {
        cumCommitted += wd.committedEps;
        cumReceived += wd.receivedEps;
        if (wd.number >= 2) {
          wd.cumulativeCommittedEps = Math.round(cumCommitted * 10) / 10;
          wd.cumulativeReceivedEps = cumReceived;
        }
      }

      projects.push({
        id: cr.id,
        commitmentId: wc.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "Unknown",
        teamName: teamDisplay,
        teamId: cr.team_id,
        slot: cr.target_slot || null,
        totalEpisodes: cr.total_episodes || null,
        inHandEpisodes: actualEps,
        commitmentDate: wc.commitment_date || null,
        deadline: wc.revised_commitment_date || wc.commitment_date || null,
        standard: {
          commitmentPerWeek: Math.round(perWeek * 10) / 10,
          commitmentPerMonth: Math.round(perMonth * 10) / 10,
          scheduleLabel: rate > 0 ? scheduleLabel(schedule) : "Custom",
          firstEpDate: firstDate ? firstDate.toISOString().slice(0, 10) : null,
          weeks: Math.round(weeks * 10) / 10,
          months: Math.round(months * 10) / 10,
          totalCommitted: Math.round(totalCommitted * 10) / 10,
          deliveryRatePerMonth: Math.round(deliveryRatePerMonth * 10) / 10,
          deliveryRatePercent: rate > 0 ? standardRate : -1, // -1 = N/A
        },
        waadas: waadaDetails,
        summaryRates: {
          standard: rate > 0 ? standardRate : -1,
          waada1: waadaDetails.find((w) => w.number === 1)?.deliveryRatePercent ?? null,
          waada2: waadaDetails.find((w) => w.number === 2)?.deliveryRatePercent ?? null,
          waada3: waadaDetails.find((w) => w.number === 3)?.deliveryRatePercent ?? null,
          waada4: waadaDetails.find((w) => w.number === 4)?.deliveryRatePercent ?? null,
        },
      });
    }

    // Sort by standard rate ascending (worst first)
    projects.sort((a, b) => {
      const ra = a.standard.deliveryRatePercent === -1 ? 999 : a.standard.deliveryRatePercent;
      const rb = b.standard.deliveryRatePercent === -1 ? 999 : b.standard.deliveryRatePercent;
      return ra - rb;
    });

    // Team summary
    const teamMap = new Map<string, { teamId: string; teamName: string; projects: number; totalCommitted: number; totalReceived: number }>();
    for (const p of projects) {
      if (!p.teamId || !p.teamName) continue;
      const t = teamMap.get(p.teamId) || { teamId: p.teamId, teamName: p.teamName, projects: 0, totalCommitted: 0, totalReceived: 0 };
      t.projects++;
      if (p.standard.deliveryRatePercent >= 0) {
        t.totalCommitted += p.standard.totalCommitted;
        t.totalReceived += p.inHandEpisodes;
      }
      teamMap.set(p.teamId, t);
    }

    const teamSummary = Array.from(teamMap.values()).map((t) => ({
      ...t,
      deliveryRate: t.totalCommitted > 0 ? Math.round((t.totalReceived / t.totalCommitted) * 100) : 0,
    })).sort((a, b) => a.deliveryRate - b.deliveryRate);

    // Stats
    const rated = projects.filter((p) => p.standard.deliveryRatePercent >= 0);
    const overallRate = rated.length > 0
      ? Math.round(rated.reduce((s, p) => s + p.standard.deliveryRatePercent, 0) / rated.length)
      : 0;

    return NextResponse.json({
      success: true,
      projects,
      teamSummary,
      stats: {
        totalProjects: projects.length,
        overallRate,
        greenCount: rated.filter((p) => p.standard.deliveryRatePercent >= 85).length,
        greyCount: rated.filter((p) => p.standard.deliveryRatePercent >= 80 && p.standard.deliveryRatePercent < 85).length,
        orangeCount: rated.filter((p) => p.standard.deliveryRatePercent >= 60 && p.standard.deliveryRatePercent < 80).length,
        redCount: rated.filter((p) => p.standard.deliveryRatePercent < 60).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

// POST: Add a new waada
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { writerCommitmentId, startDate, endDate, commitmentPerWeek } = body;

    if (!writerCommitmentId || !startDate || !commitmentPerWeek) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find next waada number
    const { data: existing } = await admin
      .from("writer_waadas")
      .select("waada_number")
      .eq("writer_commitment_id", writerCommitmentId)
      .order("waada_number", { ascending: false })
      .limit(1);

    const nextNumber = (existing?.[0]?.waada_number || 0) + 1;
    if (nextNumber > 4) {
      return NextResponse.json({ error: "Maximum 4 waadas allowed" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("writer_waadas")
      .insert({
        writer_commitment_id: writerCommitmentId,
        waada_number: nextNumber,
        start_date: startDate,
        end_date: endDate || null,
        commitment_per_week: commitmentPerWeek,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, waada: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

// PATCH: Update commitment_date or revised_commitment_date
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { commitmentId, field, value } = body;

    if (!commitmentId || !field) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["commitment_date", "revised_commitment_date"].includes(field)) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("writer_commitments")
      .update({ [field]: value || null })
      .eq("id", commitmentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

// DELETE: Remove a waada
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const waadaId = searchParams.get("id");
    if (!waadaId) return NextResponse.json({ error: "Missing waada id" }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("writer_waadas").delete().eq("id", waadaId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
