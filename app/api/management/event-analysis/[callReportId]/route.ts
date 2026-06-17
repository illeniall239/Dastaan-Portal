import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { callReportIdParamSchema } from "@/lib/validations/uuid-params";
import { getEventAnalysisForDrama } from "@/lib/management/episode-pipeline";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const { callReportId } = await params;

  // Validate UUID format
  const paramValidation = callReportIdParamSchema.safeParse({ callReportId });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid call report ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

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
    logger.error(`Error fetching event analysis: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Failed to fetch event analysis data" },
      { status: 500 }
    );
  }
}
