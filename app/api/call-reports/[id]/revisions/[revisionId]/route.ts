import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/call-reports/[id]/revisions/[revisionId]
 * Delete a specific call report revision
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
      .from("call_report_revisions")
      .select("*")
      .eq("id", revisionId)
      .eq("call_report_id", id)
      .single();

    if (fetchError || !revision) {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 }
      );
    }

    // Check permissions: uploader or elevated roles
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const canDelete =
      revision.uploaded_by === user.id ||
      (userData?.role &&
        ["content_manager", "admin", "management", "programmer", "gcm"].includes(userData.role));

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete file from storage if exists
    if (revision.attachment_url) {
      try {
        const url = new URL(revision.attachment_url);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.indexOf("attachments");
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join("/");
          await supabase.storage.from("attachments").remove([filePath]);
        }
      } catch (storageError) {
        logger.error("Error deleting revision file from storage:", storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("call_report_revisions")
      .delete()
      .eq("id", revisionId);

    if (deleteError) {
      logger.error("Error deleting call report revision:", deleteError);
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
        entityType: "call_report_revision",
        entityId: revisionId,
        performedBy: user.id,
        details: {
          call_report_id: id,
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
      "Error in DELETE /api/call-reports/[id]/revisions/[revisionId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
