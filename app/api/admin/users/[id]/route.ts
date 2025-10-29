import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

// Schema for updating user details
const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  position: z.string().min(2).max(100).optional(),
  department: z.string().optional(),
});

/**
 * DELETE /api/admin/users/[id]
 * Delete a user completely from the system
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;
  const { id } = await params;
  const supabase = await createClient();

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  // Prevent self-deletion
  if (user.id === id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    // Use admin client for privileged operations
    const adminClient = createAdminClient();

    // Delete from auth.users table first (this will cascade to public.users)
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Error deleting from auth.users:", authError);
      return NextResponse.json(
        { error: "Failed to delete user from auth system" },
        { status: 500 }
      );
    }

    // Also delete from public.users table in case cascade didn't work
    const { error: publicError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (publicError) {
      console.error("Error deleting from public.users:", publicError);
      // Don't return error here, user is already deleted from auth
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "User deleted successfully",
    })), rate.result);
  } catch (error) {
    console.error("Unexpected error deleting user:", error);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user details (name, email, position, department)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;
  const { id } = await params;
  const supabase = await createClient();

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const validation = updateUserSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.format() },
      { status: 400 }
    );
  }

  const updates = validation.data;

  try {
    // Use admin client for privileged operations
    const adminClient = createAdminClient();

    // Update email in auth.users if provided
    if (updates.email) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
        email: updates.email,
      });

      if (authError) {
        console.error("Error updating auth.users email:", authError);
        return NextResponse.json(
          { error: "Failed to update email in auth system" },
          { status: 500 }
        );
      }
    }

    // Update user metadata if name or position provided
    if (updates.name || updates.position || updates.department) {
      const metadataUpdates: Record<string, string> = {};
      if (updates.name) metadataUpdates.name = updates.name;
      if (updates.position) metadataUpdates.position = updates.position;
      if (updates.department) metadataUpdates.department = updates.department;

      const { error: metaError } = await adminClient.auth.admin.updateUserById(id, {
        user_metadata: metadataUpdates,
      });

      if (metaError) {
        console.error("Error updating user metadata:", metaError);
      }
    }

    // Update public.users table
    const publicUpdates: Record<string, string> = {};
    if (updates.name) publicUpdates.name = updates.name;
    if (updates.email) publicUpdates.email = updates.email;
    if (updates.position) publicUpdates.position = updates.position;
    if (updates.department) publicUpdates.department = updates.department;

    const { data: updatedUser, error: publicError } = await supabase
      .from("users")
      .update(publicUpdates)
      .eq("id", id)
      .select()
      .single();

    if (publicError) {
      console.error("Error updating public.users:", publicError);
      return NextResponse.json(
        { error: "Failed to update user in public table" },
        { status: 500 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    })), rate.result);
  } catch (error) {
    console.error("Unexpected error updating user:", error);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}
