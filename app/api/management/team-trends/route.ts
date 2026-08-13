import { NextRequest, NextResponse } from "next/server";
import { getTeamPerformanceTrends } from "@/lib/management/team-performance";
import { requireApiAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(["management", "management_viewer"]);
  if (!auth.success) return auth.response;

  try {

    const teamId = request.nextUrl.searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    const trends = await getTeamPerformanceTrends(teamId, 6);

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("team-trends error:", error);
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}
