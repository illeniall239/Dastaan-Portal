import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: callReportId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "management", "executive", "programmer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const { deadline, onAirDate } = body as { deadline?: string | null; onAirDate?: string | null };

  const admin = createAdminClient();

  // Update deadline → negotiations.expected_completion_date (upsert)
  if ("deadline" in body) {
    const { data: existing } = await admin
      .from("negotiations")
      .select("id")
      .eq("call_report_id", callReportId)
      .single();

    if (existing) {
      await admin
        .from("negotiations")
        .update({ expected_completion_date: deadline ?? null })
        .eq("call_report_id", callReportId);
    } else {
      await admin
        .from("negotiations")
        .insert({ call_report_id: callReportId, expected_completion_date: deadline ?? null });
    }
  }

  // Update onAirDate → call_reports.aired_date
  if ("onAirDate" in body) {
    await admin
      .from("call_reports")
      .update({ aired_date: onAirDate ?? null })
      .eq("id", callReportId);
  }

  return NextResponse.json({ ok: true });
}
