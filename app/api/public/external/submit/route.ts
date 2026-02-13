import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit/server";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export const dynamic = "force-dynamic";

interface SubmitEvaluationRequest {
  token: string;
  evaluator_id: string;
  evaluator_name?: string;
  evaluator_email?: string;
  evaluator_organization?: string;
  evaluation_data?: any;  // Single evaluation (backwards compatible)
  evaluations?: any[];    // NEW: Multiple evaluations
}

export async function POST(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.veryStrict);
    if (!rate.success) return rate.response!;

    const body: SubmitEvaluationRequest = await request.json();

    // Validate required fields
    if (!body.token || !body.evaluator_id) {
      return NextResponse.json(
        { error: "token and evaluator_id are required" },
        { status: 400 }
      );
    }

    // Check if single or multiple evaluations
    const isMultiEvaluation = body.evaluations && Array.isArray(body.evaluations);

    if (!isMultiEvaluation && !body.evaluation_data) {
      return NextResponse.json(
        { error: "evaluation_data or evaluations array is required" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for anonymous submissions
    const supabase = createAdminClient();

    // Fetch and validate link
    const { data: link, error: linkError } = await supabase
      .from("external_evaluation_links")
      .select("*")
      .eq("token", body.token)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        { error: "Invalid token: Link not found" },
        { status: 404 }
      );
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json(
        { error: "This evaluation link has been deactivated" },
        { status: 403 }
      );
    }

    // Check if link has expired
    const now = new Date();
    const expiresAt = new Date(link.expires_at);
    if (expiresAt < now) {
      return NextResponse.json(
        { error: "This evaluation link has expired" },
        { status: 410 }
      );
    }

    // Check if email is allowed (if restrictions exist)
    if (link.allowed_emails && link.allowed_emails.length > 0) {
      if (!body.evaluator_email) {
        return NextResponse.json(
          { error: "Email is required for this evaluation" },
          { status: 400 }
        );
      }

      if (!link.allowed_emails.includes(body.evaluator_email)) {
        return NextResponse.json(
          { error: "Your email is not authorized to submit this evaluation" },
          { status: 403 }
        );
      }
    }

    // Get client IP and user agent for audit trail
    const ip_address = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const user_agent = request.headers.get("user-agent") || "unknown";

    // Handle multi-content evaluation submission
    if (isMultiEvaluation) {
      // Multi-layer duplicate submission check (same as single evaluation)
      const { data: existingByEvaluatorId } = await supabase
        .from("external_evaluations")
        .select("id")
        .eq("link_id", link.id)
        .eq("evaluator_id", body.evaluator_id)
        .single();

      if (existingByEvaluatorId) {
        return NextResponse.json(
          { error: "You have already submitted an evaluation using this link" },
          { status: 409 }
        );
      }

      if (ip_address && ip_address !== "unknown") {
        const { data: existingByIp } = await supabase
          .from("external_evaluations")
          .select("id")
          .eq("link_id", link.id)
          .eq("ip_address", ip_address)
          .single();

        if (existingByIp) {
          return NextResponse.json(
            { error: "A submission has already been received from your network. If you believe this is an error, please contact support." },
            { status: 409 }
          );
        }
      }

      // Insert all evaluations
      const evaluationRecords = body.evaluations!.map(evalItem => ({
        link_id: link.id,
        content_type: evalItem.content_type,
        content_id: evalItem.content_id,
        evaluator_id: body.evaluator_id,
        evaluator_name: body.evaluator_name || null,
        evaluator_email: body.evaluator_email || null,
        evaluator_organization: body.evaluator_organization || null,
        evaluation_data: evalItem.evaluation_data,
        ip_address,
        user_agent,
      }));

      const { data: evaluations, error: evalsError } = await supabase
        .from("external_evaluations")
        .insert(evaluationRecords)
        .select();

      if (evalsError) {
        logger.error(`Error creating external evaluations: ${evalsError.message}`);
        return NextResponse.json(
          { error: "Failed to submit evaluations" },
          { status: 500 }
        );
      }

      // Log audit action for each evaluation
      for (const evaluation of evaluations!) {
        await logAdminAction({
          entityType: "external_evaluation",
          entityId: evaluation.id,
          action: "created",
          performedBy: link.created_by,
          details: {
            ipAddress: ip_address,
            userAgent: user_agent,
            linkId: link.id,
            contentType: evaluation.content_type,
            contentId: evaluation.content_id,
            externalEvaluator: {
              name: body.evaluator_name || null,
              email: body.evaluator_email || null,
              organization: body.evaluator_organization || null,
            },
            evaluationData: evaluation.evaluation_data,
          },
        });
      }

      return NextResponse.json({
        message: "All evaluations submitted successfully",
        evaluations: evaluations.map(e => ({
          id: e.id,
          submitted_at: e.submitted_at,
          content_type: e.content_type,
        })),
      });
    }

    // Single evaluation submission (backwards compatible below)
    // Multi-layer duplicate submission check
    // Layer 1: Check for duplicate submission from same evaluator_id (localStorage)
    const { data: existingByEvaluatorId } = await supabase
      .from("external_evaluations")
      .select("id")
      .eq("link_id", link.id)
      .eq("evaluator_id", body.evaluator_id)
      .single();

    if (existingByEvaluatorId) {
      return NextResponse.json(
        { error: "You have already submitted an evaluation using this link" },
        { status: 409 }
      );
    }

    // Layer 2: Check for duplicate submission from same IP address (bypass detection)
    if (ip_address && ip_address !== "unknown") {
      const { data: existingByIp } = await supabase
        .from("external_evaluations")
        .select("id")
        .eq("link_id", link.id)
        .eq("ip_address", ip_address)
        .single();

      if (existingByIp) {
        return NextResponse.json(
          { error: "A submission has already been received from your network. If you believe this is an error, please contact support." },
          { status: 409 }
        );
      }
    }

    // Validate evaluation data based on content type
    if (link.content_type === "episode") {
      if (
        !body.evaluation_data.no_of_pages ||
        !body.evaluation_data.no_of_scenes ||
        !body.evaluation_data.conflict_of_content_score ||
        !body.evaluation_data.characterization_score ||
        !body.evaluation_data.story_progression_score ||
        !body.evaluation_data.freezes_score ||
        !body.evaluation_data.whats_next_element_score
      ) {
        return NextResponse.json(
          { error: "Missing required evaluation fields for episode" },
          { status: 400 }
        );
      }

      // Validate score ranges (1-10)
      const scores = [
        body.evaluation_data.conflict_of_content_score,
        body.evaluation_data.characterization_score,
        body.evaluation_data.story_progression_score,
        body.evaluation_data.freezes_score,
        body.evaluation_data.whats_next_element_score,
      ];

      for (const score of scores) {
        if (score < 1 || score > 10) {
          return NextResponse.json(
            { error: "Scores must be between 1 and 10" },
            { status: 400 }
          );
        }
      }
    } else if (link.content_type === "call_report") {
      // Validate call_report evaluation data structure
      if (!body.evaluation_data.slot) {
        return NextResponse.json(
          { error: "Missing required field: suggested slot" },
          { status: 400 }
        );
      }

      // Validate evaluation scores (1-10)
      const requiredScores = [
        'conflict_of_content_score',
        'characterization_score',
        'story_progression_score',
        'whats_next_element_score',
        'overall_oneliner_grade_score'
      ];

      for (const scoreField of requiredScores) {
        const score = body.evaluation_data[scoreField];
        if (!score || score < 1 || score > 10) {
          return NextResponse.json(
            { error: `${scoreField} must be between 1 and 10` },
            { status: 400 }
          );
        }
      }
    } else if (link.content_type === "one_liner") {
      // Validate one_liner evaluation - only comments field is optional
      // No required fields for one_liner
    }

    // Insert external evaluation
    const { data: evaluation, error: evalError } = await supabase
      .from("external_evaluations")
      .insert({
        link_id: link.id,
        content_type: link.content_type,
        content_id: link.content_id,
        evaluator_id: body.evaluator_id,
        evaluator_name: body.evaluator_name || null,
        evaluator_email: body.evaluator_email || null,
        evaluator_organization: body.evaluator_organization || null,
        evaluation_data: body.evaluation_data,
        ip_address,
        user_agent,
      })
      .select()
      .single();

    if (evalError) {
      logger.error(`Error creating external evaluation:: ${evalError instanceof Error ? evalError.message : String(evalError)}`);
      return NextResponse.json(
        { error: "Failed to submit evaluation" },
        { status: 500 }
      );
    }

    // Log admin action for audit trail
    // Use link creator as performedBy since they enabled this external evaluation
    await logAdminAction({
      entityType: "external_evaluation",
      entityId: evaluation.id,
      action: "created",
      performedBy: link.created_by, // Link creator is responsible for external submissions
      details: {
        ipAddress: ip_address,
        userAgent: user_agent,
        linkId: link.id,
        contentType: link.content_type,
        contentId: link.content_id,
        externalEvaluator: {
          name: body.evaluator_name || null,
          email: body.evaluator_email || null,
          organization: body.evaluator_organization || null,
        },
        evaluationData: body.evaluation_data,
      },
    });

    // Note: The trigger will auto-increment current_submissions

    return NextResponse.json({
      message: "Evaluation submitted successfully",
      evaluation: {
        id: evaluation.id,
        submitted_at: evaluation.submitted_at,
      },
    });
  } catch (error) {
    logger.error(`Error in submit evaluation API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
