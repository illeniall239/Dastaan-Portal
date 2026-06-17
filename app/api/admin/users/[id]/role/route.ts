import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAdminAction, getRequestContext } from "@/lib/audit/server";
import { requireApiAuth } from "@/lib/api/auth";

const roleUpdateSchema = z.object({
  role: z.enum([
    "content_creator",
    "content_manager",
    "gcm",
    "evaluator",
    "programmer",
    "executive",
    "legal",
    "finance",
    "management",
    "admin",
  ]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const auth = await requireApiAuth(["admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  const rate = await applyRateLimit(request, RateLimitPresets.strict, user.id);
  if (!rate.success) return rate.response!;

  const body = await request.json();
  const validation = roleUpdateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.format() }, { status: 400 });
  }

  const { role } = validation.data;

  // Use admin client for privileged operations (bypasses RLS)
  const adminClient = createAdminClient();

  // Get previous role for audit trail and potential rollback
  const { data: previousUserData } = await adminClient
    .from('users')
    .select('role')
    .eq('id', id)
    .single();

  const previousRole = previousUserData?.role;

  // Step 1: Update auth.users metadata
  const { data: updatedUser, error } = await adminClient.auth.admin.updateUserById(id, {
    user_metadata: { role },
  });

  if (error) {
    logger.error("Error updating user role in auth", { error, context: "PATCH /api/admin/users/[id]/role" });
    return withCors(request, NextResponse.json({ error: "Failed to update user role" }, { status: 500 }));
  }

  // Step 2: Update public.users table
  const { error: publicUserError } = await adminClient
    .from('users')
    .update({ role })
    .eq('id', id);

  if (publicUserError) {
    // Rollback step 1: revert auth.users metadata to previous role
    logger.error("Error updating public user role, rolling back auth change", {
      error: publicUserError,
      context: "PATCH /api/admin/users/[id]/role",
    });

    if (previousRole) {
      await adminClient.auth.admin.updateUserById(id, {
        user_metadata: { role: previousRole },
      });
    }

    return withCors(request, NextResponse.json({ error: "Failed to update user role" }, { status: 500 }));
  }

  // Log admin action for audit trail (only after both operations succeed)
  const requestContext = getRequestContext(request);
  await logAdminAction({
    entityType: "user",
    entityId: id,
    action: "role_changed",
    performedBy: user.id,
    details: {
      ...requestContext,
      previousValues: { role: previousRole },
      newValues: { role },
    },
  });

  return addRateLimitHeaders(withCors(request, NextResponse.json(updatedUser)), rate.result);
}
