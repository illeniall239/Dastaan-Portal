import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export const dynamic = "force-dynamic";

async function getAttachmentsForEntity(adminSupabase: any, entityType: string, entityId: string) {
  const { data, error } = await adminSupabase
    .from('attachments')
    .select('id, file_name, file_path')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    logger.error('Error fetching attachments:', error);
    return [];
  }

  return data || [];
}

async function fetchContentByType(adminSupabase: any, contentType: string, contentId: string) {
  if (contentType === "episode") {
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
      .eq("id", contentId)
      .single();

    if (episodeError || !episode) {
      logger.error("Error fetching episode:", episodeError);
      return null;
    }

    const storyData = (episode as any).stories;
    const callReportData = (episode as any).call_reports;

    // Generate a signed URL for the episode script so external (unauthenticated)
    // users can download it without needing public bucket access.
    let signedAttachmentUrl: string | null = null;
    if (episode.attachment_url) {
      try {
        let filePath: string | null = null;
        const storedValue = episode.attachment_url as string;

        if (storedValue.startsWith("http")) {
          const url = new URL(storedValue);
          const pathParts = url.pathname.split("/");
          const bucketIndex = pathParts.indexOf("episodes");
          if (bucketIndex !== -1) {
            filePath = pathParts.slice(bucketIndex + 1).join("/");
          }
        } else {
          filePath = storedValue;
        }

        if (filePath) {
          const { data: signedData } = await adminSupabase.storage
            .from("episodes")
            .createSignedUrl(filePath, 3600);
          signedAttachmentUrl = signedData?.signedUrl || null;
        }
      } catch {
        // Fall back to raw URL if signed URL generation fails
      }
    }

    return {
      type: "episode",
      content_id: episode.id,
      episode_number: episode.episode_number,
      episode_title: episode.title,
      story_title: storyData?.title || callReportData?.working_title,
      genre: storyData?.genre || callReportData?.genre,
      writer: storyData?.writer_originator_name || callReportData?.writer_name,
      attachment_url: signedAttachmentUrl || episode.attachment_url,
      attachment_name: episode.attachment_name,
      additional_info: episode.additional_info,
    };
  } else if (contentType === "one_liner") {
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
      .eq("id", contentId)
      .single();

    if (oneLinerError || !oneLiner) {
      return null;
    }

    const attachments = await getAttachmentsForEntity(adminSupabase, "one_liner", contentId);

    return {
      type: "one_liner",
      content_id: oneLiner.id,
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
      attachments: attachments,
    };
  } else if (contentType === "call_report") {
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
      .eq("id", contentId)
      .single();

    if (callReportError || !callReport) {
      logger.error("Error fetching call report:", callReportError);
      return null;
    }

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
      .eq("call_report_id", contentId)
      .order("display_order", { ascending: true });

    const writers = writersData?.map((w: any) => ({
      name: w.writer?.name,
      email: w.writer?.email,
      phone: w.writer?.phone,
      display_order: w.display_order
    })) || [];

    const attachments = await getAttachmentsForEntity(adminSupabase, "call_report", contentId);

    return {
      type: "call_report",
      content_id: callReport.id,
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
      attachments: attachments,
    };
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

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

    // Fetch all content items from external_link_contents junction table
    const { data: linkContents, error: linkContentsError } = await adminSupabase
      .from("external_link_contents")
      .select("content_type, content_id, display_order, is_required")
      .eq("link_id", link.id)
      .order("display_order", { ascending: true });

    if (linkContentsError) {
      logger.error("Error fetching link contents:", linkContentsError);
      return NextResponse.json(
        { error: "Failed to fetch content items" },
        { status: 500 }
      );
    }

    // If no contents in junction table, fall back to old single-content approach
    // (for backwards compatibility with existing links)
    if (!linkContents || linkContents.length === 0) {
      const content = await fetchContentByType(adminSupabase, link.content_type, link.content_id);

      if (!content) {
        return NextResponse.json(
          { error: "Content not found" },
          { status: 404 }
        );
      }

      // Sanitized response - do not expose internal UUIDs or email restrictions
      return NextResponse.json({
        valid: true,
        link: {
          content_type: link.content_type,
          expires_at: link.expires_at,
        },
        content,
      });
    }

    // Fetch all content items in parallel
    const contentPromises = linkContents.map(async (linkContent: any) => {
      const content = await fetchContentByType(
        adminSupabase,
        linkContent.content_type,
        linkContent.content_id
      );
      return content;
    });

    const contents = await Promise.all(contentPromises);

    // Filter out any null results (failed fetches)
    const validContents = contents.filter(Boolean);

    if (validContents.length === 0) {
      return NextResponse.json(
        { error: "No valid content found" },
        { status: 404 }
      );
    }

    // Sanitized response - do not expose internal UUIDs or email restrictions
    return NextResponse.json({
      valid: true,
      link: {
        content_type: link.content_type,
        expires_at: link.expires_at,
      },
      contents: validContents,
    });
  } catch (error) {
    logger.error(`Error in validate token API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
