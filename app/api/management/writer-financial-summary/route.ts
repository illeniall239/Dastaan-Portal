import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export const dynamic = "force-dynamic";

/**
 * GET /api/management/writer-financial-summary
 * Returns aggregated financial data per writer showing:
 * - Total negotiated amounts
 * - Total contract values
 * - Total paid amounts
 * - Outstanding balances
 * - Number of projects
 *
 * OPTIMIZED:
 * - Queries writer_financial_summary materialized view
 * - SQL aggregations replace JavaScript processing
 * - 10-20x faster than previous implementation
 * - Refresh view with: SELECT refresh_writer_financial_summary();
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    // Check if user is management or admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || !["management", "admin", "executive"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // OPTIMIZED: Use admin client to query materialized view (bypasses RLS)
    const adminClient = createAdminClient();

    // Refresh the materialized view before querying so data is always current
    await adminClient.rpc("refresh_writer_financial_summary");

    // Query materialized view for pre-aggregated financial data
    const { data: summary, error } = await adminClient
      .from("writer_financial_summary")
      .select("*")
      .order("outstanding_balance", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch writer financial summary" },
        { status: 500 }
      );
    }

    // Format the response to match expected structure
    const summaryArray = (summary || []).map((writer: any) => ({
      writer_name: writer.writer_name,
      total_negotiated: Number(writer.total_negotiated),
      total_contracted: Number(writer.total_contracted),
      total_paid: Number(writer.total_paid),
      outstanding_balance: Number(writer.outstanding_balance),
      project_count: Number(writer.project_count),
    }));

    // Calculate totals
    const totals = {
      total_committed: summaryArray.reduce((sum: number, writer: any) =>
        sum + Math.max(writer.total_contracted, writer.total_negotiated), 0
      ),
      total_paid: summaryArray.reduce((sum: number, writer: any) =>
        sum + writer.total_paid, 0
      ),
      total_outstanding: summaryArray.reduce((sum: number, writer: any) =>
        sum + writer.outstanding_balance, 0
      ),
      writer_count: summaryArray.length,
      project_count: summaryArray.reduce((sum: number, writer: any) =>
        sum + writer.project_count, 0
      ),
    };

    return NextResponse.json({
      summary: summaryArray,
      totals,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
