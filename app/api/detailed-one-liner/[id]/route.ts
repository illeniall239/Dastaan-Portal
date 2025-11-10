import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";

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
