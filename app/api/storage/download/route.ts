import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get("url");
    const bucket = request.nextUrl.searchParams.get("bucket");

    if (!url || !bucket) {
      return NextResponse.json({ error: "Missing url or bucket parameter" }, { status: 400 });
    }

    // Extract file path from stored URL
    let filePath: string;

    if (url.startsWith("http")) {
      try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split("/");
        const bucketIndex = pathParts.indexOf(bucket);

        if (bucketIndex !== -1) {
          filePath = pathParts.slice(bucketIndex + 1).join("/");
        } else {
          // Try alternate pattern: /object/public/<bucket>/
          const publicIndex = pathParts.findIndex(
            (p, i) => (p === "public" || p === "sign") && pathParts[i + 1] === bucket
          );
          if (publicIndex !== -1) {
            filePath = pathParts.slice(publicIndex + 2).join("/");
          } else {
            return NextResponse.json({ error: "Invalid file path format" }, { status: 400 });
          }
        }
      } catch {
        return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
      }
    } else {
      filePath = url;
    }

    if (!filePath || filePath.trim() === "") {
      return NextResponse.json({ error: "Empty file path" }, { status: 400 });
    }

    // Decode URI components in file path
    filePath = decodeURIComponent(filePath);

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
