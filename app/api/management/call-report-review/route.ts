import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/call-report-review?id={callReportUUID}
 * Returns full call report details + all submitted evaluations for the Review dialog.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
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

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Call report + creator name
    const { data: cr, error: crErr } = await adminClient
      .from("call_reports")
      .select(
        `id, call_report_id, working_title, logline, category, content_type,
         genre, target_slot, overall_rating, short_synopsis, episodic_synopsis,
         theme, director, total_episodes, received_episodes,
         idea_by, developed_by, management_member_name,
         meeting_notes, next_steps, meeting_date, meeting_attendees, duration_minutes,
         suggested_writer, logline_image_url,
         logged_by:users!created_by(name)`
      )
      .eq("id", id)
      .single();

    if (crErr || !cr) {
      return NextResponse.json(
        { error: "Call report not found" },
        { status: 404 }
      );
    }

    // 2. Writers
    const { data: writers } = await adminClient
      .from("call_report_writers")
      .select("writer_name, writer_email, display_order")
      .eq("call_report_id", id)
      .order("display_order");

    // 3. Attachments
    const { data: attachments } = await adminClient
      .from("attachments")
      .select("id, file_name, file_path, file_size, file_type, uploaded_at, uploader:users!uploaded_by(name)")
      .eq("entity_type", "call_report")
      .eq("entity_id", id)
      .order("uploaded_at", { ascending: false });

    // 4. Team initial assessments (per-user scores from initial_assessments table)
    const { data: initialAssessments } = await adminClient
      .from("initial_assessments")
      .select("id, score, comment, created_at, assessor:users!assessor_id(name, role)")
      .eq("entity_type", "call_report")
      .eq("entity_id", id)
      .order("created_at", { ascending: true });

    // 4. Submitted evaluations with per-criteria scores + evaluator info
    // evaluator_id FK → public.users, so the join works
    const { data: evals } = await adminClient
      .from("evaluator_forms")
      .select(
        `
        id, average_score, decision, decision_notes, comments,
        big_idea, theme, submitted_at,
        conflict_of_content_score, conflict_of_content_comment,
        characterization_score, characterization_comment,
        story_progression_score, story_progression_comment,
        whats_next_element_score, whats_next_element_comment,
        overall_oneliner_grade_score, overall_oneliner_grade_comment,
        evaluator:users!evaluator_id(name, email)
      `
      )
      .eq("call_report_id", id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: true });

    const loggedBy = (cr as any).logged_by;

    return NextResponse.json({
      callReport: {
        id: cr.id,
        call_report_id: cr.call_report_id,
        working_title: cr.working_title,
        logline: cr.logline || null,
        category: cr.category || null,
        content_type: cr.content_type || null,
        genre: cr.genre || null,
        target_slot: cr.target_slot || null,
        overall_rating: cr.overall_rating || null,
        short_synopsis: cr.short_synopsis || null,
        episodic_synopsis: cr.episodic_synopsis || null,
        logged_by_name: loggedBy?.name || null,
        writers: (writers || []).map((w: any) => ({
          writer_name: w.writer_name,
          writer_email: w.writer_email || null,
        })),
        theme: cr.theme || null,
        director: cr.director || null,
        total_episodes: cr.total_episodes ?? null,
        received_episodes: cr.received_episodes ?? null,
        idea_by: cr.idea_by || null,
        developed_by: cr.developed_by || null,
        management_member_name: cr.management_member_name || null,
        meeting_notes: cr.meeting_notes || null,
        next_steps: cr.next_steps || null,
        meeting_date: cr.meeting_date || null,
        meeting_attendees: cr.meeting_attendees || [],
        duration_minutes: cr.duration_minutes ?? null,
        suggested_writer: cr.suggested_writer || null,
        attachments: (attachments || []).map((a: any) => ({
          id: a.id,
          file_name: a.file_name,
          file_path: a.file_path,
          file_size: a.file_size ?? null,
          file_type: a.file_type ?? null,
          uploaded_at: a.uploaded_at ?? null,
          uploader_name: a.uploader?.name || null,
        })),
        initialAssessments: (initialAssessments || []).map((a: any) => ({
          id: a.id,
          score: a.score,
          comment: a.comment || null,
          assessor_name: a.assessor?.name || "Unknown",
          assessor_role: a.assessor?.role || null,
          created_at: a.created_at,
        })),
      },
      evaluations: (evals || []).map((e: any) => ({
        id: e.id,
        evaluator_name: e.evaluator?.name || "Unknown",
        evaluator_email: e.evaluator?.email || "",
        average_score: e.average_score ?? null,
        conflict_of_content_score: e.conflict_of_content_score ?? null,
        conflict_of_content_comment: e.conflict_of_content_comment || null,
        characterization_score: e.characterization_score ?? null,
        characterization_comment: e.characterization_comment || null,
        story_progression_score: e.story_progression_score ?? null,
        story_progression_comment: e.story_progression_comment || null,
        whats_next_element_score: e.whats_next_element_score ?? null,
        whats_next_element_comment: e.whats_next_element_comment || null,
        overall_oneliner_grade_score: e.overall_oneliner_grade_score ?? null,
        overall_oneliner_grade_comment: e.overall_oneliner_grade_comment || null,
        decision: e.decision || null,
        decision_notes: e.decision_notes || null,
        comments: e.comments || null,
        big_idea: e.big_idea || null,
        theme: e.theme || null,
        submitted_at: e.submitted_at || null,
      })),
    });
  } catch (error) {
    console.error("Error in call-report-review GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
