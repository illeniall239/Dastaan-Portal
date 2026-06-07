import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateWriterCommitmentSchema } from "@/lib/validations/writer-commitments";

/**
 * PATCH /api/writer-commitments/[id]
 * Partial update of a writer commitment record.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validation = updateWriterCommitmentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("writer_commitments")
    .update({ ...validation.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(`
      *,
      writer:writers!writer_id(name),
      call_report:call_reports!call_report_id(working_title, call_report_id)
    `)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commitment: data });
}

/**
 * DELETE /api/writer-commitments/[id]
 * Delete a writer commitment record.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("writer_commitments")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted successfully" });
}
