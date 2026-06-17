import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  const { callReportId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
  if (!rate.success) return rate.response!;

  const { data, error } = await supabase
    .from("evaluator_forms")
    .select("*")
    .eq("call_report_id", callReportId)
    .eq("evaluator_id", user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return withCors(request, NextResponse.json({ error: "Failed to fetch evaluation", details: error.message }, { status: 500 }));
  }

  return addRateLimitHeaders(withCors(request, NextResponse.json({ evaluation: data || null })), rate.result);
}


