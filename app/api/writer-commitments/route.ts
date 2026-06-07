import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWriterCommitmentSchema } from "@/lib/validations/writer-commitments";

export const dynamic = "force-dynamic";

/**
 * GET /api/writer-commitments
 * Returns all writer commitments joined with writer name and call report title.
 * Supports optional ?writer_id= and ?call_report_id= query params.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const writerId = searchParams.get("writer_id");
  const callReportId = searchParams.get("call_report_id");

  let query = supabase
    .from("writer_commitments")
    .select(`
      *,
      writer:writers!writer_id(name),
      call_report:call_reports!call_report_id(working_title, call_report_id)
    `)
    .order("created_at", { ascending: false });

  if (writerId) query = query.eq("writer_id", writerId);
  if (callReportId) query = query.eq("call_report_id", callReportId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commitments: data });
}

/**
 * POST /api/writer-commitments
 * Create a new writer commitment record.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validation = createWriterCommitmentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("writer_commitments")
    .insert({ ...validation.data, created_by: user.id })
    .select(`
      *,
      writer:writers!writer_id(name),
      call_report:call_reports!call_report_id(working_title, call_report_id)
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A commitment record already exists for this writer and project" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commitment: data }, { status: 201 });
}
