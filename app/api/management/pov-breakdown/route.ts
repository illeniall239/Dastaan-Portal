import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;

    const admin = createAdminClient();

    const { data: callReports } = await admin
      .from("call_reports")
      .select("id, working_title, writer_name, target_slot, team_id, audience_focus, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))")
      .is("archived_at", null)
      .eq("meeting_type", "call_report");

    // Gender POV comes only from the project (set at logging)
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

    for (const cr of callReports || []) {
      const focus = cr.audience_focus;
      if (!focus) continue;
      const label = LABELS[focus] || focus;
      if (!buckets[label]) buckets[label] = [];

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
