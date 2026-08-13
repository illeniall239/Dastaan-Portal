import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

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

    const [{ data: evalForms }, { data: callReports }] = await Promise.all([
      admin
        .from("evaluator_forms")
        .select("call_report_id, theme_category")
        .not("submitted_at", "is", null)
        .not("theme_category", "is", null),
      admin
        .from("call_reports")
        .select("id, working_title, writer_name, theme, genre, target_slot, team_id, team:teams!call_reports_team_id_fkey(name, team_head:users!teams_team_head_id_fkey(name))")
        .is("archived_at", null)
        .eq("meeting_type", "call_report"),
    ]);

    // ── Theme Category (from evaluator_forms) ──────────────────────────
    // Aggregate per call_report: majority vote if multiple evals
    const crThemeCategory = new Map<string, string>();
    const crCategoryCounts = new Map<string, Map<string, number>>();
    for (const ef of evalForms || []) {
      if (!crCategoryCounts.has(ef.call_report_id)) crCategoryCounts.set(ef.call_report_id, new Map());
      const m = crCategoryCounts.get(ef.call_report_id)!;
      m.set(ef.theme_category, (m.get(ef.theme_category) || 0) + 1);
    }
    for (const [crId, counts] of crCategoryCounts) {
      let best = "";
      let bestCount = 0;
      for (const [cat, count] of counts) {
        if (count > bestCount) { best = cat; bestCount = count; }
      }
      crThemeCategory.set(crId, best);
    }

    // Count by category
    const categoryCounts: Record<string, number> = {};
    const categoryProjects: Record<string, { id: string; title: string; writer: string; slot: string | null; teamName: string | null }[]> = {};
    for (const [crId, cat] of crThemeCategory) {
      const cr = (callReports || []).find((c) => c.id === crId);
      if (!cr) continue;
      const label = cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      categoryCounts[label] = (categoryCounts[label] || 0) + 1;
      if (!categoryProjects[label]) categoryProjects[label] = [];
      const team: any = Array.isArray(cr.team) ? cr.team[0] : cr.team;
      const head: any = team?.team_head ? (Array.isArray(team.team_head) ? team.team_head[0] : team.team_head) : null;
      const teamDisplay = head?.name ? `${head.name}'s Team` : team?.name || null;
      categoryProjects[label].push({
        id: cr.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "Unknown",
        slot: cr.target_slot || null,
        teamName: teamDisplay,
      });
    }

    // Also count projects with NO theme_category
    const evaluatedCrIds = new Set(crThemeCategory.keys());
    const unevaluatedCount = (callReports || []).filter((cr) => !evaluatedCrIds.has(cr.id)).length;

    // ── Theme Keywords (from call_reports.theme freetext) ──────────────
    const keywordCounts: Record<string, number> = {};
    const keywordProjects: Record<string, { id: string; title: string; writer: string }[]> = {};
    for (const cr of callReports || []) {
      if (!cr.theme) continue;
      const keywords = extractThemeKeywords(cr.theme);
      for (const kw of keywords) {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
        if (!keywordProjects[kw]) keywordProjects[kw] = [];
        keywordProjects[kw].push({
          id: cr.id,
          title: cr.working_title || "Untitled",
          writer: cr.writer_name || "Unknown",
        });
      }
    }

    // Sort keywords by count, top 12
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
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
      totalProjects: (callReports || []).length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
