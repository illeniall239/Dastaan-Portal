import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

const roleUpdateSchema = z.object({
  role: z.enum([
    "content_creator",
    "content_manager",
    "evaluator",
    "executive",
    "legal",
    "finance",
    "management",
    "admin",
  ]),
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
  const validation = roleUpdateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.format() }, { status: 400 });
  }

  const { role } = validation.data;

  const { data: updatedUser, error } = await supabase.auth.admin.updateUserById(id, {
    user_metadata: { role },
  });

  if (error) {
    return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }));
  }

  // Also update the public.users table
  const { error: publicUserError } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id);

  if (publicUserError) {
    // If this fails, we should ideally roll back the auth user update
    // For now, we'll just log the error
    console.error("Error updating public user role:", publicUserError);
    return withCors(request, NextResponse.json({ error: "Failed to update user role in public table" }, { status: 500 }));
  }

  return addRateLimitHeaders(withCors(request, NextResponse.json(updatedUser)), rate.result);
}
