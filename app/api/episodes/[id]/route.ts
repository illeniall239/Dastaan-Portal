import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateEpisodeSchema } from "@/lib/validations/episodes";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

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
      console.error("Error fetching episode:", error);
      return NextResponse.json(
        { error: "Failed to fetch episode", details: error.message },
        { status: 500 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({ episode })), rate.result);

  } catch (error) {
    console.error("Unexpected error:", error);
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
      console.error("Error fetching episode:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch episode", details: fetchError.message },
        { status: 500 }
      );
    }

    // Check permissions: owner or manager/admin
    const canEdit =
      existingEpisode.logged_by === user.id ||
      ["content_manager", "admin"].includes(userData.role);

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
      console.error("Error updating episode:", updateError);
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
    console.error("Unexpected error:", error);
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
      console.error("Error fetching episode:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch episode", details: fetchError.message },
        { status: 500 }
      );
    }

    // Check permissions: owner or manager/admin
    const canDelete =
      existingEpisode.logged_by === user.id ||
      ["content_manager", "admin"].includes(userData.role);

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
      console.error("Error deleting episode:", deleteError);
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
        console.error("Error deleting attachment from storage:", storageError);
        // Continue anyway - episode is deleted from database
      }
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "Episode deleted successfully",
    })), rate.result);

  } catch (error) {
    console.error("Unexpected error:", error);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}
