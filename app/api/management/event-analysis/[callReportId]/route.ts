import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventAnalysisForDrama } from "@/lib/management/episode-pipeline";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const { callReportId } = await params;

  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role - only management and admin can access
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || !["management", "admin"].includes(userData.role)) {
      return NextResponse.json(
        { error: "Forbidden - Only management can access event analysis" },
        { status: 403 }
      );
    }

    // Fetch event analysis data
    const data = await getEventAnalysisForDrama(callReportId);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching event analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch event analysis data" },
      { status: 500 }
    );
  }
}
