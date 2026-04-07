import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("teamId");
    const metric = searchParams.get("metric");

    if (!teamId || !metric || !["call_reports", "evaluations"].includes(metric)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get team name
    const { data: team } = await adminClient
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .single();

    // Get active team member IDs
    const { data: members } = await adminClient
      .from("users")
      .select("id")
      .eq("team_id", teamId)
      .eq("status", "active");

    const memberIds = (members || []).map((m: any) => m.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        teamName: team?.name || "Unknown Team",
        metric,
      });
    }

    if (metric === "call_reports") {
      const { data, error } = await adminClient
        .from("call_reports")
        .select("id, working_title, writer_name, status, created_at, meeting_date")
        .in("created_by", memberIds)
        .eq("meeting_type", "call_report")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data || [],
        teamName: team?.name || "Unknown Team",
        metric,
      });
    }

    // metric === "evaluations"
    const { data, error } = await adminClient
      .from("evaluator_forms")
      .select("id, average_score, created_at, call_reports(working_title), users!evaluator_id(name)")
      .in("evaluator_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Flatten joined fields
    const flattened = (data || []).map((ef: any) => ({
      id: ef.id,
      working_title: ef.call_reports?.working_title || "—",
      evaluator_name: ef.users?.name || "—",
      average_score: ef.average_score,
      created_at: ef.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: flattened,
      teamName: team?.name || "Unknown Team",
      metric,
    });
  } catch (error) {
    console.error("team-drill-down error:", error);
    return NextResponse.json({ error: "Failed to fetch drill-down data" }, { status: 500 });
  }
}
