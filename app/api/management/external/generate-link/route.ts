import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

interface GenerateLinkRequest {
  content_type: "one_liner" | "episode" | "call_report";
  content_id: string;
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

    // Validate required fields
    if (!body.content_type || !body.content_id) {
      return NextResponse.json(
        { error: "content_type and content_id are required" },
        { status: 400 }
      );
    }

    if (!["one_liner", "episode", "call_report"].includes(body.content_type)) {
      return NextResponse.json(
        { error: "content_type must be 'one_liner', 'episode', or 'call_report'" },
        { status: 400 }
      );
    }

    // Verify content exists (using admin client to bypass RLS for content verification)
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

    // Generate cryptographically secure token (64 characters)
    const token = randomBytes(32).toString("hex");

    // Calculate expiration date
    const expiresInDays = body.expires_in_days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create external evaluation link
    const { data: link, error: linkError } = await supabase
      .from("external_evaluation_links")
      .insert({
        token,
        content_type: body.content_type,
        content_id: body.content_id,
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
      logger.error(`Error creating external evaluation link:`, linkError);
      console.error("Full linkError details:", JSON.stringify(linkError, null, 2));
      return NextResponse.json(
        { error: "Failed to create external evaluation link", details: linkError.message || linkError.hint || "Unknown error" },
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
