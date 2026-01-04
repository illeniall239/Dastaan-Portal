import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAdminAction, getRequestContext } from "@/lib/audit/server";

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
    // Get user data before deletion for audit trail
    const { data: deletedUserData } = await supabase
      .from("users")
      .select("email, name, role, department, position")
      .eq("id", id)
      .single();

    // Use admin client for privileged operations
    const adminClient = createAdminClient();

    // Delete from auth.users table first (this will cascade to public.users)
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      logger.error("Error deleting from auth.users", { error: authError, context: "DELETE /api/admin/users/[id]" });
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
      logger.error("Error deleting from public.users", { error: publicError, context: "DELETE /api/admin/users/[id]" });
      // Don't return error here, user is already deleted from auth
    }

    // Log admin action for audit trail
    const requestContext = getRequestContext(request);
    await logAdminAction({
      entityType: "user",
      entityId: id,
      action: "deleted",
      performedBy: user.id,
      details: {
        ...requestContext,
        previousValues: deletedUserData || {},
      },
    });

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "User deleted successfully",
    })), rate.result);
  } catch (error) {
    logger.error("Unexpected error deleting user", { error, context: "DELETE /api/admin/users/[id]" });
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
    // Get previous user data for audit trail
    const { data: previousUserData } = await supabase
      .from("users")
      .select("email, name, position, department")
      .eq("id", id)
      .single();

    // Use admin client for privileged operations
    const adminClient = createAdminClient();

    // Update email in auth.users if provided
    if (updates.email) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
        email: updates.email,
      });

      if (authError) {
        logger.error("Error updating auth.users email", { error: authError, context: "PATCH /api/admin/users/[id]" });
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
        logger.error("Error updating user metadata", { error: metaError, context: "PATCH /api/admin/users/[id]" });
      }
    }

    // Update public.users table
    const publicUpdates: Record<string, string> = {};
    if (updates.name) publicUpdates.name = updates.name;
    if (updates.email) publicUpdates.email = updates.email;
    if (updates.position) publicUpdates.position = updates.position;
    if (updates.department) publicUpdates.department = updates.department;

    // Use admin client to bypass RLS policies
    const adminSupabase = createAdminClient();
    const { data: updatedUser, error: publicError } = await adminSupabase
      .from("users")
      .update(publicUpdates)
      .eq("id", id)
      .select()
      .single();

    if (publicError) {
      logger.error("Error updating public.users", { error: publicError, context: "PATCH /api/admin/users/[id]" });
      return NextResponse.json(
        { error: "Failed to update user in public table" },
        { status: 500 }
      );
    }

    // Log admin action for audit trail
    const requestContext = getRequestContext(request);
    await logAdminAction({
      entityType: "user",
      entityId: id,
      action: "updated",
      performedBy: user.id,
      details: {
        ...requestContext,
        previousValues: previousUserData || {},
        newValues: updates,
      },
    });

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    })), rate.result);
  } catch (error) {
    logger.error("Unexpected error updating user", { error, context: "PATCH /api/admin/users/[id]" });
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}
