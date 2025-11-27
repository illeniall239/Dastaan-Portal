import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
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

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const entityIdValidation = uuidSchema.safeParse(entityId);

    if (!entityIdValidation.success) {
      console.error("Invalid entity ID format:", entityId);
      return NextResponse.json(
        {
          error: "Invalid entity ID format",
          details: "Entity ID must be a valid UUID"
        },
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

    // Insert record into database
    const insertData = {
      entity_type: entityType,
      entity_id: entityId, // Already validated as UUID
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type || safeExtension || "application/octet-stream",
      uploaded_by: user.id,
    };

    console.log("Attempting database insert:", {
      entity_type: insertData.entity_type,
      entity_id: insertData.entity_id,
      file_name: insertData.file_name
    });

    const { data: attachmentData, error: insertError } = await supabase
      .from("attachments")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });

      // Clean up uploaded file
      await supabase.storage.from("attachments").remove([filePath]);

      return NextResponse.json(
        {
          error: "Failed to create attachment record",
          details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
        },
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
    console.error("==========================================");
    console.error("ATTACHMENT UPLOAD ERROR");
    console.error("==========================================");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // Try to get form data for debugging (may fail if already consumed)
    try {
      const debugFormData = await request.clone().formData();
      console.error("Entity Type:", debugFormData.get("entityType"));
      console.error("Entity ID:", debugFormData.get("entityId"));
      const debugFile = debugFormData.get("file");
      console.error("File name:", debugFile instanceof File ? debugFile.name : "N/A");
    } catch (formError) {
      console.error("Could not read form data for debugging (already consumed)");
    }

    console.error("==========================================");
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : String(error))
          : "Internal server error"
      },
      { status: 500 }
    );
  }
}

