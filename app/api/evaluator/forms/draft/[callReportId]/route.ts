import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  handleDatabaseError,
  internalError,
} from "@/lib/api/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const { callReportId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorizedError();
  }

  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
  if (!rate.success) return rate.response!;

  try {
    // Fetch draft evaluation data
    const { data, error } = await supabase
      .from("evaluator_form_drafts")
      .select("*")
      .eq("call_report_id", callReportId)
      .eq("evaluator_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      logger.error(`Error fetching draft evaluation: ${error instanceof Error ? error.message : String(error)}`);
      return handleDatabaseError(error, "fetching draft evaluation");
    }

    if (!data) {
      // No draft found
      return NextResponse.json({ draft: null });
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({ draft: data })), rate.result);
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, internalError());
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const { callReportId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorizedError();
  }

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  // Check user role
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData || !["evaluator", "programmer", "management", "admin"].includes(userData.role)) {
    return forbiddenError("Only evaluators can save draft evaluations");
  }

  try {
    const draftData = await request.json();

    // Check if call report exists
    const { data: callReport, error: callReportError } = await supabase
      .from("call_reports")
      .select("id")
      .eq("id", callReportId)
      .single();

    if (callReportError || !callReport) {
      return notFoundError("Call report");
    }

    // Insert or update draft evaluation
    const { data: draft, error: insertError } = await supabase
      .from("evaluator_form_drafts")
      .upsert({
        call_report_id: callReportId,
        evaluator_id: user.id,
        draft_data: draftData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'call_report_id,evaluator_id'
      })
      .select("*")
      .single();

    if (insertError) {
      logger.error(`Error saving draft evaluation:: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
      return handleDatabaseError(insertError, "saving draft evaluation");
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json(
      {
        message: "Draft evaluation saved successfully",
        draft,
      },
      { status: 200 }
    )), rate.result);
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, internalError());
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const { callReportId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorizedError();
  }

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  try {
    // Check if draft exists and get owner
    const { data: draft, error: fetchError } = await supabase
      .from("evaluator_form_drafts")
      .select("evaluator_id")
      .eq("call_report_id", callReportId)
      .eq("evaluator_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") { // No rows found
        return NextResponse.json(
          { message: "No draft found for this call report" },
          { status: 200 }
        );
      }
      logger.error(`Error fetching draft evaluation:: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      return handleDatabaseError(fetchError, "fetching draft evaluation");
    }

    // Delete the draft
    const { error: deleteError } = await supabase
      .from("evaluator_form_drafts")
      .delete()
      .eq("call_report_id", callReportId)
      .eq("evaluator_id", user.id);

    if (deleteError) {
      logger.error(`Error deleting draft evaluation:: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
      return handleDatabaseError(deleteError, "deleting draft evaluation");
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "Draft evaluation deleted successfully",
    })), rate.result);
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, internalError());
  }
}
