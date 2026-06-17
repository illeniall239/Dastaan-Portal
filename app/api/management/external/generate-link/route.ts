import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export const dynamic = "force-dynamic";

interface GenerateLinkRequest {
  content_type: "one_liner" | "episode" | "call_report";
  content_id: string | null; // Allow null for episode-only links
  episode_ids?: string[]; // Array of episode UUIDs to include
  expires_in_days?: number;
  max_submissions?: number | null;
  allowed_emails?: string[];
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.veryStrict, user.id);
    if (!rate.success) return rate.response!;

    // Check if user is management (admin, management, or executive)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || !userData || !["admin", "management", "executive", "evaluator"].includes(userData.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only management and evaluators can generate external evaluation links" },
        { status: 403 }
      );
    }

    // Parse request body
    const body: GenerateLinkRequest = await request.json();

    // Validate: Must have either content_id OR episode_ids
    if (!body.content_id && (!body.episode_ids || body.episode_ids.length === 0)) {
      return NextResponse.json(
        { error: "Either content_id or episode_ids must be provided" },
        { status: 400 }
      );
    }

    if (!body.content_type) {
      return NextResponse.json(
        { error: "content_type is required" },
        { status: 400 }
      );
    }

    if (!["one_liner", "episode", "call_report"].includes(body.content_type)) {
      return NextResponse.json(
        { error: "content_type must be 'one_liner', 'episode', or 'call_report'" },
        { status: 400 }
      );
    }

    // Verify content exists only if content_id is provided
    if (body.content_id) {
      if (body.content_type === "episode") {
        const { data: episode, error: episodeError } = await adminSupabase
          .from("episodes")
          .select("id")
          .eq("id", body.content_id)
          .single();

        if (episodeError || !episode) {
          return NextResponse.json(
            { error: "Episode not found" },
            { status: 404 }
          );
        }
      } else if (body.content_type === "one_liner") {
        const { data: oneLiner, error: oneLinerError } = await adminSupabase
          .from("one_liners")
          .select("id")
          .eq("id", body.content_id)
          .single();

        if (oneLinerError || !oneLiner) {
          return NextResponse.json(
            { error: "One-liner not found" },
            { status: 404 }
          );
        }
      } else if (body.content_type === "call_report") {
        const { data: callReport, error: callReportError } = await adminSupabase
          .from("call_reports")
          .select("id")
          .eq("id", body.content_id)
          .single();

        if (callReportError || !callReport) {
          return NextResponse.json(
            { error: "Call report not found" },
            { status: 404 }
          );
        }
      }
    }

    // If episode-only link, verify episodes exist
    if (!body.content_id && body.episode_ids && body.episode_ids.length > 0) {
      const { data: episodes, error: episodesError } = await adminSupabase
        .from("episodes")
        .select("id")
        .in("id", body.episode_ids);

      if (episodesError || !episodes || episodes.length !== body.episode_ids.length) {
        return NextResponse.json(
          { error: "Some episodes not found" },
          { status: 400 }
        );
      }
    }

    // Generate cryptographically secure token (64 characters)
    const token = randomBytes(32).toString("hex");

    // Calculate expiration date
    const expiresInDays = body.expires_in_days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // For episode-only links, use first episode as placeholder for backwards compatibility
    const linkContentType = body.content_type;
    const linkContentId = body.content_id || (body.episode_ids && body.episode_ids.length > 0 ? body.episode_ids[0] : null);

    // Create external evaluation link
    const { data: link, error: linkError } = await supabase
      .from("external_evaluation_links")
      .insert({
        token,
        content_type: linkContentType,
        content_id: linkContentId,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        max_submissions: body.max_submissions ?? null,
        current_submissions: 0,
        is_active: true,
        allowed_emails: body.allowed_emails ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (linkError) {
      logger.error("Error creating external evaluation link:", { error: linkError, context: "POST /api/management/external/generate-link" });
      return NextResponse.json(
        { error: "Failed to create external evaluation link" },
        { status: 500 }
      );
    }

    // Insert content items into external_link_contents junction table
    const contentItems = [];

    // Add primary content if provided (call_report or single episode/one_liner)
    if (body.content_id) {
      contentItems.push({
        link_id: link.id,
        content_type: body.content_type,
        content_id: body.content_id,
        display_order: 0,
        is_required: true,
      });
    }

    // Add additional episodes if provided
    if (body.episode_ids && body.episode_ids.length > 0) {
      // If call_report is included, verify episodes belong to it
      if (body.content_type === "call_report" && body.content_id) {
        const { data: episodes, error: episodesError } = await adminSupabase
          .from("episodes")
          .select("id")
          .eq("call_report_id", body.content_id)
          .in("id", body.episode_ids);

        if (episodesError || !episodes || episodes.length !== body.episode_ids.length) {
          logger.error("Some episodes not found or not linked to this call_report");
          // Cleanup: delete the link we just created
          await supabase
            .from("external_evaluation_links")
            .delete()
            .eq("id", link.id);

          return NextResponse.json(
            { error: "Invalid episode selection: episodes must belong to the call report" },
            { status: 400 }
          );
        }
      }

      // Add episodes to content items
      const startOrder = contentItems.length; // 0 if episode-only, 1 if call_report included
      body.episode_ids.forEach((episodeId, index) => {
        contentItems.push({
          link_id: link.id,
          content_type: "episode",
          content_id: episodeId,
          display_order: startOrder + index,
          is_required: true,
        });
      });
    }

    // Validate: must have at least one content item
    if (contentItems.length === 0) {
      logger.error("No content items to include in link");
      // Cleanup
      await supabase
        .from("external_evaluation_links")
        .delete()
        .eq("id", link.id);

      return NextResponse.json(
        { error: "No content items to include in link" },
        { status: 400 }
      );
    }

    // Insert all content items
    const { error: contentsError } = await supabase
      .from("external_link_contents")
      .insert(contentItems);

    if (contentsError) {
      logger.error(`Error inserting link contents:`, contentsError);
      logger.error("Full contentsError details:", JSON.stringify(contentsError, null, 2));
      // Delete the link if content insertion fails (cleanup)
      await supabase
        .from("external_evaluation_links")
        .delete()
        .eq("id", link.id);

      return NextResponse.json(
        { error: "Failed to create link contents", details: contentsError.message || contentsError.hint || "Unknown error" },
        { status: 500 }
      );
    }

    // Generate shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareableUrl = `${baseUrl}/public/evaluate/${token}`;

    return NextResponse.json({
      message: "External evaluation link created successfully",
      link: {
        id: link.id,
        token: link.token,
        url: shareableUrl,
        content_type: link.content_type,
        content_id: link.content_id,
        expires_at: link.expires_at,
        max_submissions: link.max_submissions,
        is_active: link.is_active,
      },
    });
  } catch (error) {
    logger.error(`Error in generate-link API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
