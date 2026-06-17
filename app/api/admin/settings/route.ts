import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 * Fetch all system settings
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("setting_key");

    if (error) {
      logger.error("Error fetching settings:", { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    logger.error("Error in GET /api/admin/settings:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update a system setting
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.strict, user.id);
    if (!rate.success) return rate.response!;

    const body = await request.json();
    const { setting_key, setting_value } = body;

    if (!setting_key || setting_value === undefined) {
      return NextResponse.json(
        { error: "Missing setting_key or setting_value" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("system_settings")
      .update({
        setting_value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("setting_key", setting_key);

    if (error) {
      logger.error("Error updating setting:", { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "system_setting",
      entityId: setting_key,
      action: "updated",
      performedBy: user.id,
      details: {
        ...requestContext,
        newValues: { setting_key, setting_value },
      },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in PUT /api/admin/settings:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
