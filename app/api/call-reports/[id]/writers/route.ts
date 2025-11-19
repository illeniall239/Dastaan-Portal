import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/call-reports/[id]/writers
 * Fetch all writers for a call report
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch writers with JOIN to get writer names
    const { data: writers, error } = await supabase
      .from("call_report_writers")
      .select(`
        id,
        call_report_id,
        writer_id,
        writer_email,
        writer_phone,
        display_order,
        created_at,
        updated_at,
        writer:writers(name)
      `)
      .eq("call_report_id", id)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching call report writers:", error);
      return NextResponse.json(
        { error: "Failed to fetch writers" },
        { status: 500 }
      );
    }

    // Transform to flatten writer name
    const transformedWriters = writers?.map(w => ({
      id: w.id,
      call_report_id: w.call_report_id,
      writer_id: w.writer_id,
      writer_name: (w.writer as any)?.name || "",
      writer_email: w.writer_email,
      writer_phone: w.writer_phone,
      display_order: w.display_order,
      created_at: w.created_at,
      updated_at: w.updated_at,
    })) || [];

    return NextResponse.json({ writers: transformedWriters });
  } catch (error) {
    console.error("Error in GET /api/call-reports/[id]/writers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/call-reports/[id]/writers
 * Add writer(s) to a call report
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const { writers } = body;
    if (!Array.isArray(writers) || writers.length === 0) {
      return NextResponse.json(
        { error: "Writers array is required" },
        { status: 400 }
      );
    }

    // Verify call report exists
    const { data: callReport, error: fetchError } = await supabase
      .from("call_reports")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !callReport) {
      return NextResponse.json(
        { error: "Call report not found" },
        { status: 404 }
      );
    }

    // Prepare writer records for insertion
    const writerRecords = writers.map((writer, index) => ({
      call_report_id: id,
      writer_id: writer.writer_id,
      writer_email: writer.writer_email || null,
      writer_phone: writer.writer_phone || null,
      display_order: writer.display_order !== undefined ? writer.display_order : index,
    }));

    // Insert writers
    const { data: insertedWriters, error: insertError } = await supabase
      .from("call_report_writers")
      .insert(writerRecords)
      .select();

    if (insertError) {
      console.error("Error inserting writers:", insertError);
      return NextResponse.json(
        { error: "Failed to add writers", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Writers added successfully", writers: insertedWriters },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/call-reports/[id]/writers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/call-reports/[id]/writers/reorder
 * Update display order for all writers
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const { writers } = body;
    if (!Array.isArray(writers) || writers.length === 0) {
      return NextResponse.json(
        { error: "Writers array with new order is required" },
        { status: 400 }
      );
    }

    // Update display_order for each writer
    const updatePromises = writers.map((writer: any, index: number) =>
      supabase
        .from("call_report_writers")
        .update({ display_order: index })
        .eq("id", writer.id)
        .eq("call_report_id", id)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("Error reordering writers:", errors);
      return NextResponse.json(
        { error: "Failed to reorder writers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Writers reordered successfully" });
  } catch (error) {
    console.error("Error in PUT /api/call-reports/[id]/writers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
