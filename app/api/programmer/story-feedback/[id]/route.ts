import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_ROLES = ["programmer", "management", "admin"];

async function getAuthedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) return null;
  return profile;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { call_report_id, feedback_date, content } = body;

  const admin = createAdminClient();

  // Verify ownership
  const { data: existing } = await admin
    .from("programmer_feedback")
    .select("programmer_id")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "admin" && existing.programmer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (call_report_id !== undefined) patch.call_report_id = call_report_id;
  if (feedback_date !== undefined) patch.feedback_date = feedback_date;
  if (content !== undefined) patch.content = content;

  const { data, error } = await admin
    .from("programmer_feedback")
    .update(patch)
    .eq("id", id)
    .select(`
      id, programmer_id, call_report_id, feedback_date, content, created_at, updated_at,
      programmer:users!programmer_id(id, name),
      call_report:call_reports!call_report_id(id, working_title, writer_name, content_type)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch current attachments for this entry
  const { data: atts } = await admin
    .from("attachments")
    .select("id, file_name, file_path, file_type, file_size")
    .eq("entity_type", "programmer_feedback")
    .eq("entity_id", id);

  return NextResponse.json({ feedback: { ...data, attachments: atts || [] } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const supabase = await createClient();

  // Verify ownership
  const { data: existing } = await admin
    .from("programmer_feedback")
    .select("programmer_id")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "admin" && existing.programmer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete attachments from storage and DB
  const { data: attachments } = await admin
    .from("attachments")
    .select("id, file_path")
    .eq("entity_type", "programmer_feedback")
    .eq("entity_id", id);

  if (attachments && attachments.length > 0) {
    const paths = attachments.map((a: { file_path: string }) => a.file_path);
    await supabase.storage.from("attachments").remove(paths);
    await admin
      .from("attachments")
      .delete()
      .eq("entity_type", "programmer_feedback")
      .eq("entity_id", id);
  }

  const { error } = await admin.from("programmer_feedback").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
