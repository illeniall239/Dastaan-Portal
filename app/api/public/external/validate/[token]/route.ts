import { createClient } from "@/lib/supabase/server";
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

    const supabase = await createClient();

    // Fetch external evaluation link
    const { data: link, error: linkError } = await supabase
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

    // Check if max submissions reached
    if (link.max_submissions !== null && link.current_submissions >= link.max_submissions) {
      return NextResponse.json(
        { error: "Maximum number of submissions reached for this link" },
        { status: 403 }
      );
    }

    // Fetch content based on content_type
    let content: any = null;

    if (link.content_type === "episode") {
      const { data: episode, error: episodeError } = await supabase
        .from("episodes")
        .select(`
          id,
          episode_number,
          title,
          attachment_url,
          attachment_name,
          additional_info,
          story_id,
          stories!inner(
            title,
            genre,
            writer_originator_name
          )
        `)
        .eq("id", link.content_id)
        .single();

      if (episodeError || !episode) {
        return NextResponse.json(
          { error: "Episode not found" },
          { status: 404 }
        );
      }

      content = {
        type: "episode",
        episode_number: episode.episode_number,
        episode_title: episode.title,
        story_title: (episode as any).stories?.title,
        genre: (episode as any).stories?.genre,
        writer: (episode as any).stories?.writer_originator_name,
        attachment_url: episode.attachment_url,
        attachment_name: episode.attachment_name,
        additional_info: episode.additional_info,
      };
    } else if (link.content_type === "one_liner") {
      const { data: oneLiner, error: oneLinerError } = await supabase
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
    }

    return NextResponse.json({
      valid: true,
      link: {
        content_type: link.content_type,
        content_id: link.content_id,
        expires_at: link.expires_at,
        allowed_emails: link.allowed_emails,
        submissions_remaining:
          link.max_submissions !== null
            ? link.max_submissions - link.current_submissions
            : null,
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
