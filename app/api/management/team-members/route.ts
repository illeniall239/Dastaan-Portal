import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(["management", "management_viewer"]);
  if (!auth.success) return auth.response;

  try {

    const teamId = request.nextUrl.searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get team members
    const { data: members } = await admin
      .from("users")
      .select("id, name, email")
      .eq("team_id", teamId)
      .eq("status", "active")
      .order("name");

    if (!members || members.length === 0) {
      return NextResponse.json({ members: [] });
    }

    const memberIds = members.map((m) => m.id);

    // Fetch all counts + sessions in parallel
    const [{ data: oneLinerRows }, { data: episodicRows }, { data: ideasRows }, { data: sessionRows }] =
      await Promise.all([
        admin
          .from("evaluator_forms")
          .select("evaluator_id")
          .in("evaluator_id", memberIds),
        admin
          .from("episodic_evaluations")
          .select("evaluator_id")
          .in("evaluator_id", memberIds),
        admin
          .from("call_reports")
          .select("created_by")
          .in("created_by", memberIds),
        admin
          .from("user_sessions")
          .select("user_id, login_at, last_seen_at, logout_at, active_minutes")
          .in("user_id", memberIds)
          .order("login_at", { ascending: false }),
      ]);

    // Count per member
    const oneLinerCounts: Record<string, number> = {};
    for (const r of oneLinerRows || []) {
      oneLinerCounts[r.evaluator_id] = (oneLinerCounts[r.evaluator_id] || 0) + 1;
    }
    const episodicCounts: Record<string, number> = {};
    for (const r of episodicRows || []) {
      episodicCounts[r.evaluator_id] = (episodicCounts[r.evaluator_id] || 0) + 1;
    }
    const ideasCounts: Record<string, number> = {};
    for (const r of ideasRows || []) {
      ideasCounts[r.created_by] = (ideasCounts[r.created_by] || 0) + 1;
    }

    // Build session data per user
    const FALLBACK_CAP = 120;
    const sessionsByUser: Record<string, typeof sessionRows> = {};
    for (const s of sessionRows || []) {
      if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = [];
      sessionsByUser[s.user_id]!.push(s);
    }

    const medianOf = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];
    };

    const result = members.map((m) => {
      const ideas = ideasCounts[m.id] || 0;
      const oneLiners = oneLinerCounts[m.id] || 0;
      const episodic = episodicCounts[m.id] || 0;

      const userSessions = sessionsByUser[m.id] || [];
      const lastLogin = userSessions[0]?.login_at ?? null;

      const durations: number[] = [];
      for (const s of userSessions) {
        const active = (s as any).active_minutes ?? 0;
        if (active > 0) {
          durations.push(active);
        } else {
          const end = s.logout_at ? new Date(s.logout_at).getTime() : Date.now();
          const elapsed = Math.max(0, Math.round((end - new Date(s.login_at).getTime()) / 60000));
          durations.push(Math.min(elapsed, FALLBACK_CAP));
        }
      }

      return {
        name: m.name,
        email: m.email,
        ideasLogged: ideas,
        oneLinerEvals: oneLiners,
        episodicEvals: episodic,
        totalActivity: ideas + oneLiners + episodic,
        lastLogin,
        medianSessionMinutes: medianOf(durations),
      };
    });

    return NextResponse.json({ members: result });
  } catch (error) {
    console.error("team-members error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
