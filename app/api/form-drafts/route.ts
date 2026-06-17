import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import {
  unauthorizedError,
  handleDatabaseError,
  internalError,
} from "@/lib/api/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/form-drafts?form_type=call_report&entity_id=_new
 * Fetch a draft for the current user
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
  if (!rate.success) return rate.response!;

  const { searchParams } = request.nextUrl;
  const formType = searchParams.get("form_type");
  const entityId = searchParams.get("entity_id") || "_new";

  if (!formType) {
    return NextResponse.json({ error: "form_type is required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("form_drafts")
      .select("*")
      .eq("user_id", user.id)
      .eq("form_type", formType)
      .eq("entity_id", entityId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error(`Error fetching form draft: ${error.message}`);
      return handleDatabaseError(error, "fetching form draft");
    }

    return addRateLimitHeaders(
      withCors(request, NextResponse.json({ draft: data || null })),
      rate.result
    );
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, internalError());
  }
}

/**
 * POST /api/form-drafts
 * Save or update a draft (upsert)
 * Body: { form_type, entity_id?, draft_data }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  try {
    const body = await request.json();
    const { form_type, entity_id = "_new", draft_data } = body;

    if (!form_type || !draft_data) {
      return NextResponse.json(
        { error: "form_type and draft_data are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("form_drafts")
      .upsert(
        {
          user_id: user.id,
          form_type,
          entity_id,
          draft_data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,form_type,entity_id" }
      )
      .select("id, updated_at")
      .single();

    if (error) {
      logger.error(`Error saving form draft: ${error.message}`);
      return handleDatabaseError(error, "saving form draft");
    }

    return addRateLimitHeaders(
      withCors(
        request,
        NextResponse.json({ message: "Draft saved", draft: data })
      ),
      rate.result
    );
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, internalError());
  }
}

/**
 * DELETE /api/form-drafts?form_type=call_report&entity_id=_new
 * Remove a draft after successful submission
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorizedError();

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  const { searchParams } = request.nextUrl;
  const formType = searchParams.get("form_type");
  const entityId = searchParams.get("entity_id") || "_new";

  if (!formType) {
    return NextResponse.json({ error: "form_type is required" }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("form_drafts")
      .delete()
      .eq("user_id", user.id)
      .eq("form_type", formType)
      .eq("entity_id", entityId);

    if (error) {
      logger.error(`Error deleting form draft: ${error.message}`);
      return handleDatabaseError(error, "deleting form draft");
    }

    return addRateLimitHeaders(
      withCors(
        request,
        NextResponse.json({ message: "Draft deleted" })
      ),
      rate.result
    );
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, internalError());
  }
}
