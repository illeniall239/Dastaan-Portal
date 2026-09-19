import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { validateDownloadAccess } from '@/lib/download-validation';

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    const externalToken = searchParams.get("token");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Try to get authenticated user (may be null for external evaluators)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Validate access: must be authenticated or have external token
    const access = validateDownloadAccess({
      userId: user?.id ?? null,
      externalToken,
      filePath,
    });

    if (!access.allowed) {
      const status = access.reason === 'unauthorized' ? 401 : 400;
      return NextResponse.json(
        { error: access.reason === 'unauthorized' ? 'Unauthorized' : 'Invalid file path' },
        { status }
      );
    }

    // If external token provided, validate it exists and is active
    if (!user && externalToken) {
      const adminSupabase = createAdminClient();
      const { data: link } = await adminSupabase
        .from("external_evaluation_links")
        .select("id, is_active")
        .eq("token", externalToken)
        .eq("is_active", true)
        .single();

      if (!link) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Use admin client for signed URL generation (storage RLS doesn't support fine-grained path access)
    const adminSupabase = createAdminClient();
    const { data: signedUrlData, error: signedUrlError } = await adminSupabase.storage
      .from("attachments")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.error("Error creating signed URL:", { error: signedUrlError, filePath, bucket: "attachments" });
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    logger.error("Download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
