import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    // Fetch episode from database
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id, attachment_url, attachment_name")
      .eq("id", id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: "Episode not found" },
        { status: 404 }
      );
    }

    if (!episode.attachment_url) {
      return NextResponse.json(
        { error: "No file attached to this episode" },
        { status: 404 }
      );
    }

    // Extract file path from stored value
    // Handles multiple formats:
    // 1. Full URL: https://xxx.supabase.co/storage/v1/object/public/episodes/sourceId/filename.pdf
    // 2. File path only: sourceId/filename.pdf
    let filePath: string;
    const storedValue = episode.attachment_url;

    if (storedValue.startsWith("http")) {
      // Full URL - extract path after bucket name
      try {
        const url = new URL(storedValue);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.indexOf("episodes");

        if (bucketIndex === -1) {
          // Try alternate patterns: /object/public/episodes/ or /object/sign/episodes/
          const publicIndex = pathParts.findIndex((p, i) =>
            p === "public" || p === "sign" && pathParts[i + 1] === "episodes"
          );

          if (publicIndex !== -1 && pathParts[publicIndex + 1] === "episodes") {
            filePath = pathParts.slice(publicIndex + 2).join("/");
          } else {
            return NextResponse.json(
              { error: "Invalid file path format" },
              { status: 400 }
            );
          }
        } else {
          filePath = pathParts.slice(bucketIndex + 1).join("/");
        }
      } catch (urlError) {
        logger.error("Error parsing URL:", urlError);
        return NextResponse.json(
          { error: "Invalid file URL" },
          { status: 400 }
        );
      }
    } else {
      // Already a file path - use as-is
      filePath = storedValue;
    }

    // Validate file path isn't empty
    if (!filePath || filePath.trim() === "") {
      return NextResponse.json(
        { error: "Empty file path" },
        { status: 400 }
      );
    }

    // Generate signed URL (expires in 1 hour = 3600 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("episodes")
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
