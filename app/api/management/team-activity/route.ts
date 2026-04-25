import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "management"].includes(currentUser?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const fromDate = fromParam ? new Date(fromParam).toISOString() : null;

    // ── Fetch all data in parallel ─────────────────────────────────────────────
    const [
      { data: teams },
      { data: users },
      { data: callReports },
      { data: evalForms },
      { data: oneLiners },
      { data: sessions },
      { data: episodes },
      { data: episodicEvals },
    ] = await Promise.all([
      admin.from("teams").select("id, name, team_type").order("name"),
      admin.from("users").select("id, name, role, team_id, status").eq("status", "active"),
      admin
        .from("call_reports")
        .select("id, created_by, created_at, evaluation_status")
        .eq("meeting_type", "call_report")
        .is("archived_at", null),
      admin
        .from("evaluator_forms")
        .select("id, evaluator_id, submitted_at")
        .not("submitted_at", "is", null),
      admin
        .from("detailed_one_liners")
        .select("id, created_by, created_at"),
      admin
        .from("user_sessions")
        .select("user_id, login_at, last_seen_at, logout_at, active_minutes")
        .order("login_at", { ascending: false }),
      admin
        .from("episodes")
        .select("id, logged_by, created_at"),
      admin
        .from("episodic_evaluations")
        .select("id, evaluator_id, episode_id, submitted_at"),
    ]);

    const NOW = new Date();
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const inPeriod = (dateStr: string | null) => {
      if (!dateStr) return false;
      if (!fromDate) return true;
      return new Date(dateStr) >= new Date(fromDate);
    };

    // ── Build login data per user (all-time) ───────────────────────────────────
    const sessionsByUser: Record<string, { login_at: string; last_seen_at: string; logout_at: string | null }[]> = {};
    for (const s of sessions || []) {
      if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = [];
      sessionsByUser[s.user_id].push(s);
    }

    const FALLBACK_CAP_MINUTES = 120; // 2h cap for sessions without active_minutes tracking

    const medianOf = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];
    };

    const loginDataByUser: Record<string, {
      total_sessions: number;
      effective_last_login: string | null;
      is_online: boolean;
      period_minutes: number;
    }> = {};
    for (const u of users || []) {
      const userSessions = sessionsByUser[u.id] || [];
      const mostRecent = userSessions[0] || null;
      const lastSeenAt = mostRecent?.last_seen_at ? new Date(mostRecent.last_seen_at) : null;

      // Duration window matches the selected period filter (fromDate), not a hardcoded 7-day window
      const durationWindowStart = fromDate ? new Date(fromDate).getTime() : 0;

      const sessionDurations: number[] = [];
      for (const s of userSessions) {
        if (new Date(s.login_at).getTime() < durationWindowStart) continue;
        const activeMinutes = (s as any).active_minutes ?? 0;
        if (activeMinutes > 0) {
          sessionDurations.push(activeMinutes);
        } else {
          // Fallback: capped elapsed time for sessions without visibility tracking
          const end = s.logout_at ? new Date(s.logout_at).getTime() : NOW.getTime();
          const elapsed = Math.max(0, Math.round((end - new Date(s.login_at).getTime()) / 60000));
          sessionDurations.push(Math.min(elapsed, FALLBACK_CAP_MINUTES));
        }
      }
      const avgSessionMinutes = medianOf(sessionDurations);
      loginDataByUser[u.id] = {
        total_sessions: userSessions.length,
        effective_last_login: mostRecent?.login_at ?? null,
        is_online: lastSeenAt ? (NOW.getTime() - lastSeenAt.getTime()) < TEN_MINUTES_MS : false,
        period_minutes: avgSessionMinutes,
      };
    }

    // ── Build activity counts per user (period-filtered) ──────────────────────
    const crByUser: Record<string, number> = {};
    const pendingEvalsByUser: Record<string, number> = {};
    const evalByUser: Record<string, number> = {};
    const olByUser: Record<string, number> = {};
    const epsLoggedByUser: Record<string, number> = {};
    const epsEvalByUser: Record<string, number> = {};
    const pendingEpsEvalsByUser: Record<string, number> = {};
    const lastActivityByUser: Record<string, string> = {};

    const updateLast = (userId: string, ts: string) => {
      if (!lastActivityByUser[userId] || ts > lastActivityByUser[userId]) {
        lastActivityByUser[userId] = ts;
      }
    };

    for (const cr of callReports || []) {
      if (!cr.created_by || !inPeriod(cr.created_at)) continue;
      crByUser[cr.created_by] = (crByUser[cr.created_by] || 0) + 1;
      updateLast(cr.created_by, cr.created_at);
      const evalStatus = cr.evaluation_status;
      const isNotEvaluated = !evalStatus || evalStatus === "pending" || evalStatus === "in_progress";
      if (isNotEvaluated) {
        pendingEvalsByUser[cr.created_by] = (pendingEvalsByUser[cr.created_by] || 0) + 1;
      }
    }
    for (const ef of evalForms || []) {
      if (!ef.evaluator_id || !inPeriod(ef.submitted_at)) continue;
      evalByUser[ef.evaluator_id] = (evalByUser[ef.evaluator_id] || 0) + 1;
      updateLast(ef.evaluator_id, ef.submitted_at!);
    }
    for (const ol of oneLiners || []) {
      if (!ol.created_by || !inPeriod(ol.created_at)) continue;
      olByUser[ol.created_by] = (olByUser[ol.created_by] || 0) + 1;
      updateLast(ol.created_by, ol.created_at);
    }
    for (const ep of episodes || []) {
      if (!ep.logged_by || !inPeriod(ep.created_at)) continue;
      epsLoggedByUser[ep.logged_by] = (epsLoggedByUser[ep.logged_by] || 0) + 1;
      updateLast(ep.logged_by, ep.created_at);
    }
    for (const ee of episodicEvals || []) {
      if (!ee.evaluator_id || !inPeriod(ee.submitted_at)) continue;
      epsEvalByUser[ee.evaluator_id] = (epsEvalByUser[ee.evaluator_id] || 0) + 1;
      updateLast(ee.evaluator_id, ee.submitted_at!);
    }

    // Build pending eps evals per user: episodes logged in period with no evaluation yet
    const evaluatedEpisodeIdSet = new Set((episodicEvals || []).map(ee => ee.episode_id));
    for (const ep of episodes || []) {
      if (!ep.logged_by || !inPeriod(ep.created_at)) continue;
      if (!evaluatedEpisodeIdSet.has(ep.id)) {
        pendingEpsEvalsByUser[ep.logged_by] = (pendingEpsEvalsByUser[ep.logged_by] || 0) + 1;
      }
    }

    // ── Group users by team ────────────────────────────────────────────────────
    const usersByTeam: Record<string, typeof users> = {};
    for (const u of users || []) {
      const tid = u.team_id || "__no_team__";
      if (!usersByTeam[tid]) usersByTeam[tid] = [];
      usersByTeam[tid].push(u);
    }

    // ── Build memberActivity ───────────────────────────────────────────────────
    const memberActivity = (teams || []).map(team => {
      const members = (usersByTeam[team.id] || []).map(u => {
        const lastAct = lastActivityByUser[u.id] || null;
        const isIdle = !lastAct || (NOW.getTime() - new Date(lastAct).getTime() > SEVEN_DAYS_MS);
        const login = loginDataByUser[u.id] || { total_sessions: 0, period_minutes: 0, effective_last_login: null, is_online: false };
        return {
          user_id: u.id,
          name: u.name,
          role: u.role,
          call_reports: crByUser[u.id] || 0,
          pending_evals: pendingEvalsByUser[u.id] || 0,
          evaluations: evalByUser[u.id] || 0,
          one_liners: olByUser[u.id] || 0,
          episodes_logged: epsLoggedByUser[u.id] || 0,
          episodes_evaluated: epsEvalByUser[u.id] || 0,
          pending_eps_evals: pendingEpsEvalsByUser[u.id] || 0,
          last_activity: lastAct,
          is_idle: isIdle,
          total_sessions: login.total_sessions,
          period_minutes: login.period_minutes,
          effective_last_login: login.effective_last_login,
          is_online: login.is_online,
        };
      });

      const onlineCount = members.filter(m => m.is_online).length;
      const lastTeamAct = members.reduce<string | null>((best, m) => {
        if (!m.last_activity) return best;
        if (!best) return m.last_activity;
        return m.last_activity > best ? m.last_activity : best;
      }, null);

      return {
        team_id: team.id,
        team_name: team.name,
        team_type: team.team_type,
        member_count: members.length,
        call_reports: members.reduce((s, m) => s + m.call_reports, 0),
        pending_evals: members.reduce((s, m) => s + m.pending_evals, 0),
        evaluations: members.reduce((s, m) => s + m.evaluations, 0),
        one_liners: members.reduce((s, m) => s + m.one_liners, 0),
        episodes_logged: members.reduce((s, m) => s + m.episodes_logged, 0),
        episodes_evaluated: members.reduce((s, m) => s + m.episodes_evaluated, 0),
        pending_eps_evals: members.reduce((s, m) => s + m.pending_eps_evals, 0),
        online_count: onlineCount,
        last_activity: lastTeamAct,
        members,
      };
    });

    return NextResponse.json({ success: true, memberActivity });
  } catch (error) {
    console.error("Error in team-activity GET:", error);
    return NextResponse.json({ error: "Failed to fetch team activity" }, { status: 500 });
  }
}
