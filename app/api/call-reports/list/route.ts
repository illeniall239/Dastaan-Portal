import { NextResponse } from "next/server";
import { getAllCallReports } from "@/lib/meetings/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const callReports = await getAllCallReports();
    return NextResponse.json({ callReports });
  } catch (error: any) {
    console.error("Error fetching call reports:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch call reports" },
      { status: 500 }
    );
  }
}
