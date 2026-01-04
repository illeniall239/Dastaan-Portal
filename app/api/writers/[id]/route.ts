import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { updateWriterSchema } from "@/lib/validations/writers";
import { idParamSchema } from "@/lib/validations/uuid-params";

// PATCH /api/writers/[id] - Update a writer
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Validate UUID format
    const paramValidation = idParamSchema.safeParse({ id });
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: "Invalid ID format", details: paramValidation.error.issues },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = updateWriterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Validate at least one field is being updated
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Check if writer exists
    const { data: existingWriter } = await supabase
      .from("writers")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingWriter) {
      return NextResponse.json(
        { error: "Writer not found" },
        { status: 404 }
      );
    }

    // If updating name, check for duplicates
    if (validatedData.name) {
      const { data: duplicate } = await supabase
        .from("writers")
        .select("id")
        .eq("name", validatedData.name)
        .neq("id", id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: "A writer with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Prepare update data (convert empty strings to null for optional fields)
    const updateData: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      status?: 'active' | 'inactive';
    } = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.email !== undefined) updateData.email = validatedData.email || null;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone || null;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    // Update writer
    const { data: updatedWriter, error } = await supabase
      .from("writers")
      .update(updateData)
      .eq("id", id)
      .select("id, name, email, phone, status, created_at, updated_at")
      .single();

    if (error) {
      logger.error("Error updating writer:", error);
      return NextResponse.json(
        { error: "Failed to update writer" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedWriter);
  } catch (error) {
    logger.error("Error in PATCH /api/writers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/writers/[id] - Soft delete a writer (set status to inactive)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check if writer exists
    const { data: existingWriter } = await supabase
      .from("writers")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingWriter) {
      return NextResponse.json(
        { error: "Writer not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting status to inactive
    const { error } = await supabase
      .from("writers")
      .update({ status: "inactive" })
      .eq("id", id);

    if (error) {
      logger.error("Error deleting writer:", error);
      return NextResponse.json(
        { error: "Failed to delete writer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Error in DELETE /api/writers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
