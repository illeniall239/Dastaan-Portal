import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/episodes/[id]/revisions/[revisionId]
 * Update initial assessment for an episode revision
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const { id, revisionId } = await params;

  const idValidation = idParamSchema.safeParse({ id });
  const revisionIdValidation = idParamSchema.safeParse({ id: revisionId });
  if (!idValidation.success || !revisionIdValidation.success) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !userData?.role ||
      !["content_manager", "content_creator", "admin", "management", "programmer", "gcm"].includes(userData.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const score = body.initial_assessment;

    if (typeof score !== "number" || score < 1 || score > 10) {
      return NextResponse.json(
        { error: "initial_assessment must be a number between 1 and 10" },
        { status: 400 }
      );
    }

    const { data: revision, error } = await supabase
      .from("episode_revisions")
      .update({
        initial_assessment: score,
        assessed_by: user.id,
        assessed_at: new Date().toISOString(),
      })
      .eq("id", revisionId)
      .eq("episode_id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating episode revision assessment:", error);
      return NextResponse.json(
        { error: "Failed to update assessment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ revision });
  } catch (error) {
    logger.error("Error in PATCH /api/episodes/[id]/revisions/[revisionId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/episodes/[id]/revisions/[revisionId]
 * Delete a specific revision
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;

  const { id, revisionId } = await params;

  // Validate both UUIDs
  const idValidation = idParamSchema.safeParse({ id });
  const revisionIdValidation = idParamSchema.safeParse({ id: revisionId });
  if (!idValidation.success || !revisionIdValidation.success) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch the revision
    const { data: revision, error: fetchError } = await supabase
      .from("episode_revisions")
      .select("*")
      .eq("id", revisionId)
      .eq("episode_id", id)
      .single();

    if (fetchError || !revision) {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 }
      );
    }

    // Check permissions: uploader or content_manager/admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const canDelete =
      revision.uploaded_by === user.id ||
      (userData?.role &&
        ["content_manager", "admin", "management"].includes(userData.role));

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete file from storage if exists
    if (revision.attachment_url) {
      try {
        const url = new URL(revision.attachment_url);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.indexOf("episodes");
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join("/");
          await supabase.storage.from("episodes").remove([filePath]);
        }
      } catch (storageError) {
        logger.error("Error deleting revision file from storage:", storageError);
        // Continue with DB deletion
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("episode_revisions")
      .delete()
      .eq("id", revisionId);

    if (deleteError) {
      logger.error("Error deleting episode revision:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete revision" },
        { status: 500 }
      );
    }

    // Audit log
    try {
      const ctx = await getRequestContext(request);
      await logAuditAction({
        action: "delete",
        entityType: "episode_revision",
        entityId: revisionId,
        performedBy: user.id,
        details: {
          episode_id: id,
          revision_number: revision.revision_number,
          attachment_name: revision.attachment_name,
          ...ctx,
        },
      });
    } catch (auditError) {
      logger.error("Audit log error:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Error in DELETE /api/episodes/[id]/revisions/[revisionId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
