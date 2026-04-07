import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/login-activity
 * Returns per-user login stats + individual session history.
 * Admin only.
 */
export async function GET(_request: NextRequest) {
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

    const adminClient = createAdminClient();

    // Fetch all users
    const { data: users, error: usersErr } = await adminClient
      .from("users")
      .select("id, name, email, role, position, created_at, team_id")
      .order("name");

    if (usersErr) throw usersErr;

    // Fetch all teams for team badge display
    const { data: teamsData } = await adminClient
      .from("teams")
      .select("id, name, team_type");
    const teamsMap: Record<string, { name: string; team_type: string }> = {};
    for (const t of teamsData || []) {
      teamsMap[t.id] = { name: t.name, team_type: t.team_type };
    }

    // Fetch last_sign_in_at from Supabase Auth (covers logins before our tracking existed)
    const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const authLastLogin: Record<string, string | null> = {};
    for (const authUser of authData?.users ?? []) {
      authLastLogin[authUser.id] = authUser.last_sign_in_at ?? null;
    }

    // Fetch all sessions
    const { data: sessions, error: sessionsErr } = await adminClient
      .from("user_sessions")
      .select("id, user_id, login_at, last_seen_at, logout_at")
      .order("login_at", { ascending: false });

    if (sessionsErr) throw sessionsErr;

    const NOW = Date.now();
    const TEN_MIN = 10 * 60 * 1000;

    // Group sessions by user_id
    const sessionsByUser: Record<string, typeof sessions> = {};
    for (const s of sessions || []) {
      if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = [];
      sessionsByUser[s.user_id].push(s);
    }

    const result = (users || []).map((u) => {
      const userSessions = sessionsByUser[u.id] || [];

      let totalMinutes = 0;
      let lastLogin: string | null = null;
      let isOnline = false;

      const sessionDetails = userSessions.map((s) => {
        const end = s.logout_at
          ? new Date(s.logout_at).getTime()
          : new Date(s.last_seen_at).getTime();
        const start = new Date(s.login_at).getTime();
        const durationMinutes = Math.max(0, Math.round((end - start) / 60000));
        totalMinutes += durationMinutes;

        // "Online now" if no logout and last_seen within 10 min
        if (!s.logout_at && NOW - new Date(s.last_seen_at).getTime() < TEN_MIN) {
          isOnline = true;
        }

        return {
          id: s.id,
          login_at: s.login_at,
          last_seen_at: s.last_seen_at,
          logout_at: s.logout_at,
          duration_minutes: durationMinutes,
          status: s.logout_at
            ? "logged_out"
            : NOW - new Date(s.last_seen_at).getTime() < TEN_MIN
            ? "online"
            : "expired",
        };
      });

      if (userSessions.length > 0) {
        lastLogin = userSessions[0].login_at; // already sorted DESC
      }

      const supabaseLastLogin = authLastLogin[u.id] ?? null;
      // Effective last login: prefer our tracked sessions (more precise), fall back to Supabase auth
      const effectiveLastLogin = lastLogin ?? supabaseLastLogin;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        position: u.position,
        team: (u as any).team_id ? (teamsMap[(u as any).team_id] ?? null) : null,
        account_created: u.created_at,
        total_sessions: userSessions.length,
        total_minutes: totalMinutes,
        last_login: lastLogin,
        supabase_last_login: supabaseLastLogin,
        effective_last_login: effectiveLastLogin,
        is_online: isOnline,
        sessions: sessionDetails,
      };
    });

    // Sort: online first, then by effective_last_login descending, then never-logged-in last
    result.sort((a, b) => {
      if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
      if (!a.effective_last_login && !b.effective_last_login) return 0;
      if (!a.effective_last_login) return 1;
      if (!b.effective_last_login) return -1;
      return new Date(b.effective_last_login).getTime() - new Date(a.effective_last_login).getTime();
    });

    return NextResponse.json({ success: true, users: result });
  } catch (error) {
    console.error("Error in login-activity GET:", error);
    return NextResponse.json({ error: "Failed to fetch login activity" }, { status: 500 });
  }
}
