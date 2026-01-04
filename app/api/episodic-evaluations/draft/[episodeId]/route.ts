import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { episodeIdParamSchema } from "@/lib/validations/uuid-params";
import { z } from "zod";

// Schema for validating draft data
const draftDataSchema = z.object({
  noOfPages: z.number(),
  noOfScenes: z.number(),
  events: z.array(z.any()), // Array of EventItems
  conflictScore: z.number(),
  characterizationScore: z.number(),
  progressionScore: z.number(),
  freezesScore: z.number(),
  whatsNextScore: z.number(),
  accumulatedTimeMinutes: z.number().min(0).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params;

  // Validate UUID format
  const paramValidation = episodeIdParamSchema.safeParse({ episodeId });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid episode ID format", details: paramValidation.error.format() },
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
    // Fetch draft evaluation data
    const { data, error } = await supabase
      .from("episodic_evaluation_drafts")
      .select("*")
      .eq("episode_id", episodeId)
      .eq("evaluator_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      logger.error(`Error fetching draft evaluation: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: "Failed to fetch draft evaluation", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      // No draft found
      return NextResponse.json({ draft: null });
    }

    return NextResponse.json({ draft: data });
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params;

  // Validate UUID format
  const paramValidation = episodeIdParamSchema.safeParse({ episodeId });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid episode ID format", details: paramValidation.error.format() },
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
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData || !["evaluator", "programmer", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Only evaluators can save draft evaluations" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate draft data
    const validation = draftDataSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const draftData = validation.data;

    // Check if episode exists
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id")
      .eq("id", episodeId)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: "Episode not found" },
        { status: 404 }
      );
    }

    // Insert or update draft evaluation
    const { data: draft, error: insertError } = await supabase
      .from("episodic_evaluation_drafts")
      .upsert({
        episode_id: episodeId,
        evaluator_id: user.id,
        draft_data: draftData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'episode_id,evaluator_id'
      })
      .select("*")
      .single();

    if (insertError) {
      logger.error(`Error saving draft evaluation:: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
      return NextResponse.json(
        { error: "Failed to save draft evaluation", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Draft evaluation saved successfully",
        draft,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params;

  // Validate UUID format
  const paramValidation = episodeIdParamSchema.safeParse({ episodeId });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid episode ID format", details: paramValidation.error.format() },
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
    // Check if draft exists and get owner
    const { data: draft, error: fetchError } = await supabase
      .from("episodic_evaluation_drafts")
      .select("evaluator_id")
      .eq("episode_id", episodeId)
      .eq("evaluator_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") { // No rows found
        return NextResponse.json(
          { message: "No draft found for this episode" },
          { status: 200 }
        );
      }
      logger.error(`Error fetching draft evaluation:: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      return NextResponse.json(
        { error: "Failed to fetch draft evaluation", details: fetchError.message },
        { status: 500 }
      );
    }

    // Delete the draft
    const { error: deleteError } = await supabase
      .from("episodic_evaluation_drafts")
      .delete()
      .eq("episode_id", episodeId)
      .eq("evaluator_id", user.id);

    if (deleteError) {
      logger.error(`Error deleting draft evaluation:: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
      return NextResponse.json(
        { error: "Failed to delete draft evaluation", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Draft evaluation deleted successfully",
    });
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}