import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("programmer_feedback")
    .select(`
      id, programmer_id, call_report_id, feedback_date, content, created_at, updated_at,
      programmer:users!programmer_id(id, name),
      call_report:call_reports!call_report_id(id, working_title, writer_name, content_type)
    `)
    .order("feedback_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const feedbackList = rows || [];
  const ids = feedbackList.map((r: any) => r.id);

  // Fetch attachments separately (polymorphic, no direct FK)
  let attachmentsByFeedback: Record<string, any[]> = {};
  if (ids.length > 0) {
    const { data: atts } = await admin
      .from("attachments")
      .select("id, entity_id, file_name, file_path, file_type, file_size")
      .eq("entity_type", "programmer_feedback")
      .in("entity_id", ids);
    for (const att of atts || []) {
      if (!attachmentsByFeedback[att.entity_id]) attachmentsByFeedback[att.entity_id] = [];
      attachmentsByFeedback[att.entity_id].push(att);
    }
  }

  const feedback = feedbackList.map((r: any) => ({
    ...r,
    attachments: attachmentsByFeedback[r.id] || [],
  }));

  return NextResponse.json({ feedback });
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { call_report_id, feedback_date, content } = body;

  if (!call_report_id) {
    return NextResponse.json({ error: "call_report_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("programmer_feedback")
    .insert({
      programmer_id: user.id,
      call_report_id,
      feedback_date: feedback_date || new Date().toISOString().slice(0, 10),
      content: content || null,
    })
    .select(`
      id, programmer_id, call_report_id, feedback_date, content, created_at, updated_at,
      programmer:users!programmer_id(id, name),
      call_report:call_reports!call_report_id(id, working_title, writer_name, content_type)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ feedback: { ...data, attachments: [] } }, { status: 201 });
}
