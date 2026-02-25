import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/episodes/[id]/discussions/[discussionId]
 * Delete an episode discussion message (own messages, or admin/management)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; discussionId: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const { id, discussionId } = await params;

  const episodeValidation = idParamSchema.safeParse({ id });
  const discussionValidation = idParamSchema.safeParse({ id: discussionId });
  if (!episodeValidation.success || !discussionValidation.success) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch the discussion to check ownership
    const { data: discussion } = await supabase
      .from("episode_discussions")
      .select("id, user_id, episode_id, is_system_message")
      .eq("id", discussionId)
      .eq("episode_id", id)
      .single();

    if (!discussion) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // System messages cannot be deleted
    if (discussion.is_system_message) {
      return NextResponse.json({ error: "System messages cannot be deleted" }, { status: 403 });
    }

    // Check role for elevated delete permission
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const canDelete =
      discussion.user_id === user.id ||
      (userData && ["admin", "management"].includes(userData.role));

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from("episode_discussions")
      .delete()
      .eq("id", discussionId);

    if (deleteError) {
      logger.error("Error deleting episode discussion message:", deleteError);
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }

    // Audit log
    try {
      const ctx = await getRequestContext(request);
      await logAuditAction({
        action: "delete",
        entityType: "episode_discussion",
        entityId: discussionId,
        performedBy: user.id,
        details: { episode_id: id, ...ctx },
      });
    } catch (auditError) {
      logger.error("Audit log error:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in DELETE /api/episodes/[id]/discussions/[discussionId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
