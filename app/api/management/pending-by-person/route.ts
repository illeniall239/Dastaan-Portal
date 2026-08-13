import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

const HIDDEN_EMAILS = new Set(["faizan.mubarak@geo.tv", "mir@geo.tv", "sheeraz.kazi@geo.tv", "test_management@geo.tv"]);
const EVALUATES_ALL_EMAILS = new Set(["humera.safder@geo.tv", "salman.ahmed@geo.tv"]);

/**
 * GET /api/management/pending-by-person
 * ?detail=<userId> — returns detailed pending items for a specific person
 * Otherwise returns summary counts per team head.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;

    const admin = createAdminClient();
    const detailUserId = request.nextUrl.searchParams.get("detail");

    // Common data needed for both summary and detail
    const [
      { data: teamsData },
      { data: allUsers },
      { data: callReports },
      { data: evalForms },
      { data: episodes },
      { data: epEvals },
    ] = await Promise.all([
      admin.from("teams").select("id, name, team_head_id"),
      admin.from("users").select("id, name, role, team_id, email").eq("status", "active").order("name"),
      admin.from("call_reports").select("id, team_id, working_title, created_at, original_submission_date").is("archived_at", null).eq("meeting_type", "call_report"),
      admin.from("evaluator_forms").select("evaluator_id, call_report_id").not("submitted_at", "is", null),
      admin.from("episodes").select("id, call_report_id, episode_number, title, created_at, original_submission_date").not("call_report_id", "is", null),
      admin.from("episodic_evaluations").select("evaluator_id, episode_id").not("submitted_at", "is", null).not("overall_average", "is", null),
    ]);

    const teamHeadIds = new Set((teamsData || []).map((t) => t.team_head_id).filter(Boolean));
    const evaluators = (allUsers || []).filter((u) => teamHeadIds.has(u.id) && !HIDDEN_EMAILS.has(u.email));

    const allCrs = callReports || [];
    const allEps = episodes || [];

    // Build per-person eval lookup maps
    const submittedCrEvals = new Map<string, Set<string>>();
    const submittedEpEvals = new Map<string, Set<string>>();
    for (const ef of evalForms || []) {
      if (!submittedCrEvals.has(ef.evaluator_id)) submittedCrEvals.set(ef.evaluator_id, new Set());
      submittedCrEvals.get(ef.evaluator_id)!.add(ef.call_report_id);
    }
    for (const ee of epEvals || []) {
      if (!submittedEpEvals.has(ee.evaluator_id)) submittedEpEvals.set(ee.evaluator_id, new Set());
      submittedEpEvals.get(ee.evaluator_id)!.add(ee.episode_id);
    }

    // Build per-team eval lookup maps (for Humera/Salman: "done" = anyone on their team evaluated)
    const userTeamMap = new Map((allUsers || []).map((u) => [u.id, u.team_id]));
    const teamCrEvals = new Map<string, Set<string>>();
    const teamEpEvals = new Map<string, Set<string>>();
    for (const ef of evalForms || []) {
      const teamId = userTeamMap.get(ef.evaluator_id);
      if (!teamId) continue;
      if (!teamCrEvals.has(teamId)) teamCrEvals.set(teamId, new Set());
      teamCrEvals.get(teamId)!.add(ef.call_report_id);
    }
    for (const ee of epEvals || []) {
      const teamId = userTeamMap.get(ee.evaluator_id);
      if (!teamId) continue;
      if (!teamEpEvals.has(teamId)) teamEpEvals.set(teamId, new Set());
      teamEpEvals.get(teamId)!.add(ee.episode_id);
    }

    // Helper: get relevant CRs for a person
    function getRelevantCrs(ev: { email: string; team_id: string }) {
      if (EVALUATES_ALL_EMAILS.has(ev.email)) return allCrs;
      return allCrs.filter((cr) => cr.team_id === ev.team_id);
    }

    // Helper: get eval sets — team-level for EVALUATES_ALL, personal for others
    function getEvalSets(ev: { id: string; email: string; team_id: string }) {
      if (EVALUATES_ALL_EMAILS.has(ev.email)) {
        // Get ALL teams this person heads (e.g. Salman heads both personal + Programming team)
        const headedTeamIds = (teamsData || [])
          .filter((t) => t.team_head_id === ev.id)
          .map((t) => t.id);
        // Merge eval sets from all headed teams
        const crEvals = new Set<string>();
        const epEvalSet = new Set<string>();
        for (const tid of headedTeamIds) {
          for (const id of teamCrEvals.get(tid) || []) crEvals.add(id);
          for (const id of teamEpEvals.get(tid) || []) epEvalSet.add(id);
        }
        return { crEvals, epEvals: epEvalSet };
      }
      return {
        crEvals: submittedCrEvals.get(ev.id) || new Set<string>(),
        epEvals: submittedEpEvals.get(ev.id) || new Set<string>(),
      };
    }

    // ── DETAIL MODE ─────────────────────────────────────────────────────
    if (detailUserId) {
      const ev = evaluators.find((u) => u.id === detailUserId);
      if (!ev) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const relevantCrs = getRelevantCrs(ev);
      const { crEvals: myCrEvals, epEvals: myEpEvals } = getEvalSets(ev);

      // Build CR id → data map
      const crMap = new Map(allCrs.map((cr) => [cr.id, cr]));

      // Fetch detailed eval data with scores and evaluator names + revision counts
      const [{ data: detailedCrEvals }, { data: detailedEpEvals }, { data: epRevisions }] = await Promise.all([
        admin.from("evaluator_forms")
          .select("call_report_id, average_score, submitted_at, evaluator:users!evaluator_id(id, name)")
          .not("submitted_at", "is", null),
        admin.from("episodic_evaluations")
          .select("episode_id, overall_average, overall_grade, submitted_at, evaluator:users!evaluator_id(id, name)")
          .not("submitted_at", "is", null)
          .not("overall_average", "is", null),
        admin.from("episode_revisions")
          .select("episode_id"),
      ]);

      // Build episode → revision count map
      const revCountMap = new Map<string, number>();
      for (const r of epRevisions || []) {
        revCountMap.set(r.episode_id, (revCountMap.get(r.episode_id) || 0) + 1);
      }

      // Determine which team member IDs are relevant for this person's evals
      const relevantMemberIds = new Set<string>();
      if (EVALUATES_ALL_EMAILS.has(ev.email)) {
        const headedTeamIds = new Set(
          (teamsData || []).filter((t) => t.team_head_id === ev.id).map((t) => t.id)
        );
        for (const u of allUsers || []) {
          if (headedTeamIds.has(u.team_id)) relevantMemberIds.add(u.id);
        }
      } else {
        relevantMemberIds.add(ev.id);
      }

      // Build CR → evaluations map (only from relevant team members)
      const crEvalsMap = new Map<string, { evaluatorName: string; averageScore: number; submittedAt: string }[]>();
      for (const ef of detailedCrEvals || []) {
        const evaluator = Array.isArray(ef.evaluator) ? ef.evaluator[0] : ef.evaluator;
        if (!evaluator || !relevantMemberIds.has(evaluator.id)) continue;
        if (!crEvalsMap.has(ef.call_report_id)) crEvalsMap.set(ef.call_report_id, []);
        crEvalsMap.get(ef.call_report_id)!.push({
          evaluatorName: evaluator.name || "Unknown",
          averageScore: ef.average_score,
          submittedAt: ef.submitted_at,
        });
      }

      // Build Episode → evaluations map (only from relevant team members)
      const epEvalsMap = new Map<string, { evaluatorName: string; overallAverage: number; overallGrade: string; submittedAt: string }[]>();
      for (const ee of detailedEpEvals || []) {
        const evaluator = Array.isArray(ee.evaluator) ? ee.evaluator[0] : ee.evaluator;
        if (!evaluator || !relevantMemberIds.has(evaluator.id)) continue;
        if (!epEvalsMap.has(ee.episode_id)) epEvalsMap.set(ee.episode_id, []);
        epEvalsMap.get(ee.episode_id)!.push({
          evaluatorName: evaluator.name || "Unknown",
          overallAverage: ee.overall_average,
          overallGrade: ee.overall_grade,
          submittedAt: ee.submitted_at,
        });
      }

      // Pending one-liners
      const pendingOneLiners = relevantCrs
        .filter((cr) => !myCrEvals.has(cr.id))
        .map((cr) => ({
          id: cr.id,
          title: cr.working_title,
          date: cr.original_submission_date || cr.created_at,
          daysPending: Math.floor((Date.now() - new Date(cr.original_submission_date || cr.created_at).getTime()) / 86400000),
        }))
        .sort((a, b) => b.daysPending - a.daysPending);

      // Evaluated one-liners (with scores)
      const evaluatedOneLiners = relevantCrs
        .filter((cr) => myCrEvals.has(cr.id))
        .map((cr) => ({
          id: cr.id,
          title: cr.working_title,
          date: cr.original_submission_date || cr.created_at,
          evaluations: crEvalsMap.get(cr.id) || [],
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Pending episodes
      const relevantCrIds = new Set(relevantCrs.map((cr) => cr.id));
      const pendingEpisodes = allEps
        .filter((ep) => relevantCrIds.has(ep.call_report_id) && !myEpEvals.has(ep.id))
        .map((ep) => {
          const cr = crMap.get(ep.call_report_id);
          return {
            id: ep.id,
            episodeNumber: ep.episode_number,
            title: ep.title,
            projectTitle: cr?.working_title || "Unknown",
            date: ep.original_submission_date || ep.created_at,
            daysPending: Math.floor((Date.now() - new Date(ep.original_submission_date || ep.created_at).getTime()) / 86400000),
            revisions: revCountMap.get(ep.id) || 0,
          };
        })
        .sort((a, b) => b.daysPending - a.daysPending);

      // Evaluated episodes (with scores)
      const evaluatedEpisodes = allEps
        .filter((ep) => relevantCrIds.has(ep.call_report_id) && myEpEvals.has(ep.id))
        .map((ep) => {
          const cr = crMap.get(ep.call_report_id);
          return {
            id: ep.id,
            episodeNumber: ep.episode_number,
            title: ep.title,
            projectTitle: cr?.working_title || "Unknown",
            date: ep.original_submission_date || ep.created_at,
            evaluations: epEvalsMap.get(ep.id) || [],
            revisions: revCountMap.get(ep.id) || 0,
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return NextResponse.json({
        success: true,
        person: { name: ev.name, role: ev.role },
        pendingOneLiners,
        evaluatedOneLiners,
        pendingEpisodes,
        evaluatedEpisodes,
      });
    }

    // ── SUMMARY MODE ────────────────────────────────────────────────────
    const results: {
      userId: string;
      name: string;
      role: string;
      pendingOneLiners: number;
      pendingEpisodes: number;
      totalOneLiners: number;
      totalEpisodes: number;
    }[] = [];

    for (const ev of evaluators) {
      const relevantCrs = getRelevantCrs(ev);
      const { crEvals: myCrEvals, epEvals: myEpEvals } = getEvalSets(ev);

      const pendingCrs = relevantCrs.filter((cr) => !myCrEvals.has(cr.id));
      const relevantCrIds = new Set(relevantCrs.map((cr) => cr.id));
      const relevantEps = allEps.filter((ep) => relevantCrIds.has(ep.call_report_id));
      const pendingEps = relevantEps.filter((ep) => !myEpEvals.has(ep.id));

      if (pendingCrs.length > 0 || pendingEps.length > 0) {
        results.push({
          userId: ev.id,
          name: ev.name,
          role: ev.role,
          pendingOneLiners: pendingCrs.length,
          pendingEpisodes: pendingEps.length,
          totalOneLiners: relevantCrs.length,
          totalEpisodes: relevantEps.length,
        });
      }
    }

    results.sort((a, b) => (b.pendingOneLiners + b.pendingEpisodes) - (a.pendingOneLiners + a.pendingEpisodes));

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
