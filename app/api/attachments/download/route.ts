import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Path-based download (public access for external evaluators)
    // Validate path is within allowed folders for security
    // Both singular (call_report/) and plural (call_reports/) forms are checked
    // because the upload route stores paths as `${entityType}/...` (singular).
    if (filePath.startsWith("call_reports/") ||
        filePath.startsWith("call_report/") ||
        filePath.startsWith("one_liners/") ||
        filePath.startsWith("one_liner/") ||
        filePath.startsWith("episodes/") ||
        filePath.startsWith("episode/")) {

      // Validate path segments - reject traversal attempts
      const segments = filePath.split('/');
      if (segments.some(seg => seg === '..' || seg === '.' || seg === '')) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
      }
      if (segments.length < 2 || segments.length > 4) {
        return NextResponse.json({ error: "Invalid file path structure" }, { status: 400 });
      }

      // Use admin client for public access
      const adminSupabase = createAdminClient();

      // Generate signed URL (1 hour expiry)
      const { data: signedUrlData, error: signedUrlError } = await adminSupabase.storage
        .from("attachments")
        .createSignedUrl(filePath, 3600);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        logger.error("Error creating signed URL:", signedUrlError);
        return NextResponse.json(
          { error: "Failed to generate download URL" },
          { status: 500 }
        );
      }

      // Redirect to signed URL
      return NextResponse.redirect(signedUrlData.signedUrl);
    }

    // For other paths, require authentication
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Generate signed URL (expires in 1 hour = 3600 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("attachments")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.error("Error creating signed URL:", signedUrlError);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    logger.error("Download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
