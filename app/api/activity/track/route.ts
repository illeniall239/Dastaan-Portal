import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

interface ActivityEvent {
  type: "page_view" | "click" | "client_error";
  session_id: string;
  route?: string;
  // click-specific
  element_tag?: string;
  element_text?: string;
  element_id?: string;
  // error-specific
  error_message?: string;
  error_stack?: string;
  // extra
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  // Relaxed rate limit — this endpoint is called frequently
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") || null;

  let body: { events: ActivityEvent[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: "events array required" }, { status: 400 });
  }

  // Cap batch size
  const events = body.events.slice(0, 50);

  // Get authenticated user (optional — activity is still tracked for unauthenticated sessions)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const rows = events.map((event) => ({
    type: event.type,
    user_id: user?.id || null,
    session_id: event.session_id || null,
    route: event.route || null,
    element_tag: event.element_tag || null,
    element_text: event.element_text ? event.element_text.slice(0, 100) : null,
    element_id: event.element_id || null,
    error_message: event.error_message || null,
    error_stack: event.error_stack || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: event.metadata || null,
  }));

  // Await the insert so data is not silently dropped; still return 200 on failure
  const { error: insertError } = await supabase.from("activity_logs").insert(rows);
  if (insertError) {
    console.error("[activity/track] insert failed:", insertError.message);
  }

  return NextResponse.json({}, { status: 200 });
}
