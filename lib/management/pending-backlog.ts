import { createAdminClient } from "@/lib/supabase/admin";

export interface TeamPendingBacklog {
  pendingOneLiners: number;
  pendingEpisodes: number;
  totalOneLiners: number;
  totalEpisodes: number;
  evaluatedOneLiners: number;
  evaluatedEpisodes: number;
  oldestOneLinerDays: number | null;
  oldestEpisodeDays: number | null;
}

export interface PendingBacklogResult {
  byTeam: Map<string, TeamPendingBacklog>;
  global: TeamPendingBacklog;
  /** Distinct CRs/episodes evaluated per evaluator team (keyed by evaluator's team_id) */
  teamEvalCounts: Map<string, { oneLiners: number; episodes: number }>;
}

function effectiveDate(r: { original_submission_date?: string | null; created_at: string }): Date {
  return new Date(r.original_submission_date ?? r.created_at);
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

/**
 * Compute pending backlog data:
 * - byTeam: per logging-team counts (their CRs/episodes, evaluated by anyone)
 * - global: totals across ALL teams
 * - teamEvalCounts: how many distinct CRs/episodes each evaluator team has evaluated
 */
export async function getPendingBacklogByTeam(): Promise<PendingBacklogResult> {
  const admin = createAdminClient();

  const [
    { data: callReports },
    { data: evalForms },
    { data: episodes },
    { data: episodicEvals },
  ] = await Promise.all([
    admin
      .from("call_reports")
      .select("id, team_id, created_at, original_submission_date")
      .is("archived_at", null)
      .eq("meeting_type", "call_report"),
    // Submitted evaluator_forms — include evaluator's team_id (denormalized)
    admin
      .from("evaluator_forms")
      .select("call_report_id, team_id")
      .not("submitted_at", "is", null),
    admin
      .from("episodes")
      .select("id, created_at, original_submission_date, call_report:call_reports!call_report_id(team_id)")
      .not("call_report_id", "is", null),
    // Submitted episodic evaluations — include evaluator's team_id (denormalized)
    admin
      .from("episodic_evaluations")
      .select("episode_id, team_id")
      .not("submitted_at", "is", null),
  ]);

  // ── Build CR lookup ──────────────────────────────────────────────────────────
  const crById = new Map(
    (callReports || []).map((cr: any) => [cr.id, cr])
  );

  // ── CRs evaluated by own team (ef.team_id === cr.team_id) ──────────────────
  const ownTeamEvalCrIds = new Set<string>();
  for (const ef of (evalForms || []) as any[]) {
    if (!ef.team_id || !ef.call_report_id) continue;
    const cr = crById.get(ef.call_report_id);
    if (cr && cr.team_id === ef.team_id) {
      ownTeamEvalCrIds.add(ef.call_report_id);
    }
  }

  // ── Episodes evaluated by own team (ee.team_id === cr.team_id) ─────────────
  const epCrTeam = new Map<string, string>(); // episode_id → cr.team_id
  for (const ep of (episodes || []) as any[]) {
    if (ep.call_report?.team_id) epCrTeam.set(ep.id, ep.call_report.team_id);
  }
  const ownTeamEvalEpIds = new Set<string>();
  for (const ee of (episodicEvals || []) as any[]) {
    if (!ee.team_id || !ee.episode_id) continue;
    const crTeamId = epCrTeam.get(ee.episode_id);
    if (crTeamId === ee.team_id) {
      ownTeamEvalEpIds.add(ee.episode_id);
    }
  }

  // ── Per logging-team counts ─────────────────────────────────────────────────
  const byTeam = new Map<string, TeamPendingBacklog>();

  const ensureTeam = (teamId: string) => {
    if (!byTeam.has(teamId)) {
      byTeam.set(teamId, {
        pendingOneLiners: 0, pendingEpisodes: 0,
        totalOneLiners: 0, totalEpisodes: 0,
        evaluatedOneLiners: 0, evaluatedEpisodes: 0,
        oldestOneLinerDays: null, oldestEpisodeDays: null,
      });
    }
    return byTeam.get(teamId)!;
  };

  // One-liners grouped by logging team — evaluated only if own team evaluated
  for (const cr of (callReports || []) as any[]) {
    if (!cr.team_id) continue;
    const b = ensureTeam(cr.team_id);
    b.totalOneLiners++;
    if (ownTeamEvalCrIds.has(cr.id)) {
      b.evaluatedOneLiners++;
    } else {
      b.pendingOneLiners++;
      const age = daysSince(effectiveDate(cr));
      if (b.oldestOneLinerDays === null || age > b.oldestOneLinerDays) {
        b.oldestOneLinerDays = age;
      }
    }
  }

  // Episodes grouped by logging team — evaluated only if own team evaluated
  for (const ep of (episodes || []) as any[]) {
    const teamId = ep.call_report?.team_id;
    if (!teamId) continue;
    const b = ensureTeam(teamId);
    b.totalEpisodes++;
    if (ownTeamEvalEpIds.has(ep.id)) {
      b.evaluatedEpisodes++;
    } else {
      b.pendingEpisodes++;
      const age = daysSince(effectiveDate(ep));
      if (b.oldestEpisodeDays === null || age > b.oldestEpisodeDays) {
        b.oldestEpisodeDays = age;
      }
    }
  }

  // ── Global totals (sum of all teams) ────────────────────────────────────────
  const global: TeamPendingBacklog = {
    pendingOneLiners: 0, pendingEpisodes: 0,
    totalOneLiners: 0, totalEpisodes: 0,
    evaluatedOneLiners: 0, evaluatedEpisodes: 0,
    oldestOneLinerDays: null, oldestEpisodeDays: null,
  };
  for (const b of byTeam.values()) {
    global.totalOneLiners += b.totalOneLiners;
    global.totalEpisodes += b.totalEpisodes;
    global.evaluatedOneLiners += b.evaluatedOneLiners;
    global.evaluatedEpisodes += b.evaluatedEpisodes;
    global.pendingOneLiners += b.pendingOneLiners;
    global.pendingEpisodes += b.pendingEpisodes;
    if (b.oldestOneLinerDays !== null) {
      if (global.oldestOneLinerDays === null || b.oldestOneLinerDays > global.oldestOneLinerDays) {
        global.oldestOneLinerDays = b.oldestOneLinerDays;
      }
    }
    if (b.oldestEpisodeDays !== null) {
      if (global.oldestEpisodeDays === null || b.oldestEpisodeDays > global.oldestEpisodeDays) {
        global.oldestEpisodeDays = b.oldestEpisodeDays;
      }
    }
  }

  // ── Per evaluator-team eval counts ──────────────────────────────────────────
  // How many distinct CRs/episodes each evaluator team has evaluated
  const teamEvalCounts = new Map<string, { oneLiners: number; episodes: number }>();

  // One-liner evals grouped by evaluator's team_id
  const crsByEvalTeam = new Map<string, Set<string>>();
  for (const ef of (evalForms || []) as any[]) {
    if (!ef.team_id || !ef.call_report_id) continue;
    if (!crsByEvalTeam.has(ef.team_id)) crsByEvalTeam.set(ef.team_id, new Set());
    crsByEvalTeam.get(ef.team_id)!.add(ef.call_report_id);
  }

  // Episode evals grouped by evaluator's team_id
  const epsByEvalTeam = new Map<string, Set<string>>();
  for (const ee of (episodicEvals || []) as any[]) {
    if (!ee.team_id || !ee.episode_id) continue;
    if (!epsByEvalTeam.has(ee.team_id)) epsByEvalTeam.set(ee.team_id, new Set());
    epsByEvalTeam.get(ee.team_id)!.add(ee.episode_id);
  }

  // Merge into teamEvalCounts
  const allEvalTeamIds = new Set([...crsByEvalTeam.keys(), ...epsByEvalTeam.keys()]);
  for (const tid of allEvalTeamIds) {
    teamEvalCounts.set(tid, {
      oneLiners: crsByEvalTeam.get(tid)?.size || 0,
      episodes: epsByEvalTeam.get(tid)?.size || 0,
    });
  }

  return { byTeam, global, teamEvalCounts };
}
