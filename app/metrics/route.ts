import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Minimal metrics endpoint; in production, forward to a real sink (e.g., Logflare, Sentry, Datadog)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Ensure only expected fields are logged
    const { name, value, id, label, page, navigationType, rating } = body || {};

    logger.info("📊 Web Vital", { name, value, id, label, page, navigationType, rating });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("❌ Metrics POST error", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}


