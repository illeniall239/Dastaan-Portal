import { createClient } from "@/lib/supabase/server";
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

    if (!userData || !["management", "admin"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all negotiations with agreed prices
    const { data: negotiations, error: negotiationsError } = await supabase
      .from("negotiations")
      .select(`
        id,
        writer_producer_name,
        agreed_price,
        status,
        stories!inner(
          id,
          story_id,
          title
        )
      `)
      .eq("status", "agreed");

    if (negotiationsError) {
      console.error("Error fetching negotiations:", negotiationsError);
      return NextResponse.json(
        { error: "Failed to fetch negotiations" },
        { status: 500 }
      );
    }

    // Fetch all contracts with total values
    const { data: contracts, error: contractsError } = await supabase
      .from("contracts")
      .select(`
        id,
        total_value,
        status,
        payment_schedules(
          id,
          writer_producer_name
        ),
        stories!inner(
          id,
          story_id,
          title
        )
      `)
      .in("status", ["active", "pending_signatures", "completed"]);

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
      return NextResponse.json(
        { error: "Failed to fetch contracts" },
        { status: 500 }
      );
    }

    // Fetch all payments
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        id,
        net_amount,
        status,
        payment_schedules!inner(
          id,
          writer_producer_name,
          contracts!inner(
            id,
            stories!inner(
              id,
              story_id,
              title
            )
          )
        )
      `)
      .eq("status", "paid");

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    // Aggregate data by writer
    const writerSummary: Record<string, any> = {};

    // Process negotiations
    negotiations?.forEach((negotiation: any) => {
      const writerName = negotiation.writer_producer_name || "Unknown";

      if (!writerSummary[writerName]) {
        writerSummary[writerName] = {
          writer_name: writerName,
          total_negotiated: 0,
          total_contracted: 0,
          total_paid: 0,
          outstanding_balance: 0,
          project_count: 0,
          projects: [],
        };
      }

      writerSummary[writerName].total_negotiated += parseFloat(negotiation.agreed_price || "0");
      writerSummary[writerName].project_count += 1;
      writerSummary[writerName].projects.push({
        type: "negotiation",
        id: negotiation.id,
        story_id: negotiation.stories?.story_id,
        title: negotiation.stories?.title,
        amount: parseFloat(negotiation.agreed_price || "0"),
      });
    });

    // Process contracts
    contracts?.forEach((contract: any) => {
      const writerName = contract.payment_schedules?.[0]?.writer_producer_name || "Unknown";

      if (!writerSummary[writerName]) {
        writerSummary[writerName] = {
          writer_name: writerName,
          total_negotiated: 0,
          total_contracted: 0,
          total_paid: 0,
          outstanding_balance: 0,
          project_count: 0,
          projects: [],
        };
      }

      writerSummary[writerName].total_contracted += parseFloat(contract.total_value || "0");

      // Check if this contract's story isn't already counted
      const existingProject = writerSummary[writerName].projects.find(
        (p: any) => p.story_id === contract.stories?.story_id
      );

      if (!existingProject) {
        writerSummary[writerName].project_count += 1;
      }

      writerSummary[writerName].projects.push({
        type: "contract",
        id: contract.id,
        story_id: contract.stories?.story_id,
        title: contract.stories?.title,
        amount: parseFloat(contract.total_value || "0"),
      });
    });

    // Process payments
    payments?.forEach((payment: any) => {
      const writerName = payment.payment_schedules?.writer_producer_name || "Unknown";

      if (!writerSummary[writerName]) {
        writerSummary[writerName] = {
          writer_name: writerName,
          total_negotiated: 0,
          total_contracted: 0,
          total_paid: 0,
          outstanding_balance: 0,
          project_count: 0,
          projects: [],
        };
      }

      writerSummary[writerName].total_paid += parseFloat(payment.net_amount || "0");
    });

    // Calculate outstanding balances
    Object.keys(writerSummary).forEach((writerName) => {
      const writer = writerSummary[writerName];
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
