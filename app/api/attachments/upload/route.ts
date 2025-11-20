import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Ensure user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clone the request to avoid "body already used" errors
    const formData = await request.formData();
    const file = formData.get("file");
    const entityType = formData.get("entityType");
    const entityId = formData.get("entityId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (
      typeof entityType !== "string" ||
      typeof entityId !== "string" ||
      !entityType ||
      !entityId
    ) {
      return NextResponse.json(
        { error: "Invalid entity information" },
        { status: 400 }
      );
    }

    const fileExtension = file.name.includes(".")
      ? file.name.split(".").pop()
      : "";
    const safeExtension = fileExtension ? `.${fileExtension}` : "";
    const filePath = `${entityType}/${entityId}/${uuidv4()}${safeExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("attachments")
      .getPublicUrl(filePath);

    const { data: attachmentData, error: insertError } = await supabase
      .from("attachments")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type || safeExtension || "application/octet-stream",
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Attachment insert error:", insertError);
      await supabase.storage.from("attachments").remove([filePath]);
      return NextResponse.json(
        { error: "Failed to create attachment record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attachment: {
        ...attachmentData,
        publicUrl: publicUrlData.publicUrl,
      },
    });
  } catch (error) {
    console.error("Unexpected error uploading attachment:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

