import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const KEY_PERSONNEL_EMAILS = ["humera.safder@geo.tv", "salman.ahmed@geo.tv"];
const FALLBACK_CAP_MINUTES = 120; // 2h cap for sessions without active_minutes tracking

const medianOf = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
};
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

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

    const inPeriod = (dateStr: string | null) => {
      if (!dateStr) return false;
      if (!fromDate) return true;
      return new Date(dateStr) >= new Date(fromDate);
    };

    // Fetch key personnel users by email
    const { data: personnel } = await admin
      .from("users")
      .select("id, name, email, role, team_id")
      .in("email", KEY_PERSONNEL_EMAILS);

    if (!personnel || personnel.length === 0) {
      return NextResponse.json({ success: true, personnel: [] });
    }

    const userIds = personnel.map(u => u.id);
    const NOW = new Date();

    // Fetch all data in parallel
    const [
      { data: evalForms },
      { data: episodicEvals },
      { data: sessions },
      { data: viewRows },
    ] = await Promise.all([
      admin
        .from("evaluator_forms")
        .select("id, evaluator_id, submitted_at")
        .in("evaluator_id", userIds)
        .not("submitted_at", "is", null),
      admin
        .from("episodic_evaluations")
        .select("episode_id, evaluator_id, submitted_at"),
      admin
        .from("user_sessions")
        .select("user_id, login_at, last_seen_at, logout_at, active_minutes")
        .in("user_id", userIds)
        .order("login_at", { ascending: false }),
      admin
        .from("call_report_evaluations_with_type")
        .select("call_report_id")
        .not("call_report_id", "is", null),
    ]);

    const evaluatedIds = [...new Set((viewRows || []).map((r: any) => r.call_report_id as string))];

    let approvals: any[] | null = null;
    if (evaluatedIds.length > 0 && userIds.length > 0) {
      const { data } = await admin
        .from("story_approvals")
        .select("user_id, call_report_id")
        .in("user_id", userIds)
        .in("call_report_id", evaluatedIds);
      approvals = data;
    }

    const approvalsByUser: Record<string, Set<string>> = {};
    for (const a of approvals || []) {
      if (!approvalsByUser[a.user_id]) approvalsByUser[a.user_id] = new Set();
      approvalsByUser[a.user_id].add(a.call_report_id);
    }

    // Build session data per user
    const sessionsByUser: Record<string, { login_at: string; last_seen_at: string; logout_at: string | null }[]> = {};
    for (const s of sessions || []) {
      if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = [];
      sessionsByUser[s.user_id].push(s);
    }

    // Build activity counts per user (period-filtered)
    const evalByUser: Record<string, number> = {};
    const epsEvalByUser: Record<string, number> = {};
    const lastActivityByUser: Record<string, string> = {};

    const updateLast = (userId: string, ts: string) => {
      if (!lastActivityByUser[userId] || ts > lastActivityByUser[userId]) {
        lastActivityByUser[userId] = ts;
      }
    };

    for (const ef of evalForms || []) {
      if (!ef.evaluator_id || !inPeriod(ef.submitted_at)) continue;
      evalByUser[ef.evaluator_id] = (evalByUser[ef.evaluator_id] || 0) + 1;
      updateLast(ef.evaluator_id, ef.submitted_at!);
    }
    for (const ee of episodicEvals || []) {
      if (!ee.evaluator_id || !inPeriod(ee.submitted_at)) continue;
      epsEvalByUser[ee.evaluator_id] = (epsEvalByUser[ee.evaluator_id] || 0) + 1;
      updateLast(ee.evaluator_id, ee.submitted_at!);
    }

    const windowStart = fromDate ? new Date(fromDate).getTime() : 0;

    // Build result per person
    const result = personnel.map(u => {
      const userSessions = sessionsByUser[u.id] || [];
      const mostRecent = userSessions[0] || null;
      const lastSeenAt = mostRecent?.last_seen_at ? new Date(mostRecent.last_seen_at) : null;
      const isOnline = lastSeenAt ? (NOW.getTime() - lastSeenAt.getTime()) < TEN_MINUTES_MS : false;

      const sessionDurations: number[] = [];
      for (const s of userSessions) {
        if (new Date(s.login_at).getTime() < windowStart) continue;
        const activeMinutes = (s as any).active_minutes ?? 0;
        if (activeMinutes > 0) {
          sessionDurations.push(activeMinutes);
        } else {
          // Fallback: capped elapsed time for sessions without visibility tracking
          const end = s.logout_at ? new Date(s.logout_at).getTime() : new Date(s.last_seen_at).getTime();
          const elapsed = Math.max(0, Math.round((end - new Date(s.login_at).getTime()) / 60000));
          sessionDurations.push(Math.min(elapsed, FALLBACK_CAP_MINUTES));
        }
      }
      const avgSessionMinutes = medianOf(sessionDurations);

      const lastAct = lastActivityByUser[u.id] || null;
      const isIdle = !lastAct || (NOW.getTime() - new Date(lastAct).getTime() > SEVEN_DAYS_MS);

      const myApprovedIds = approvalsByUser[u.id] || new Set();
      const pendingEvals = evaluatedIds.filter((id) => !myApprovedIds.has(id)).length;

      const allEvaluatedEpisodeIds = new Set((episodicEvals || []).map(ee => ee.episode_id));
      const myEvaluatedEpisodeIds = new Set((episodicEvals || []).filter(ee => ee.evaluator_id === u.id).map(ee => ee.episode_id));
      const pendingEpsEvals = [...allEvaluatedEpisodeIds].filter(id => !myEvaluatedEpisodeIds.has(id)).length;

      return {
        user_id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        evaluations: evalByUser[u.id] || 0,
        episodes_evaluated: epsEvalByUser[u.id] || 0,
        pending_evals: pendingEvals,
        pending_eps_evals: pendingEpsEvals,
        last_activity: lastAct,
        is_idle: isIdle,
        effective_last_login: mostRecent?.login_at ?? null,
        total_sessions: userSessions.length,
        period_minutes: avgSessionMinutes,
        is_online: isOnline,
      };
    });

    // Sort by email order (Humera first, Salman second)
    result.sort((a, b) =>
      KEY_PERSONNEL_EMAILS.indexOf(a.email) - KEY_PERSONNEL_EMAILS.indexOf(b.email)
    );

    return NextResponse.json({ success: true, personnel: result });
  } catch (error) {
    console.error("Error in key-personnel-activity GET:", error);
    return NextResponse.json({ error: "Failed to fetch key personnel activity" }, { status: 500 });
  }
}
