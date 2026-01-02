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
      return NextResponse.json({
        error: "Authentication required",
        message: "You must be logged in to upload files. Please sign in and try again."
      }, { status: 401 });
    }

    // Clone the request to avoid "body already used" errors
    const formData = await request.formData();
    const file = formData.get("file");
    const entityType = formData.get("entityType");
    const entityId = formData.get("entityId");

    if (!(file instanceof File)) {
      return NextResponse.json({
        error: "No file provided",
        message: "Please select a file to upload. The 'file' field is required in the form data."
      }, { status: 400 });
    }

    if (
      typeof entityType !== "string" ||
      typeof entityId !== "string" ||
      !entityType ||
      !entityId
    ) {
      return NextResponse.json({
        error: "Missing required information",
        message: "Both 'entityType' and 'entityId' are required to attach the file to a record. Please ensure these fields are provided."
      }, { status: 400 });
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const entityIdValidation = uuidSchema.safeParse(entityId);

    if (!entityIdValidation.success) {
      console.error("Invalid entity ID format:", entityId);
      return NextResponse.json({
        error: "Invalid record identifier",
        message: "The entity ID must be a valid UUID format. Please check the ID and try again."
      }, { status: 400 });
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

      // Provide more specific error messages based on common issues
      let userMessage = "The file could not be uploaded to storage. ";
      if (uploadError.message?.includes("size")) {
        userMessage += "The file may be too large. Please try a smaller file.";
      } else if (uploadError.message?.includes("type") || uploadError.message?.includes("format")) {
        userMessage += "The file format may not be supported.";
      } else {
        userMessage += "Please try again or contact support if the problem persists.";
      }

      return NextResponse.json({
        error: "Upload failed",
        message: userMessage,
        details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
      }, { status: 500 });
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

      // Provide more specific error messages based on error codes
      let userMessage = "The file was uploaded but could not be linked to the record. ";
      if (insertError.code === "23503") {
        // Foreign key violation
        userMessage += "The record you're trying to attach the file to may no longer exist.";
      } else if (insertError.code === "23505") {
        // Unique violation
        userMessage += "This file may already be attached to this record.";
      } else {
        userMessage += "Please try again or contact support if the problem persists.";
      }

      return NextResponse.json({
        error: "Failed to save attachment",
        message: userMessage,
        details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
      }, { status: 500 });
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
    return NextResponse.json({
      error: "Upload failed",
      message: "An unexpected error occurred while uploading the file. Please try again or contact support if the problem persists.",
      details: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : String(error))
        : undefined
    }, { status: 500 });
  }
}

