import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

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
 * FIXED ISSUES:
 * - Uses admin client to bypass RLS
 * - Fetches data separately (no nested queries)
 * - Properly handles multiple payment schedules per contract
 * - Fixed project count deduplication across negotiations and contracts
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is management or admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || !["management", "admin", "executive"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client for data fetching to bypass RLS
    const adminClient = createAdminClient();

    // Fetch all negotiations (no nested queries)
    const { data: negotiations, error: negotiationsError } = await adminClient
      .from("negotiations")
      .select("id, story_id, writer_producer_name, agreed_price, status")
      .eq("status", "agreed");

    if (negotiationsError) {
      console.error("Error fetching negotiations:", negotiationsError);
      return NextResponse.json(
        { error: "Failed to fetch negotiations" },
        { status: 500 }
      );
    }

    // Fetch stories for negotiations
    const negotiationStoryIds = [...new Set(negotiations?.map((n: any) => n.story_id).filter(Boolean))];
    const { data: negotiationStories } = await adminClient
      .from("stories")
      .select("id, story_id, title")
      .in("id", negotiationStoryIds);

    // Fetch all contracts (no nested queries)
    const { data: contracts, error: contractsError } = await adminClient
      .from("contracts")
      .select("id, story_id, total_value, status")
      .in("status", ["active", "pending_signatures", "completed"]);

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
      return NextResponse.json(
        { error: "Failed to fetch contracts" },
        { status: 500 }
      );
    }

    // Fetch stories for contracts
    const contractStoryIds = [...new Set(contracts?.map((c: any) => c.story_id).filter(Boolean))];
    const { data: contractStories } = await adminClient
      .from("stories")
      .select("id, story_id, title")
      .in("id", contractStoryIds);

    // Fetch payment schedules separately (avoids nested query issues)
    const contractIds = contracts?.map((c: any) => c.id) || [];
    const { data: paymentSchedules, error: paymentSchedulesError } = await adminClient
      .from("payment_schedules")
      .select("id, contract_id, writer_producer_name")
      .in("contract_id", contractIds);

    if (paymentSchedulesError) {
      console.error("Error fetching payment schedules:", paymentSchedulesError);
    }

    // Fetch payments separately
    const paymentScheduleIds = paymentSchedules?.map((ps: any) => ps.id) || [];
    const { data: payments, error: paymentsError } = await adminClient
      .from("payments")
      .select("id, payment_schedule_id, net_amount, status")
      .in("payment_schedule_id", paymentScheduleIds)
      .eq("status", "paid");

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
    }

    console.log('Data fetched:', {
      negotiations: negotiations?.length || 0,
      contracts: contracts?.length || 0,
      paymentSchedules: paymentSchedules?.length || 0,
      payments: payments?.length || 0
    });

    // Build maps for lookups
    const storyMap = new Map();
    [...(negotiationStories || []), ...(contractStories || [])].forEach((story: any) => {
      storyMap.set(story.id, story);
    });

    const paymentScheduleMap = new Map();
    (paymentSchedules || []).forEach((ps: any) => {
      paymentScheduleMap.set(ps.id, ps);
    });

    const contractMap = new Map();
    (contracts || []).forEach((contract: any) => {
      contractMap.set(contract.id, contract);
    });

    // Aggregate data by writer
    const writerSummary: Record<string, any> = {};
    const projectsByStoryId = new Map<string, Set<string>>(); // Track which writers are associated with each story

    // Process negotiations
    (negotiations || []).forEach((negotiation: any) => {
      const writerName = negotiation.writer_producer_name || "Unknown";
      const story = storyMap.get(negotiation.story_id);

      if (!writerSummary[writerName]) {
        writerSummary[writerName] = {
          writer_name: writerName,
          total_negotiated: 0,
          total_contracted: 0,
          total_paid: 0,
          outstanding_balance: 0,
          project_count: 0,
          story_ids: new Set(),
        };
      }

      writerSummary[writerName].total_negotiated += parseFloat(negotiation.agreed_price || "0");

      // Track story for deduplication
      if (story?.story_id) {
        writerSummary[writerName].story_ids.add(story.story_id);
      }
    });

    // Process contracts with ALL payment schedules
    (contracts || []).forEach((contract: any) => {
      const story = storyMap.get(contract.story_id);

      // Get ALL payment schedules for this contract (not just first one)
      const contractPaymentSchedules = (paymentSchedules || []).filter(
        (ps: any) => ps.contract_id === contract.id
      );

      // If no payment schedules, attribute to "Unknown"
      if (contractPaymentSchedules.length === 0) {
        const writerName = "Unknown";

        if (!writerSummary[writerName]) {
          writerSummary[writerName] = {
            writer_name: writerName,
            total_negotiated: 0,
            total_contracted: 0,
            total_paid: 0,
            outstanding_balance: 0,
            project_count: 0,
            story_ids: new Set(),
          };
        }

        writerSummary[writerName].total_contracted += parseFloat(contract.total_value || "0");

        if (story?.story_id) {
          writerSummary[writerName].story_ids.add(story.story_id);
        }
      } else {
        // Distribute contract value across all payment schedules equally
        const valuePerWriter = parseFloat(contract.total_value || "0") / contractPaymentSchedules.length;

        contractPaymentSchedules.forEach((ps: any) => {
          const writerName = ps.writer_producer_name || "Unknown";

          if (!writerSummary[writerName]) {
            writerSummary[writerName] = {
              writer_name: writerName,
              total_negotiated: 0,
              total_contracted: 0,
              total_paid: 0,
              outstanding_balance: 0,
              project_count: 0,
              story_ids: new Set(),
            };
          }

          writerSummary[writerName].total_contracted += valuePerWriter;

          // Track story for deduplication
          if (story?.story_id) {
            writerSummary[writerName].story_ids.add(story.story_id);
          }
        });
      }
    });

    // Process payments
    (payments || []).forEach((payment: any) => {
      const paymentSchedule = paymentScheduleMap.get(payment.payment_schedule_id);

      if (!paymentSchedule) {
        console.warn('Payment without payment schedule:', payment.id);
        return;
      }

      const writerName = paymentSchedule.writer_producer_name || "Unknown";

      if (!writerSummary[writerName]) {
        writerSummary[writerName] = {
          writer_name: writerName,
          total_negotiated: 0,
          total_contracted: 0,
          total_paid: 0,
          outstanding_balance: 0,
          project_count: 0,
          story_ids: new Set(),
        };
      }

      writerSummary[writerName].total_paid += parseFloat(payment.net_amount || "0");
    });

    // Calculate outstanding balances and project counts
    Object.keys(writerSummary).forEach((writerName) => {
      const writer = writerSummary[writerName];

      // Project count = unique story_ids for this writer
      writer.project_count = writer.story_ids.size;

      // Remove story_ids Set before sending to client (not JSON serializable)
      delete writer.story_ids;

      // Outstanding = max(contracted, negotiated) - paid
      const committed = Math.max(writer.total_contracted, writer.total_negotiated);
      writer.outstanding_balance = committed - writer.total_paid;
    });

    // Convert to array and sort by total committed amount (descending)
    const summaryArray = Object.values(writerSummary).sort((a: any, b: any) => {
      const aCommitted = Math.max(a.total_contracted, a.total_negotiated);
      const bCommitted = Math.max(b.total_contracted, b.total_negotiated);
      return bCommitted - aCommitted;
    });

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

    console.log('Aggregated totals:', totals);

    return NextResponse.json({
      summary: summaryArray,
      totals,
    });
  } catch (error) {
    console.error("Error in writer financial summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
