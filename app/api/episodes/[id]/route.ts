import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { updateEpisodeSchema } from "@/lib/validations/episodes";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

/**
 * GET /api/episodes/[id]
 * Get a single episode by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: episode, error } = await supabase
      .from("episodes")
      .select(`
        *,
        logged_by_user:users!logged_by(name, email),
        call_report:call_reports(working_title, writer_name),
        story:stories(title, status)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episode not found" },
          { status: 404 }
        );
      }
      logger.error(`Error fetching episode: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: "Failed to fetch episode", details: error.message },
        { status: 500 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({ episode })), rate.result);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * PATCH /api/episodes/[id]
 * Update an episode
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // First, check if episode exists and get owner
    const { data: existingEpisode, error: fetchError } = await supabase
      .from("episodes")
      .select("logged_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episode not found" },
          { status: 404 }
        );
      }
      logger.error(`Error fetching episode:: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      return NextResponse.json(
        { error: "Failed to fetch episode", details: fetchError.message },
        { status: 500 }
      );
    }

    // Check permissions: owner, evaluator, or manager/admin
    const canEdit =
      existingEpisode.logged_by === user.id ||
      ["evaluator", "content_manager", "admin"].includes(userData.role);

    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to edit this episode" },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = updateEpisodeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Update episode
    const { data: updatedEpisode, error: updateError } = await supabase
      .from("episodes")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        logged_by_user:users!logged_by(name, email),
        call_report:call_reports(working_title, writer_name),
        story:stories(title, status)
      `)
      .single();

    if (updateError) {
      logger.error(`Error updating episode:: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
      return NextResponse.json(
        { error: "Failed to update episode", details: updateError.message },
        { status: 500 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "Episode updated successfully",
      episode: updatedEpisode,
    })), rate.result);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * DELETE /api/episodes/[id]
 * Delete an episode
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // First, check if episode exists and get owner + attachment info
    const { data: existingEpisode, error: fetchError } = await supabase
      .from("episodes")
      .select("logged_by, attachment_url")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episode not found" },
          { status: 404 }
        );
      }
      logger.error(`Error fetching episode:: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      return NextResponse.json(
        { error: "Failed to fetch episode", details: fetchError.message },
        { status: 500 }
      );
    }

    // Check permissions: owner, evaluator, or manager/admin
    const canDelete =
      existingEpisode.logged_by === user.id ||
      ["evaluator", "content_manager", "admin"].includes(userData.role);

    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to delete this episode" },
        { status: 403 }
      );
    }

    // Delete the episode from database
    const { error: deleteError } = await supabase
      .from("episodes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error(`Error deleting episode:: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
      return NextResponse.json(
        { error: "Failed to delete episode", details: deleteError.message },
        { status: 500 }
      );
    }

    // If there was an attachment, delete it from storage
    if (existingEpisode.attachment_url) {
      try {
        // Extract file path from URL
        const url = new URL(existingEpisode.attachment_url);
        const pathParts = url.pathname.split("/");
        const filePath = pathParts.slice(pathParts.indexOf("episode-files") + 1).join("/");

        await supabase.storage
          .from("episodes")
          .remove([filePath]);
      } catch (storageError) {
        logger.error(`Error deleting attachment from storage:: ${storageError instanceof Error ? storageError.message : String(storageError)}`);
        // Continue anyway - episode is deleted from database
      }
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "Episode deleted successfully",
    })), rate.result);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}
