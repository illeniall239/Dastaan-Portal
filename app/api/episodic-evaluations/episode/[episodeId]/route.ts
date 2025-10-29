import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/episodic-evaluations/episode/[episodeId]
 * Get the current evaluator's evaluation for a specific episode
 * Used to check if evaluator has already evaluated this episode
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params;
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

  if (!userData || !["evaluator", "content_manager", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
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

    // Get evaluation for this episode by current evaluator
    const { data: evaluation, error } = await supabase
      .from("episodic_evaluations")
      .select(`
        *,
        evaluator:users!evaluator_id(name, email),
        episode:episodes(
          *,
          call_report:call_reports(working_title, writer_name),
          story:stories(title, status)
        )
      `)
      .eq("episode_id", episodeId)
      .eq("evaluator_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching episodic evaluation:", error);
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluation", details: error.message },
        { status: 500 }
      );
    }

    // Return evaluation if found, or null if not found
    return NextResponse.json({
      evaluation: evaluation || null,
      hasEvaluated: !!evaluation,
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
