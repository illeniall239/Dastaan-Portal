import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

const statusUpdateSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const validation = statusUpdateSchema.safeParse(body);

  if (!validation.success) {
    return withCors(request, NextResponse.json({ error: validation.error.format() }, { status: 400 }));
  }

  const { status } = validation.data;

  // There is no status field in auth.users, so we only update the public.users table

  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', id);

  if (error) {
    logger.error("Error updating user status", { error, context: "PATCH /api/admin/users/[id]/status" });
    return withCors(request, NextResponse.json({ error: "Failed to update user status" }, { status: 500 }));
  }

  return addRateLimitHeaders(withCors(request, NextResponse.json({ message: "User status updated successfully" })), rate.result);
}
