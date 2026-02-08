import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";

/**
 * GET /api/episodes/[id]/versions
 * Get all versions of an episode (same call_report_id + episode_number)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  try {
    // First, get the episode to find its call_report_id and episode_number
    const { data: episode, error: fetchError } = await supabase
      .from("episodes")
      .select("call_report_id, story_id, episode_number")
      .eq("id", id)
      .single();

    if (fetchError || !episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Fetch all versions of this episode
    let query = supabase
      .from("episodes")
      .select(`
        *,
        logged_by_user:users!logged_by(name, email),
        approved_by_user:users!approved_by(name, email)
      `)
      .eq("episode_number", episode.episode_number)
      .order("version", { ascending: false });

    if (episode.call_report_id) {
      query = query.eq("call_report_id", episode.call_report_id);
    } else if (episode.story_id) {
      query = query.eq("story_id", episode.story_id);
    }

    const { data: versions, error } = await query;

    if (error) {
      logger.error("Error fetching episode versions:", error);
      return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
    }

    return NextResponse.json({
      episode_number: episode.episode_number,
      call_report_id: episode.call_report_id,
      total_versions: versions?.length || 0,
      versions: versions || [],
    });

  } catch (error) {
    logger.error("Error in GET /api/episodes/[id]/versions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
