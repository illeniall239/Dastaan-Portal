import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";

export const dynamic = "force-dynamic";

type ProjectInfo = {
  id: string;
  title: string;
  writer: string;
  slot: string | null;
  teamName: string | null;
  contentType: string | null;
  genres: string[];
  theme: string | null;
  epsReceived: number;
  totalEps: number | null;
  avgScore: number | null;
};

/** Normalize freetext theme into keyword tokens */
function extractThemeKeywords(theme: string): string[] {
  return theme
    .split(/[,&\/]+/)
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, " "))
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/\b\w/g, (c) => c.toUpperCase())); // Title case
}

export async function GET() {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;

    const admin = createAdminClient();

    const [callReports, episodes, negotiations, evalForms] = await Promise.all([
      fetchAll<any>((f, t) => admin.from("call_reports")
        .select("id, working_title, writer_name, theme, genre, content_type, target_slot, total_episodes, team_id, commercial_positioning, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))")
        .is("archived_at", null)
        .eq("meeting_type", "call_report")
        .order("id").range(f, t)),
      // Counted the same way as the Production Phases chart
      fetchAll<any>((f, t) => admin.from("episodes").select("id, call_report_id")
        .eq("is_current", true).not("call_report_id", "is", null).order("id").range(f, t)),
      fetchAll<any>((f, t) => admin.from("negotiations").select("id, call_report_id, estimated_episodes")
        .not("call_report_id", "is", null).order("id").range(f, t)),
      fetchAll<any>((f, t) => admin.from("evaluator_forms").select("id, call_report_id, average_score")
        .not("submitted_at", "is", null).not("average_score", "is", null).order("id").range(f, t)),
    ]);

    // Details shown for each project in the drill-downs, like the Production Phases drill-down
    const epsReceived = new Map<string, number>();
    for (const ep of episodes) epsReceived.set(ep.call_report_id, (epsReceived.get(ep.call_report_id) || 0) + 1);
    const estimatedEps = new Map<string, number>();
    for (const n of negotiations) if (n.estimated_episodes) estimatedEps.set(n.call_report_id, n.estimated_episodes);
    const scores = new Map<string, number[]>();
    for (const ef of evalForms) scores.set(ef.call_report_id, [...(scores.get(ef.call_report_id) || []), ef.average_score]);

    const projectInfo = (cr: any): ProjectInfo => {
      const team: any = Array.isArray(cr.team) ? cr.team[0] : cr.team;
      const head: any = team?.team_head ? (Array.isArray(team.team_head) ? team.team_head[0] : team.team_head) : null;
      const s = scores.get(cr.id);
      return {
        id: cr.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "Unknown",
        slot: cr.target_slot || null,
        teamName: head?.name ? `${head.name}'s Team` : team?.name || null,
        contentType: cr.content_type || null,
        genres: Array.isArray(cr.genre) ? cr.genre : [],
        theme: cr.theme?.trim() || null,
        epsReceived: epsReceived.get(cr.id) || 0,
        totalEps: cr.total_episodes || estimatedEps.get(cr.id) || null,
        avgScore: s ? Math.round((s.reduce((x, y) => x + y, 0) / s.length) * 10) / 10 : null,
      };
    };

    // ── Theme Category (project's Commercial Positioning, set at logging) ──
    const crThemeCategory = new Map<string, string>();
    for (const cr of callReports) {
      if (cr.commercial_positioning) crThemeCategory.set(cr.id, cr.commercial_positioning);
    }

    // Count by category
    const categoryCounts: Record<string, number> = {};
    const categoryProjects: Record<string, ProjectInfo[]> = {};
    for (const [crId, cat] of crThemeCategory) {
      const cr = callReports.find((c) => c.id === crId);
      if (!cr) continue;
      const label = cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      categoryCounts[label] = (categoryCounts[label] || 0) + 1;
      (categoryProjects[label] ||= []).push(projectInfo(cr));
    }

    // Also count projects with no category
    const evaluatedCrIds = new Set(crThemeCategory.keys());
    const unevaluatedCount = callReports.filter((cr) => !evaluatedCrIds.has(cr.id)).length;

    // ── Theme Keywords (from call_reports.theme freetext) ──────────────
    const keywordCounts: Record<string, number> = {};
    const keywordProjects: Record<string, ProjectInfo[]> = {};
    for (const cr of callReports) {
      if (!cr.theme) continue;
      // Each project counts once per keyword, even if its theme repeats it
      for (const kw of new Set(extractThemeKeywords(cr.theme))) {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
        (keywordProjects[kw] ||= []).push(projectInfo(cr));
      }
    }

    // All keywords, most common first (the chart shows the top 8 and a "+N more" list)
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([keyword, count]) => ({ keyword, count, projects: keywordProjects[keyword] || [] }));

    return NextResponse.json({
      success: true,
      themeCategories: Object.entries(categoryCounts).map(([label, count]) => ({
        label,
        count,
        projects: categoryProjects[label] || [],
      })),
      unevaluatedCount,
      topThemes: topKeywords,
      totalProjects: callReports.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
