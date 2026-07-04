import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/episode-review?id={episodeUUID}
 * Returns full episode details + all submitted episodic evaluations for the Review dialog.
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: currentUser } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !currentUser ||
      !["management", "admin", "executive"].includes(currentUser.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Run episode + evaluations in parallel
    const [epResult, evalsResult] = await Promise.all([
      adminClient
        .from("episodes")
        .select(
          `id, episode_number, title, approval_status, approved_at,
           call_report:call_reports!call_report_id(id, call_report_id, working_title, logged_by:users!created_by(name))`
        )
        .eq("id", id)
        .single(),
      adminClient
        .from("episodic_evaluations")
        .select(
          `id, overall_average, created_at,
           no_of_pages, no_of_scenes, events, freeze_ending_scene,
           summary_analysis, remarks, scenes_remarks, characterization_remarks,
           conflict_of_content_score, conflict_of_content_comment,
           characterization_score, characterization_comment,
           story_progression_score, story_progression_comment,
           main_event_score, main_event_comment,
           small_event_score, small_event_comment,
           dragness_score, dragness_comment,
           freezes_score, freezes_comment,
           whats_next_element_score, whats_next_element_comment,
           overall_assessment_score, overall_assessment_comment,
           evaluator:users!evaluator_id(name, email, role, team:teams!team_id(name))`
        )
        .eq("episode_id", id)
        .order("created_at", { ascending: true }),
    ]);

    const { data: ep, error: epErr } = epResult;
    const { data: evals } = evalsResult;

    if (epErr || !ep) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const cr = (ep as any).call_report;

    return NextResponse.json({
      episode: {
        id: ep.id,
        episode_number: ep.episode_number,
        title: ep.title || null,
        approval_status: ep.approval_status || null,
        approved_at: ep.approved_at || null,
        call_report_id: cr?.call_report_id || null,
        call_report_title: cr?.working_title || null,
        logged_by_name: cr?.logged_by?.name || null,
      },
      evaluations: (evals || []).map((e: any) => ({
        id: e.id,
        evaluator_name: e.evaluator?.name || "Unknown",
        evaluator_email: e.evaluator?.email || "",
        evaluator_role: e.evaluator?.role || null,
        evaluator_team: e.evaluator?.team?.name || null,
        overall_average: e.overall_average ?? null,
        created_at: e.created_at || null,
        no_of_pages: e.no_of_pages ?? null,
        no_of_scenes: e.no_of_scenes ?? null,
        events: e.events || [],
        freeze_ending_scene: e.freeze_ending_scene || null,
        summary_analysis: e.summary_analysis || null,
        remarks: e.remarks || null,
        scenes_remarks: e.scenes_remarks || null,
        characterization_remarks: e.characterization_remarks || null,
        conflict_of_content_score: e.conflict_of_content_score ?? null,
        conflict_of_content_comment: e.conflict_of_content_comment || null,
        characterization_score: e.characterization_score ?? null,
        characterization_comment: e.characterization_comment || null,
        story_progression_score: e.story_progression_score ?? null,
        story_progression_comment: e.story_progression_comment || null,
        main_event_score: e.main_event_score ?? null,
        main_event_comment: e.main_event_comment || null,
        small_event_score: e.small_event_score ?? null,
        small_event_comment: e.small_event_comment || null,
        dragness_score: e.dragness_score ?? null,
        dragness_comment: e.dragness_comment || null,
        freezes_score: e.freezes_score ?? null,
        freezes_comment: e.freezes_comment || null,
        whats_next_element_score: e.whats_next_element_score ?? null,
        whats_next_element_comment: e.whats_next_element_comment || null,
        overall_assessment_score: e.overall_assessment_score ?? null,
        overall_assessment_comment: e.overall_assessment_comment || null,
      })),
    });
  } catch (error) {
    console.error("Error in episode-review GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
