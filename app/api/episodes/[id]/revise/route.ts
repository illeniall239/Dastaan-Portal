import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { revalidatePath } from "next/cache";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * POST /api/episodes/[id]/revise
 * Create a new version of an existing episode
 * Keeps the old version (is_current=false) and creates a new current version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const { id } = await params;

  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_manager", "evaluator", "programmer", "management", "admin"].includes(userData.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { attachment_url, attachment_name, attachment_type, additional_info, title } = body;

    if (!attachment_url || !attachment_name) {
      return NextResponse.json(
        { error: "attachment_url and attachment_name are required for a revision" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch the existing episode
    const { data: existing, error: fetchError } = await adminClient
      .from("episodes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Mark old version as not current
    const { error: updateError } = await adminClient
      .from("episodes")
      .update({ is_current: false })
      .eq("id", id);

    if (updateError) {
      logger.error("Error marking old version as not current:", updateError);
      return NextResponse.json({ error: "Failed to update old version" }, { status: 500 });
    }

    // Create new version
    const { data: newEpisode, error: insertError } = await adminClient
      .from("episodes")
      .insert({
        call_report_id: existing.call_report_id,
        story_id: existing.story_id,
        episode_number: existing.episode_number,
        version: (existing.version || 1) + 1,
        is_current: true,
        supersedes_id: existing.id,
        title: title ?? existing.title,
        attachment_url,
        attachment_name,
        attachment_type: attachment_type || existing.attachment_type,
        additional_info: additional_info ?? existing.additional_info,
        logged_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      logger.error("Error creating new episode version:", insertError);
      // Rollback: restore old version as current
      await adminClient
        .from("episodes")
        .update({ is_current: true })
        .eq("id", id);
      return NextResponse.json({ error: "Failed to create new version" }, { status: 500 });
    }

    revalidatePath("/evaluator/episodes");
    revalidatePath("/programmer/episodes");

    return NextResponse.json({
      success: true,
      data: newEpisode,
      previous_version_id: existing.id,
    });

  } catch (error) {
    logger.error("Error in POST /api/episodes/[id]/revise:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
