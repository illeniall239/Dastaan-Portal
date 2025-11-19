import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// PATCH /api/writers/[id] - Update a writer
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id } = params;

    const { name, email, phone, status } = body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (status !== undefined) updateData.status = status;

    // Validate at least one field is being updated
    if (Object.keys(updateData).length === 0) {
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
    if (name) {
      const { data: duplicate } = await supabase
        .from("writers")
        .select("id")
        .eq("name", name.trim())
        .neq("id", id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: "A writer with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update writer
    const { data: updatedWriter, error } = await supabase
      .from("writers")
      .update(updateData)
      .eq("id", id)
      .select("id, name, email, phone, status, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error updating writer:", error);
      return NextResponse.json(
        { error: "Failed to update writer" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedWriter);
  } catch (error) {
    console.error("Error in PATCH /api/writers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/writers/[id] - Soft delete a writer (set status to inactive)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

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
      console.error("Error deleting writer:", error);
      return NextResponse.json(
        { error: "Failed to delete writer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/writers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
