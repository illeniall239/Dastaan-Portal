import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams.token;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Fetch external evaluation link
    // Use admin client to bypass RLS since this is a public endpoint
    // and the external_evaluation_links table is restricted to management
    const { data: link, error: linkError } = await adminSupabase
      .from("external_evaluation_links")
      .select("*")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        { error: "Invalid token: Link not found" },
        { status: 404 }
      );
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json(
        { error: "This evaluation link has been deactivated" },
        { status: 403 }
      );
    }

    // Check if link has expired
    const now = new Date();
    const expiresAt = new Date(link.expires_at);
    if (expiresAt < now) {
      return NextResponse.json(
        { error: "This evaluation link has expired" },
        { status: 410 }
      );
    }

    // Multi-layer duplicate submission check
    const evaluatorId = request.nextUrl.searchParams.get("evaluator_id");
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";

    // Layer 1: Check if evaluator_id already submitted (localStorage tracking)
    if (evaluatorId) {
      const { data: existingByEvaluatorId } = await adminSupabase
        .from("external_evaluations")
        .select("id, submitted_at")
        .eq("link_id", link.id)
        .eq("evaluator_id", evaluatorId)
        .single();

      if (existingByEvaluatorId) {
        return NextResponse.json({
          valid: false,
          already_submitted: true,
          submitted_at: existingByEvaluatorId.submitted_at,
          message: "You have already submitted your evaluation"
        }, { status: 200 });
      }
    }

    // Layer 2: Check if IP address already submitted (bypass detection)
    if (ipAddress && ipAddress !== "unknown") {
      const { data: existingByIp } = await adminSupabase
        .from("external_evaluations")
        .select("id, submitted_at")
        .eq("link_id", link.id)
        .eq("ip_address", ipAddress)
        .single();

      if (existingByIp) {
        return NextResponse.json({
          valid: false,
          already_submitted: true,
          submitted_at: existingByIp.submitted_at,
          message: "A submission has already been received from your network. If you believe this is an error, please contact support."
        }, { status: 200 });
      }
    }

    // Fetch content based on content_type (using admin client to bypass RLS)
    let content: any = null;

    if (link.content_type === "episode") {
      const { data: episode, error: episodeError } = await adminSupabase
        .from("episodes")
        .select(`
          id,
          episode_number,
          title,
          attachment_url,
          attachment_name,
          additional_info,
          story_id,
          call_report_id,
          stories (
            title,
            genre,
            writer_originator_name
          ),
          call_reports (
            working_title,
            writer_name,
            genre
          )
        `)
        .eq("id", link.content_id)
        .single();

      if (episodeError || !episode) {
        console.error("Error fetching episode:", episodeError);
        return NextResponse.json(
          { error: "Episode not found" },
          { status: 404 }
        );
      }

      // Get context from story or call_report (whichever exists)
      const storyData = (episode as any).stories;
      const callReportData = (episode as any).call_reports;

      content = {
        type: "episode",
        episode_number: episode.episode_number,
        episode_title: episode.title,
        story_title: storyData?.title || callReportData?.working_title,
        genre: storyData?.genre || callReportData?.genre,
        writer: storyData?.writer_originator_name || callReportData?.writer_name,
        attachment_url: episode.attachment_url,
        attachment_name: episode.attachment_name,
        additional_info: episode.additional_info,
      };
    } else if (link.content_type === "one_liner") {
      const { data: oneLiner, error: oneLinerError } = await adminSupabase
        .from("one_liners")
        .select(`
          id,
          one_liner_summary,
          writer_name,
          avg_eval_score,
          key_strengths,
          urgency,
          decision,
          story_id,
          stories!inner(
            title,
            genre,
            logline,
            synopsis
          )
        `)
        .eq("id", link.content_id)
        .single();

      if (oneLinerError || !oneLiner) {
        return NextResponse.json(
          { error: "One-liner not found" },
          { status: 404 }
        );
      }

      content = {
        type: "one_liner",
        summary: oneLiner.one_liner_summary,
        story_title: (oneLiner as any).stories?.title,
        genre: (oneLiner as any).stories?.genre,
        writer: oneLiner.writer_name,
        logline: (oneLiner as any).stories?.logline,
        synopsis: (oneLiner as any).stories?.synopsis,
        avg_eval_score: oneLiner.avg_eval_score,
        key_strengths: oneLiner.key_strengths,
        urgency: oneLiner.urgency,
        current_decision: oneLiner.decision,
      };
    } else if (link.content_type === "call_report") {
      // 1. Fetch Call Report details (without writers - they use a junction table)
      const { data: callReport, error: callReportError } = await adminSupabase
        .from("call_reports")
        .select(`
          id,
          call_report_id,
          working_title,
          logline,
          genre,
          content_type,
          contact_type,
          overall_rating,
          meeting_notes,
          logline_image_url,
          short_synopsis,
          episodic_synopsis,
          category,
          writer_name,
          stories(
            id,
            title,
            synopsis,
            writer_originator_name
          )
        `)
        .eq("id", link.content_id)
        .single();

      if (callReportError || !callReport) {
        console.error("Error fetching call report:", callReportError);
        return NextResponse.json(
          { error: "Call report not found" },
          { status: 404 }
        );
      }

      // 2. Fetch Writers separately from junction table
      const { data: writersData } = await adminSupabase
        .from("call_report_writers")
        .select(`
          writer_id,
          display_order,
          writer:writers(
            id,
            name,
            email,
            phone
          )
        `)
        .eq("call_report_id", link.content_id)
        .order("display_order", { ascending: true });

      const writers = writersData?.map((w: any) => ({
        name: w.writer?.name,
        email: w.writer?.email,
        phone: w.writer?.phone,
        display_order: w.display_order
      })) || [];

      content = {
        type: "call_report",
        call_report_id: callReport.call_report_id,
        working_title: callReport.working_title,
        logline: callReport.logline,
        short_synopsis: callReport.short_synopsis,
        episodic_synopsis: callReport.episodic_synopsis,
        category: callReport.category,
        genre: callReport.genre || [],
        content_type: callReport.content_type,
        contact_type: callReport.contact_type,
        overall_rating: callReport.overall_rating,
        meeting_notes: callReport.meeting_notes,
        logline_image_url: callReport.logline_image_url,
        story_title: (callReport as any).stories?.title,
        synopsis: (callReport as any).stories?.synopsis,
        writer_name: callReport.writer_name || (callReport as any).stories?.writer_originator_name,
        writers: writers,
      };
    }

    return NextResponse.json({
      valid: true,
      link: {
        content_type: link.content_type,
        content_id: link.content_id,
        expires_at: link.expires_at,
        allowed_emails: link.allowed_emails,
      },
      content,
    });
  } catch (error) {
    logger.error(`Error in validate token API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
