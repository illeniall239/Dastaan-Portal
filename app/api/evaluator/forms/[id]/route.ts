import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { revalidatePath } from 'next/cache';
import { updateEvaluationSchema } from "@/lib/validations/evaluations";
import { idParamSchema } from "@/lib/validations/uuid-params";

/**
 * PATCH /api/evaluator/forms/[id]
 * Update a one-liner evaluation (evaluator_forms) by owner or admin
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit edits strictly
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.issues },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Ensure record exists and check ownership
  const { data: existing, error: fetchError } = await supabase
    .from("evaluator_forms")
    .select("evaluator_id")
    .eq("id", id)
    .single();
  if (fetchError) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  const canEdit = existing.evaluator_id === user.id || userData.role === "admin";
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();

  // Validate request body
  const validation = updateEvaluationSchema.safeParse(payload);

  if (!validation.success) {
    return withCors(request, NextResponse.json(
      { error: "Invalid request", details: validation.error.issues },
      { status: 400 }
    ));
  }

  const validatedData = validation.data;

  // Add updated_at timestamp
  const updatePayload = {
    ...validatedData,
    updated_at: new Date().toISOString(),
  };

  const { data, error: updateError } = await supabase
    .from("evaluator_forms")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    logger.error("Error updating evaluation", { error: updateError, context: "PATCH /api/evaluator/forms/[id]" });
    return withCors(request, NextResponse.json(
      { error: "Failed to update evaluation" },
      { status: 500 }
    ));
  }

  // Revalidate evaluation list pages to show updated evaluation immediately
  revalidatePath('/content-department/evaluations-list');
  revalidatePath('/evaluator/evaluations-list');
  revalidatePath('/evaluator/my-evaluations');

  return addRateLimitHeaders(withCors(request, NextResponse.json({ evaluation: data })), rate.result);
}


