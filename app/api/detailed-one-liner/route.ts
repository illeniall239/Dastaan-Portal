import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { detailedOneLinerSchema } from "@/lib/validations/detailed-one-liner";
import { revalidatePath } from 'next/cache';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

/**
 * POST /api/detailed-one-liner
 * Create a new detailed one-liner with narrative breakdown
 */
export async function POST(request: NextRequest) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["evaluator", "content_manager", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Only evaluators and content managers can create detailed one-liners" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const validation = detailedOneLinerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const formData = validation.data;

    // Check if call report exists
    const { data: callReport, error: callReportError } = await supabase
      .from("call_reports")
      .select("id, call_report_id, working_title")
      .eq("id", formData.call_report_id)
      .single();

    if (callReportError || !callReport) {
      return NextResponse.json(
        { error: "Call report not found" },
        { status: 404 }
      );
    }

    // Check if a detailed one-liner already exists for this call report
    const { data: existing } = await supabase
      .from("detailed_one_liners")
      .select("id")
      .eq("call_report_id", formData.call_report_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A detailed one-liner already exists for this call report" },
        { status: 409 }
      );
    }

    // Insert detailed one-liner
    const { data: detailedOneLiner, error: insertError } = await supabase
      .from("detailed_one_liners")
      .insert({
        call_report_id: formData.call_report_id,
        preamble: formData.preamble,
        plot: formData.plot,
        emotional_arena: formData.emotional_arena,
        creed_conflict: formData.creed_conflict,
        new_element: formData.new_element,
        emotional_core_resolution: formData.emotional_core_resolution,
        production_optimization_notes: formData.production_optimization_notes || null,
        net_outcome: formData.net_outcome || null,
        conclusion_recommendation: formData.conclusion_recommendation || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !detailedOneLiner) {
      logger.error("Error creating detailed one-liner", { error: insertError, context: "POST /api/detailed-one-liner" });
      return NextResponse.json(
        { error: "Failed to create detailed one-liner" },
        { status: 500 }
      );
    }

    // Insert narrative breakdown items
    if (formData.narrative_breakdown_items.length > 0) {
      const narrativeItems = formData.narrative_breakdown_items.map((item, index) => ({
        detailed_one_liner_id: detailedOneLiner.id,
        story_stream: item.story_stream,
        percentage: item.percentage,
        narrative_purpose: item.narrative_purpose,
        sort_order: item.sort_order ?? index,
      }));

      const { error: narrativeError } = await supabase
        .from("narrative_breakdown_items")
        .insert(narrativeItems);

      if (narrativeError) {
        logger.error("Error creating narrative breakdown items", { error: narrativeError, context: "POST /api/detailed-one-liner" });
        // Rollback: delete the detailed one-liner if narrative items fail
        await supabase
          .from("detailed_one_liners")
          .delete()
          .eq("id", detailedOneLiner.id);

        return NextResponse.json(
          { error: "Failed to create narrative breakdown items" },
          { status: 500 }
        );
      }
    }

    // Insert event planning items (optional)
    if (formData.event_planning_items && formData.event_planning_items.length > 0) {
      const eventItems = formData.event_planning_items.map((item, index) => ({
        detailed_one_liner_id: detailedOneLiner.id,
        episode_range: item.episode_range,
        event_scale: item.event_scale,
        on_screen_activity: item.on_screen_activity,
        approx_frequency: item.approx_frequency,
        budget_category: item.budget_category,
        sort_order: item.sort_order ?? index,
      }));

      const { error: eventError } = await supabase
        .from("event_planning_items")
        .insert(eventItems);

      if (eventError) {
        logger.error("Error creating event planning items", { error: eventError, context: "POST /api/detailed-one-liner" });
        // Rollback: delete the detailed one-liner if event items fail
        await supabase
          .from("detailed_one_liners")
          .delete()
          .eq("id", detailedOneLiner.id);

        return NextResponse.json(
          { error: "Failed to create event planning items" },
          { status: 500 }
        );
      }
    }

    // Insert potential weaknesses/risks items (optional)
    if (formData.potential_weaknesses_risks_items && formData.potential_weaknesses_risks_items.length > 0) {
      const weaknessItems = formData.potential_weaknesses_risks_items.map((item, index) => ({
        detailed_one_liner_id: detailedOneLiner.id,
        issue: item.issue,
        explanation_risk_detail: item.explanation_risk_detail,
        impact: item.impact,
        sort_order: item.sort_order ?? index,
      }));

      const { error: weaknessError } = await supabase
        .from("potential_weaknesses_risks_items")
        .insert(weaknessItems);

      if (weaknessError) {
        logger.error("Error creating potential weaknesses/risks items", { error: weaknessError, context: "POST /api/detailed-one-liner" });
        // Rollback: delete the detailed one-liner if weakness items fail
        await supabase
          .from("detailed_one_liners")
          .delete()
          .eq("id", detailedOneLiner.id);

        return NextResponse.json(
          { error: "Failed to create potential weaknesses/risks items" },
          { status: 500 }
        );
      }
    }

    // Insert character relationships (optional)
    if (formData.character_relationships && formData.character_relationships.length > 0) {
      const characterRelationshipItems = formData.character_relationships.map((item, index) => ({
        detailed_one_liner_id: detailedOneLiner.id,
        character_a_name: item.character_a_name,
        character_a_role: item.character_a_role,
        character_b_name: item.character_b_name,
        character_b_role: item.character_b_role,
        relationship_type: item.relationship_type,
        relationship_description: item.relationship_description,
        initial_state: item.initial_state || null,
        final_state: item.final_state || null,
        key_turning_points: item.key_turning_points || null,
        emotional_weight: item.emotional_weight || null,
        drives_plot: item.drives_plot ?? false,
        sort_order: item.sort_order ?? index,
      }));

      const { error: characterError } = await supabase
        .from("character_relationships")
        .insert(characterRelationshipItems);

      if (characterError) {
        logger.error("Error creating character relationships", { error: characterError, context: "POST /api/detailed-one-liner" });
        // Rollback: delete the detailed one-liner if character relationships fail
        await supabase
          .from("detailed_one_liners")
          .delete()
          .eq("id", detailedOneLiner.id);

        return NextResponse.json(
          { error: "Failed to create character relationships" },
          { status: 500 }
        );
      }
    }

    // Fetch the complete detailed one-liner with all related items
    const { data: complete, error: fetchError } = await supabase
      .from("detailed_one_liners")
      .select(`
        *,
        call_report:call_reports(call_report_id, working_title, writer_name),
        narrative_breakdown_items(*),
        event_planning_items(*),
        potential_weaknesses_risks_items(*),
        character_relationships(*)
      `)
      .eq("id", detailedOneLiner.id)
      .single();

    if (fetchError) {
      logger.error("Error fetching complete detailed one-liner", { error: fetchError, context: "POST /api/detailed-one-liner" });
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "detailed_one_liner",
      entityId: detailedOneLiner.id,
      action: "created",
      performedBy: user.id,
      details: { ...requestContext, newValues: { call_report_id: formData.call_report_id } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    // Revalidate detailed one-liner list pages to show new entry immediately
    revalidatePath('/content-department/detailed-one-liner');
    revalidatePath('/evaluator/detailed-one-liner');

    return NextResponse.json(
      {
        message: "Detailed one-liner created successfully",
        data: complete || detailedOneLiner,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Unexpected error creating detailed one-liner", { error, context: "POST /api/detailed-one-liner" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
