import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { updateDetailedOneLinerSchema } from "@/lib/validations/detailed-one-liner";

/**
 * GET /api/detailed-one-liner/[id]
 * Fetch a detailed one-liner by ID with narrative breakdown items
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const params = await context.params;

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    // Validate UUID format
    const paramValidation = idParamSchema.safeParse({ id });
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: "Invalid ID format", details: paramValidation.error.format() },
        { status: 400 }
      );
    }

    // Fetch detailed one-liner with narrative breakdown items
    const { data, error } = await supabase
      .from("detailed_one_liners")
      .select(`
        *,
        call_report:call_reports(
          id,
          call_report_id,
          working_title,
          writer_name,
          logline,
          genre
        ),
        narrative_breakdown_items(
          id,
          story_stream,
          percentage,
          narrative_purpose,
          sort_order,
          created_at
        ),
        created_by_user:users!created_by(
          id,
          name,
          email
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Detailed one-liner not found" },
          { status: 404 }
        );
      }
      logger.error(`Error fetching detailed one-liner: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: "Failed to fetch detailed one-liner", details: error.message },
        { status: 500 }
      );
    }

    // Sort narrative breakdown items by sort_order
    if (data.narrative_breakdown_items) {
      data.narrative_breakdown_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    logger.error(`Unexpected error fetching detailed one-liner: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/detailed-one-liner/[id]
 * Update a detailed one-liner
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const params = await context.params;

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

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { id } = params;

    // Validate UUID format
    const paramValidation = idParamSchema.safeParse({ id });
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: "Invalid ID format", details: paramValidation.error.format() },
        { status: 400 }
      );
    }

    // Check if detailed one-liner exists and get owner
    const { data: existing, error: fetchError } = await supabase
      .from("detailed_one_liners")
      .select("created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Detailed one-liner not found" },
          { status: 404 }
        );
      }
      logger.error(`Error fetching detailed one-liner: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      return NextResponse.json(
        { error: "Failed to fetch detailed one-liner", details: fetchError.message },
        { status: 500 }
      );
    }

    // Check permissions: owner or manager/admin
    const canEdit =
      existing.created_by === user.id ||
      ["content_manager", "admin"].includes(userData.role);

    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to edit this detailed one-liner" },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = updateDetailedOneLinerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Prepare main update data (excluding nested items)
    const mainUpdate: any = {};
    if (updates.preamble !== undefined) mainUpdate.preamble = updates.preamble;
    if (updates.plot !== undefined) mainUpdate.plot = updates.plot;
    if (updates.emotional_arena !== undefined) mainUpdate.emotional_arena = updates.emotional_arena;
    if (updates.creed_conflict !== undefined) mainUpdate.creed_conflict = updates.creed_conflict;
    if (updates.new_element !== undefined) mainUpdate.new_element = updates.new_element;
    if (updates.emotional_core_resolution !== undefined) mainUpdate.emotional_core_resolution = updates.emotional_core_resolution;
    if (updates.production_optimization_notes !== undefined) mainUpdate.production_optimization_notes = updates.production_optimization_notes;
    if (updates.net_outcome !== undefined) mainUpdate.net_outcome = updates.net_outcome;
    if (updates.conclusion_recommendation !== undefined) mainUpdate.conclusion_recommendation = updates.conclusion_recommendation;

    // Update main detailed_one_liners record if there are changes
    if (Object.keys(mainUpdate).length > 0) {
      const { error: updateError } = await supabase
        .from("detailed_one_liners")
        .update(mainUpdate)
        .eq("id", id);

      if (updateError) {
        logger.error(`Error updating detailed one-liner: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
        return NextResponse.json(
          { error: "Failed to update detailed one-liner", details: updateError.message },
          { status: 500 }
        );
      }
    }

    // Handle narrative_breakdown_items update
    if (updates.narrative_breakdown_items !== undefined) {
      // Delete existing items
      const { error: deleteNarrativeError } = await supabase
        .from("narrative_breakdown_items")
        .delete()
        .eq("detailed_one_liner_id", id);

      if (deleteNarrativeError) {
        logger.error(`Error deleting narrative breakdown items: ${deleteNarrativeError instanceof Error ? deleteNarrativeError.message : String(deleteNarrativeError)}`);
        return NextResponse.json(
          { error: "Failed to update narrative breakdown items", details: deleteNarrativeError.message },
          { status: 500 }
        );
      }

      // Insert new items
      if (updates.narrative_breakdown_items.length > 0) {
        const narrativeItems = updates.narrative_breakdown_items.map((item) => ({
          detailed_one_liner_id: id,
          story_stream: item.story_stream,
          percentage: item.percentage,
          narrative_purpose: item.narrative_purpose,
          sort_order: item.sort_order,
        }));

        const { error: insertNarrativeError } = await supabase
          .from("narrative_breakdown_items")
          .insert(narrativeItems);

        if (insertNarrativeError) {
          logger.error(`Error inserting narrative breakdown items: ${insertNarrativeError instanceof Error ? insertNarrativeError.message : String(insertNarrativeError)}`);
          return NextResponse.json(
            { error: "Failed to insert narrative breakdown items", details: insertNarrativeError.message },
            { status: 500 }
          );
        }
      }
    }

    // Handle event_planning_items update
    if (updates.event_planning_items !== undefined) {
      // Delete existing items
      const { error: deleteEventError } = await supabase
        .from("event_planning_items")
        .delete()
        .eq("detailed_one_liner_id", id);

      if (deleteEventError) {
        logger.error(`Error deleting event planning items: ${deleteEventError instanceof Error ? deleteEventError.message : String(deleteEventError)}`);
        return NextResponse.json(
          { error: "Failed to update event planning items", details: deleteEventError.message },
          { status: 500 }
        );
      }

      // Insert new items
      if (updates.event_planning_items && updates.event_planning_items.length > 0) {
        const eventItems = updates.event_planning_items.map((item) => ({
          detailed_one_liner_id: id,
          episode_range: item.episode_range,
          event_scale: item.event_scale,
          on_screen_activity: item.on_screen_activity,
          approx_frequency: item.approx_frequency,
          budget_category: item.budget_category,
          sort_order: item.sort_order,
        }));

        const { error: insertEventError } = await supabase
          .from("event_planning_items")
          .insert(eventItems);

        if (insertEventError) {
          logger.error(`Error inserting event planning items: ${insertEventError instanceof Error ? insertEventError.message : String(insertEventError)}`);
          return NextResponse.json(
            { error: "Failed to insert event planning items", details: insertEventError.message },
            { status: 500 }
          );
        }
      }
    }

    // Handle potential_weaknesses_risks_items update
    if (updates.potential_weaknesses_risks_items !== undefined) {
      // Delete existing items
      const { error: deleteRiskError } = await supabase
        .from("potential_weaknesses_risks_items")
        .delete()
        .eq("detailed_one_liner_id", id);

      if (deleteRiskError) {
        logger.error(`Error deleting potential weaknesses/risks items: ${deleteRiskError instanceof Error ? deleteRiskError.message : String(deleteRiskError)}`);
        return NextResponse.json(
          { error: "Failed to update potential weaknesses/risks items", details: deleteRiskError.message },
          { status: 500 }
        );
      }

      // Insert new items
      if (updates.potential_weaknesses_risks_items && updates.potential_weaknesses_risks_items.length > 0) {
        const riskItems = updates.potential_weaknesses_risks_items.map((item) => ({
          detailed_one_liner_id: id,
          issue: item.issue,
          explanation_risk_detail: item.explanation_risk_detail,
          impact: item.impact,
          sort_order: item.sort_order,
        }));

        const { error: insertRiskError } = await supabase
          .from("potential_weaknesses_risks_items")
          .insert(riskItems);

        if (insertRiskError) {
          logger.error(`Error inserting potential weaknesses/risks items: ${insertRiskError instanceof Error ? insertRiskError.message : String(insertRiskError)}`);
          return NextResponse.json(
            { error: "Failed to insert potential weaknesses/risks items", details: insertRiskError.message },
            { status: 500 }
          );
        }
      }
    }

    // Fetch and return the updated detailed one-liner
    const { data: updated, error: fetchUpdatedError } = await supabase
      .from("detailed_one_liners")
      .select(`
        *,
        call_report:call_reports(
          id,
          call_report_id,
          working_title,
          writer_name,
          logline,
          genre
        ),
        narrative_breakdown_items(
          id,
          story_stream,
          percentage,
          narrative_purpose,
          sort_order,
          created_at
        ),
        created_by_user:users!created_by(
          id,
          name,
          email
        )
      `)
      .eq("id", id)
      .single();

    if (fetchUpdatedError) {
      logger.error(`Error fetching updated detailed one-liner: ${fetchUpdatedError instanceof Error ? fetchUpdatedError.message : String(fetchUpdatedError)}`);
      return NextResponse.json(
        { error: "Failed to fetch updated detailed one-liner", details: fetchUpdatedError.message },
        { status: 500 }
      );
    }

    // Sort narrative breakdown items
    if (updated.narrative_breakdown_items) {
      updated.narrative_breakdown_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }

    return NextResponse.json({
      message: "Detailed one-liner updated successfully",
      data: updated
    }, { status: 200 });
  } catch (error) {
    logger.error(`Unexpected error updating detailed one-liner: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
