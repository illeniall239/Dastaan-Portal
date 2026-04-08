import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/heartbeat
 * Called every 5 minutes from the client to keep last_seen_at fresh.
 * Accepts { active_minutes } — the number of minutes the tab was in the foreground
 * since the last heartbeat — and accumulates it into user_sessions.active_minutes.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const session = await getUserSession();
    if (!session?.sessionId) {
      return NextResponse.json({ ok: true }); // no-op if sessionId not in cookie
    }

    const body = await request.json().catch(() => ({}));
    // Cap at 10 minutes per heartbeat (interval is 5 min, allow small drift)
    const incomingActive = Math.min(Math.max(0, Math.round(body.active_minutes ?? 0)), 10);

    const adminClient = createAdminClient();

    // Read current active_minutes, then write incremented value
    const { data: current } = await adminClient
      .from("user_sessions")
      .select("active_minutes")
      .eq("id", session.sessionId)
      .is("logout_at", null)
      .single();

    if (current) {
      await adminClient
        .from("user_sessions")
        .update({
          last_seen_at: new Date().toISOString(),
          active_minutes: ((current as any).active_minutes ?? 0) + incomingActive,
        })
        .eq("id", session.sessionId)
        .is("logout_at", null);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // heartbeat failures are non-fatal
  }
}
