import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expectedPerDay, scheduleLabel } from "@/lib/writers/commitment-utils";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;

    const admin = createAdminClient();

    const [{ data: commitments }, { data: episodes }, { data: callReports }, { data: teams }] = await Promise.all([
      admin.from("writer_commitments")
        .select("call_report_id, commitment_schedule, project_initiation_date, commitment_date, revised_commitment_date, revision_reason, is_delivered, delay_notes"),
      admin.from("episodes")
        .select("id, call_report_id, created_at")
        .eq("is_current", true),
      admin.from("call_reports")
        .select("id, working_title, writer_name, total_episodes, team_id, target_slot, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))")
        .is("archived_at", null)
        .eq("meeting_type", "call_report"),
      admin.from("teams")
        .select("id, name, team_head:users!teams_team_head_id_fkey(name)")
        .in("team_type", ["content", "gcm"]),
    ]);

    // Episode count + dates per CR
    const epData = new Map<string, { count: number; firstEp: Date | null; lastEp: Date | null; dates: Date[] }>();
    for (const ep of episodes || []) {
      if (!ep.call_report_id) continue;
      const existing = epData.get(ep.call_report_id) || { count: 0, firstEp: null, lastEp: null, dates: [] };
      existing.count += 1;
      const d = new Date(ep.created_at);
      existing.dates.push(d);
      if (!existing.firstEp || d < existing.firstEp) existing.firstEp = d;
      if (!existing.lastEp || d > existing.lastEp) existing.lastEp = d;
      epData.set(ep.call_report_id, existing);
    }

    const crMap = new Map((callReports || []).map((cr) => [cr.id, cr]));
    const now = new Date();

    type ProjectDelay = {
      id: string;
      title: string;
      writer: string;
      teamName: string | null;
      teamId: string | null;
      slot: string | null;
      totalEpisodes: number | null;
      commitmentSchedule: string;
      scheduleLabel: string;
      initiationDate: string;
      daysSinceInitiation: number;
      expectedEpisodes: number;
      actualEpisodes: number;
      delayEpisodes: number;
      delayWeeks: number;
      actualPaceDays: number | null; // avg days between episodes
      expectedPaceDays: number; // expected days between episodes
      isOnTrack: boolean;
      delayNotes: string | null;
      revisedDate: string | null;
      revisionReason: string | null;
    };

    const projects: ProjectDelay[] = [];

    for (const wc of commitments || []) {
      const cr = crMap.get(wc.call_report_id);
      if (!cr) continue;

      const schedule = wc.commitment_schedule;
      if (!schedule) continue;

      const rate = expectedPerDay(schedule);
      if (rate === 0) continue;

      const initDate = new Date(wc.project_initiation_date);
      const daysSinceInit = Math.floor((now.getTime() - initDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalEps = cr.total_episodes || null;
      const rawExpected = Math.floor(rate * daysSinceInit);
      // Cap expected at total_episodes — can't expect more than the project needs
      const expectedEps = totalEps ? Math.min(rawExpected, totalEps) : rawExpected;

      const ep = epData.get(cr.id);
      const actualEps = ep?.count || 0;
      const delayEps = Math.max(0, expectedEps - actualEps);

      // Actual pace
      let actualPaceDays: number | null = null;
      if (ep && ep.count >= 2 && ep.firstEp && ep.lastEp) {
        const spanMs = ep.lastEp.getTime() - ep.firstEp.getTime();
        actualPaceDays = Math.round((spanMs / (1000 * 60 * 60 * 24)) / (ep.count - 1) * 10) / 10;
      }

      const expectedPaceDays = Math.round((1 / rate) * 10) / 10;
      const delayWeeks = Math.round((delayEps / (rate * 7)) * 10) / 10;

      const team: any = Array.isArray(cr.team) ? cr.team[0] : cr.team;
      const head: any = team?.team_head ? (Array.isArray(team.team_head) ? team.team_head[0] : team.team_head) : null;
      const teamDisplay = head?.name ? `${head.name}'s Team` : team?.name || null;

      projects.push({
        id: cr.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "Unknown",
        teamName: teamDisplay,
        teamId: cr.team_id,
        slot: cr.target_slot || null,
        totalEpisodes: cr.total_episodes || null,
        commitmentSchedule: schedule,
        scheduleLabel: scheduleLabel(schedule),
        initiationDate: wc.project_initiation_date,
        daysSinceInitiation: daysSinceInit,
        expectedEpisodes: expectedEps,
        actualEpisodes: actualEps,
        delayEpisodes: delayEps,
        delayWeeks,
        actualPaceDays,
        expectedPaceDays,
        isOnTrack: delayEps <= 1,
        delayNotes: wc.delay_notes || null,
        revisedDate: wc.revised_commitment_date || null,
        revisionReason: wc.revision_reason || null,
      });
    }

    // Sort by most delayed first
    projects.sort((a, b) => b.delayEpisodes - a.delayEpisodes);

    // Team summary
    const teamSummary = new Map<string, {
      teamId: string;
      teamName: string;
      projectCount: number;
      totalDelayEps: number;
      totalExpected: number;
      totalActual: number;
      avgDelayWeeks: number;
      onTrackCount: number;
    }>();

    for (const p of projects) {
      if (!p.teamId || !p.teamName) continue;
      const existing = teamSummary.get(p.teamId) || {
        teamId: p.teamId,
        teamName: p.teamName,
        projectCount: 0,
        totalDelayEps: 0,
        totalExpected: 0,
        totalActual: 0,
        avgDelayWeeks: 0,
        onTrackCount: 0,
      };
      existing.projectCount += 1;
      existing.totalDelayEps += p.delayEpisodes;
      existing.totalExpected += p.expectedEpisodes;
      existing.totalActual += p.actualEpisodes;
      if (p.isOnTrack) existing.onTrackCount += 1;
      teamSummary.set(p.teamId, existing);
    }

    const teamResults = Array.from(teamSummary.values())
      .map((t) => ({
        ...t,
        avgDelayWeeks: t.projectCount > 0
          ? Math.round((t.totalDelayEps / t.projectCount) * 10) / 10
          : 0,
        delayPercent: t.totalExpected > 0
          ? Math.round(((t.totalExpected - t.totalActual) / t.totalExpected) * 100)
          : 0,
      }))
      .sort((a, b) => b.totalDelayEps - a.totalDelayEps);

    // Summary stats — only count projects with total_episodes for accurate totals
    const capped = projects.filter((p) => p.totalEpisodes != null);
    const totalExpected = capped.reduce((s, p) => s + p.expectedEpisodes, 0);
    const totalActual = capped.reduce((s, p) => s + p.actualEpisodes, 0);
    const totalDelay = projects.reduce((s, p) => s + p.delayEpisodes, 0);
    const onTrack = projects.filter((p) => p.isOnTrack).length;
    const uncappedCount = projects.length - capped.length;

    return NextResponse.json({
      success: true,
      projects,
      teamSummary: teamResults,
      stats: {
        totalProjects: projects.length,
        totalExpected,
        totalActual,
        totalDelay,
        onTrack,
        delayed: projects.length - onTrack,
        overallDelayPercent: totalExpected > 0 ? Math.round(((totalExpected - totalActual) / totalExpected) * 100) : 0,
        uncappedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
