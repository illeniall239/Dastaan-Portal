import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const [{ data: evalForms }, { data: callReports }] = await Promise.all([
      admin
        .from("evaluator_forms")
        .select("call_report_id, audience_focus")
        .not("submitted_at", "is", null)
        .not("audience_focus", "is", null),
      admin
        .from("call_reports")
        .select("id, working_title, writer_name, target_slot, team_id, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))")
        .is("archived_at", null)
        .eq("meeting_type", "call_report"),
    ]);

    // Aggregate audience_focus per call_report (majority vote)
    const crFocusCounts = new Map<string, Map<string, number>>();
    for (const ef of evalForms || []) {
      if (!crFocusCounts.has(ef.call_report_id)) crFocusCounts.set(ef.call_report_id, new Map());
      const m = crFocusCounts.get(ef.call_report_id)!;
      m.set(ef.audience_focus, (m.get(ef.audience_focus) || 0) + 1);
    }

    const LABELS: Record<string, string> = {
      male_centric: "Male Centric",
      female_centric: "Female Centric",
      both: "Both / Ensemble",
    };

    const COLORS: Record<string, string> = {
      "Male Centric": "#3b82f6",
      "Female Centric": "#ec4899",
      "Both / Ensemble": "#8b5cf6",
    };

    const buckets: Record<string, { id: string; title: string; writer: string; slot: string | null; teamName: string | null }[]> = {};

    for (const [crId, counts] of crFocusCounts) {
      let best = "";
      let bestCount = 0;
      for (const [focus, count] of counts) {
        if (count > bestCount) { best = focus; bestCount = count; }
      }
      const label = LABELS[best] || best;
      if (!buckets[label]) buckets[label] = [];

      const cr = (callReports || []).find((c) => c.id === crId);
      if (!cr) continue;
      const team: any = Array.isArray(cr.team) ? cr.team[0] : cr.team;
      const head: any = team?.team_head ? (Array.isArray(team.team_head) ? team.team_head[0] : team.team_head) : null;
      const teamDisplay = head?.name ? `${head.name}'s Team` : team?.name || null;

      buckets[label].push({
        id: cr.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "Unknown",
        slot: cr.target_slot || null,
        teamName: teamDisplay,
      });
    }

    const segments = Object.entries(buckets).map(([label, projects]) => ({
      label,
      count: projects.length,
      color: COLORS[label] || "#6b7280",
      projects,
    }));

    const totalWithFocus = segments.reduce((s, seg) => s + seg.count, 0);
    const totalProjects = (callReports || []).length;

    return NextResponse.json({
      success: true,
      segments,
      totalWithFocus,
      totalProjects,
      noDataYet: totalWithFocus === 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
