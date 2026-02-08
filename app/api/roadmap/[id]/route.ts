import { NextResponse } from "next/server";
import { getRoadmapData } from "@/lib/roadmap/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("[API] Fetching roadmap data for ID:", id);

    const data = await getRoadmapData(id);

    if (!data) {
      console.log("[API] Call report not found for ID:", id);
      return NextResponse.json(
        { error: "Call report not found" },
        { status: 404 }
      );
    }

    console.log("[API] Successfully fetched roadmap data for:", data.callReportId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error fetching roadmap data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch roadmap data: ${errorMessage}` },
      { status: 500 }
    );
  }
}
