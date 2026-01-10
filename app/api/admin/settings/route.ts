import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 * Fetch all system settings
 *
 * @returns {Promise<NextResponse>} JSON response with settings array or error
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    // Only admins can access settings
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("setting_key");

    if (error) {
      console.error("Error fetching settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("Error in GET /api/admin/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update a system setting
 *
 * @param {Request} request - Request object containing setting_key and setting_value
 * @returns {Promise<NextResponse>} JSON response with success status or error
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    // Only admins can modify settings
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { setting_key, setting_value } = body;

    // Validate input
    if (!setting_key || setting_value === undefined) {
      return NextResponse.json(
        { error: "Missing setting_key or setting_value" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update the setting
    const { error } = await supabase
      .from("system_settings")
      .update({
        setting_value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("setting_key", setting_key);

    if (error) {
      console.error("Error updating setting:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the change in audit logs
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "UPDATE_SYSTEM_SETTING",
      details: {
        setting_key,
        new_value: setting_value,
        changed_by: user.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/admin/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
