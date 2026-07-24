import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
    if (!rate.success) return rate.response!;

    const body = await request.json();
    const { action } = body;

    // ──────────────────────────────────────────────
    // Action A: Generate signed upload URL
    // ──────────────────────────────────────────────
    if (action === "presign") {
      const { entityType, entityId, fileName, fileType } = body;

      if (!entityType || !entityId || !fileName) {
        return NextResponse.json({
          error: "Missing required fields",
          message: "entityType, entityId, and fileName are required."
        }, { status: 400 });
      }

      const uuidSchema = z.string().uuid();
      if (!uuidSchema.safeParse(entityId).success) {
        return NextResponse.json({
          error: "Invalid entity ID",
          message: "The entity ID must be a valid UUID."
        }, { status: 400 });
      }

      const fileExtension = fileName.includes(".") ? fileName.split(".").pop() : "";
      const safeExtension = fileExtension ? `.${fileExtension}` : "";
      const filePath = `${entityType}/${entityId}/${uuidv4()}${safeExtension}`;

      const admin = createAdminClient();
      const { data, error } = await admin.storage
        .from("attachments")
        .createSignedUploadUrl(filePath);

      if (error) {
        logger.error("Failed to create signed upload URL:", error);
        return NextResponse.json({
          error: "Failed to generate upload URL",
          message: "Could not prepare the upload. Please try again."
        }, { status: 500 });
      }

      return NextResponse.json({
        signedUrl: data.signedUrl,
        path: filePath,
        token: data.token,
      });
    }

    // ──────────────────────────────────────────────
    // Action B: Register attachment after upload
    // ──────────────────────────────────────────────
    if (action === "register") {
      const { entityType, entityId, fileName, fileSize, fileType, filePath } = body;

      if (!entityType || !entityId || !fileName || !filePath) {
        return NextResponse.json({
          error: "Missing required fields",
          message: "entityType, entityId, fileName, and filePath are required."
        }, { status: 400 });
      }

      const uuidSchema = z.string().uuid();
      if (!uuidSchema.safeParse(entityId).success) {
        return NextResponse.json({
          error: "Invalid entity ID",
          message: "The entity ID must be a valid UUID."
        }, { status: 400 });
      }

      const insertData = {
        entity_type: entityType,
        entity_id: entityId,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize || 0,
        file_type: fileType || "application/octet-stream",
        uploaded_by: user.id,
      };

      const { data: attachmentData, error: insertError } = await supabase
        .from("attachments")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        logger.error("Database insert error:", insertError);

        let userMessage = "The file was uploaded but could not be linked to the record. ";
        if (insertError.code === "23503") {
          userMessage += "The record you're trying to attach the file to may no longer exist.";
        } else if (insertError.code === "23505") {
          userMessage += "This file may already be attached to this record.";
        } else {
          userMessage += "Please try again or contact support.";
        }

        return NextResponse.json({
          error: "Failed to save attachment",
          message: userMessage,
        }, { status: 500 });
      }

      return NextResponse.json({ attachment: attachmentData });
    }

    return NextResponse.json({
      error: "Invalid action",
      message: "The 'action' field must be 'presign' or 'register'."
    }, { status: 400 });

  } catch (error) {
    logger.error("Attachment upload error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: "Upload failed",
      message: "An unexpected error occurred. Please try again.",
    }, { status: 500 });
  }
}
