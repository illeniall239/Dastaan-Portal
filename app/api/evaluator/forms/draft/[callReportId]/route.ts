import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

// Schema for validating draft data
// All scoring fields are optional since drafts can be partial
const draftDataSchema = z.object({
  targetWriter: z.string().optional(),
  perEpPriceRange: z.string().optional(),
  slot: z.string().optional(),
  premiseConflictScore: z.number().min(1).max(10).optional(),
  storylinePlotScore: z.number().min(1).max(10).optional(),
  episodicProgressionScore: z.number().min(1).max(10).optional(),
  charactersScore: z.number().min(1).max(10).optional(),
  dialoguesScore: z.number().min(1).max(10).optional(),
  first2EpsRequired: z.boolean().optional(),
  comments: z.string().optional(),
  decision: z.enum(["approve", "reject"]).optional(),
  decisionNotes: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;
  const { callReportId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      return NextResponse.json(
        { error: "Failed to fetch draft evaluation", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      // No draft found
      return NextResponse.json({ draft: null });
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({ draft: data })), rate.result);
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;
  const { callReportId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData || !["evaluator", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Only evaluators can save draft evaluations" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate draft data
    const validation = draftDataSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const draftData = validation.data;

    // Check if call report exists
    const { data: callReport, error: callReportError } = await supabase
      .from("call_reports")
      .select("id")
      .eq("id", callReportId)
      .single();

    if (callReportError || !callReport) {
      return NextResponse.json(
        { error: "Call report not found" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: "Failed to save draft evaluation", details: insertError.message },
        { status: 500 }
      );
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
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;
  const { callReportId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      return NextResponse.json(
        { error: "Failed to fetch draft evaluation", details: fetchError.message },
        { status: 500 }
      );
    }

    // Delete the draft
    const { error: deleteError } = await supabase
      .from("evaluator_form_drafts")
      .delete()
      .eq("call_report_id", callReportId)
      .eq("evaluator_id", user.id);

    if (deleteError) {
      logger.error(`Error deleting draft evaluation:: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
      return NextResponse.json(
        { error: "Failed to delete draft evaluation", details: deleteError.message },
        { status: 500 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "Draft evaluation deleted successfully",
    })), rate.result);
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}
