import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { updateEpisodicEvaluationSchema } from "@/lib/validations/episodic-evaluations";
import { revalidatePath } from 'next/cache';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

/**
 * GET /api/episodic-evaluations/[id]
 * Get a single episodic evaluation by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
  if (!rate.success) return rate.response!;

  try {
    const { data: evaluation, error } = await supabase
      .from("episodic_evaluations")
      .select(`
        *,
        evaluator:users!evaluator_id(name, email, role),
        episode:episodes(
          *,
          call_report:call_reports(working_title, writer_name),
          story:stories(title, status)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episodic evaluation not found" },
          { status: 404 }
        );
      }
      logger.error("Error fetching episodic evaluation", { error, context: "GET /api/episodic-evaluations/[id]" });
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluation" },
        { status: 500 }
      );
    }

    // Check if user has permission to view this evaluation
    // Evaluators can only view their own, managers and admins can view all
    const { data: userData, error: userQueryError } = await createAdminClient()
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userQueryError) {
      logger.error("User role query failed", { error: userQueryError, userId: user.id, context: "GET /api/episodic-evaluations/[id]" });
      return NextResponse.json({ error: "Failed to verify user permissions", details: userQueryError.message }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let canView = false;
    if (["admin", "content_manager", "management", "executive"].includes(userData.role)) {
      canView = true;
    } else if (userData.role === "evaluator") {
      // Evaluators can only view their own evaluations
      canView = evaluation.evaluator_id === user.id;
    } else if (userData.role === "programmer") {
      // Programmers can view any evaluation done by the programming team
      canView = evaluation.evaluator?.role === "programmer";
    }

    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to view this evaluation" },
        { status: 403 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({ evaluation })), rate.result);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * DELETE /api/episodic-evaluations/[id]
 * Delete an episodic evaluation (only if evaluator owns it or admin)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.strict, user.id);
  if (!rate.success) return rate.response!;

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // Check if evaluation exists and get owner
    const { data: evaluation, error: fetchError } = await supabase
      .from("episodic_evaluations")
      .select("evaluator_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episodic evaluation not found" },
          { status: 404 }
        );
      }
      logger.error("Error fetching episodic evaluation for deletion", { error: fetchError, context: "DELETE /api/episodic-evaluations/[id]" });
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluation" },
        { status: 500 }
      );
    }

    // Check permissions: owner or admin
    const canDelete =
      evaluation.evaluator_id === user.id || userData.role === "admin";

    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to delete this evaluation" },
        { status: 403 }
      );
    }

    // Delete the evaluation
    const { error: deleteError } = await supabase
      .from("episodic_evaluations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("Error deleting episodic evaluation", { error: deleteError, context: "DELETE /api/episodic-evaluations/[id]" });
      return NextResponse.json(
        { error: "Failed to delete episodic evaluation" },
        { status: 500 }
      );
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "episodic_evaluation",
      entityId: id,
      action: "deleted",
      performedBy: user.id,
      details: { ...requestContext },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    // Revalidate evaluation list pages to show deleted evaluation removed immediately
    revalidatePath('/content-department/episodic-evaluations');
    revalidatePath('/evaluator/episodic-evaluations');

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "Episodic evaluation deleted successfully",
    })), rate.result);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * PATCH /api/episodic-evaluations/[id]
 * Update an episodic evaluation (only if evaluator owns it or admin)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.strict, user.id);
  if (!rate.success) return rate.response!;

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // Ensure evaluation exists and get owner
    const { data: existing, error: fetchError } = await supabase
      .from("episodic_evaluations")
      .select("evaluator_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episodic evaluation not found" },
          { status: 404 }
        );
      }
      logger.error("Error fetching episodic evaluation for update", { error: fetchError, context: "PATCH /api/episodic-evaluations/[id]" });
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluation" },
        { status: 500 }
      );
    }

    // Owner, admin, or any programmer (programming team shares evaluations)
    const canEdit = existing.evaluator_id === user.id || userData.role === "admin" || userData.role === "programmer";
    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to edit this evaluation" },
        { status: 403 }
      );
    }

    const payload = await request.json();

    // Validate request body with Zod schema
    const bodyValidation = updateEpisodicEvaluationSchema.safeParse(payload);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: bodyValidation.error.format() },
        { status: 400 }
      );
    }

    // Use validated data
    const updatable = {
      ...bodyValidation.data,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    const { error: updateError, data: updated } = await supabase
      .from("episodic_evaluations")
      .update(updatable)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      logger.error("Error updating episodic evaluation", { error: updateError, context: "PATCH /api/episodic-evaluations/[id]" });
      return NextResponse.json(
        { error: "Failed to update episodic evaluation" },
        { status: 500 }
      );
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "episodic_evaluation",
      entityId: id,
      action: "updated",
      performedBy: user.id,
      details: { ...requestContext, newValues: bodyValidation.data },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    // Revalidate evaluation list pages to show updated evaluation immediately
    revalidatePath('/content-department/episodic-evaluations');
    revalidatePath('/evaluator/episodic-evaluations');

    return addRateLimitHeaders(withCors(request, NextResponse.json({ evaluation: updated })), rate.result);
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}