import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createRevisionSchema = z.object({
  attachment_url: z.string().url().optional().nullable(),
  attachment_name: z.string().max(255).optional().nullable(),
  attachment_type: z.string().max(100).optional().nullable(),
  comment: z.string().max(5000).optional().nullable(),
});

/**
 * GET /api/episodes/[id]/revisions
 * Get all revisions for an episode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;

  const { id } = await params;

  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
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
    // Verify episode exists
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id")
      .eq("id", id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const { data: revisions, error } = await supabase
      .from("episode_revisions")
      .select(
        `
        *,
        uploaded_by_user:users!uploaded_by(name, email)
      `
      )
      .eq("episode_id", id)
      .order("revision_number", { ascending: true });

    if (error) {
      logger.error("Error fetching episode revisions:", error);
      return NextResponse.json(
        { error: "Failed to fetch revisions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ revisions: revisions || [] });
  } catch (error) {
    logger.error("Error in GET /api/episodes/[id]/revisions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/episodes/[id]/revisions
 * Create a new revision for an episode
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
    // Parse and validate body
    const body = await request.json();
    const validation = createRevisionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.format() },
        { status: 400 }
      );
    }

    // Verify episode exists
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id, episode_number, call_report_id, story_id")
      .eq("id", id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Auto-calculate next revision number
    const { data: maxRevision } = await supabase
      .from("episode_revisions")
      .select("revision_number")
      .eq("episode_id", id)
      .order("revision_number", { ascending: false })
      .limit(1)
      .single();

    const nextRevisionNumber = (maxRevision?.revision_number || 0) + 1;

    // Insert revision
    const { data: revision, error: insertError } = await supabase
      .from("episode_revisions")
      .insert({
        episode_id: id,
        revision_number: nextRevisionNumber,
        attachment_url: validation.data.attachment_url || null,
        attachment_name: validation.data.attachment_name || null,
        attachment_type: validation.data.attachment_type || null,
        comment: validation.data.comment || null,
        uploaded_by: user.id,
      })
      .select(
        `
        *,
        uploaded_by_user:users!uploaded_by(name, email)
      `
      )
      .single();

    if (insertError) {
      logger.error("Error creating episode revision:", insertError);
      return NextResponse.json(
        { error: "Failed to create revision" },
        { status: 500 }
      );
    }

    // Audit log
    try {
      const ctx = await getRequestContext(request);
      await logAuditAction({
        action: "create",
        entityType: "episode_revision",
        entityId: revision.id,
        performedBy: user.id,
        details: {
          episode_id: id,
          revision_number: nextRevisionNumber,
          attachment_name: validation.data.attachment_name,
          ...ctx,
        },
      });
    } catch (auditError) {
      logger.error("Audit log error:", auditError);
    }

    return NextResponse.json({ revision }, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/episodes/[id]/revisions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
