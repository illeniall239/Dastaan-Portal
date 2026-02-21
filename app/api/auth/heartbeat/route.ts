import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/heartbeat
 * Called every 5 minutes from the client to keep last_seen_at fresh.
 * Used to approximate session duration for users who close the tab without logging out.
 */
export async function POST(_request: NextRequest) {
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

    const adminClient = createAdminClient();
    await adminClient
      .from("user_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session.sessionId)
      .is("logout_at", null); // don't update if already logged out

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // heartbeat failures are non-fatal
  }
}
