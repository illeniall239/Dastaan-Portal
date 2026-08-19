import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getApprovedCallReportIds } from "@/lib/contract-terms/approved-call-reports";

export const dynamic = "force-dynamic";

function slotGroup(slot: string | null): "8PM" | "7/9PM" | null {
  if (slot === "8:00 PM") return "8PM";
  if (slot === "7:00 PM" || slot === "9:00 PM") return "7/9PM";
  return null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const year = new Date().getFullYear();

    // Parallel fetches
    const [
      { data: targets },
      { data: callReports },
      { data: teams },
      approvedIds,
    ] = await Promise.all([
      admin
        .from("annual_targets")
        .select("team_id, slot_group, target_count")
        .eq("year", year),
      admin
        .from("call_reports")
        .select("id, team_id, target_slot, working_title, writer_name, genre, content_type")
        .eq("meeting_type", "call_report")
        .is("archived_at", null),
      admin
        .from("teams")
        .select("id, name, team_head:users!teams_team_head_id_fkey(name)"),
      getApprovedCallReportIds(admin),
    ]);

    // Build team display name map
    const teamNameMap = new Map<string, string>();
    for (const t of teams || []) {
      const head = t.team_head
        ? Array.isArray(t.team_head)
          ? t.team_head[0]
          : t.team_head
        : null;
      teamNameMap.set(
        t.id,
        head?.name ? `Team ${head.name.split(" ")[0]}` : t.name
      );
    }

    // Build target map: teamId → { "8PM": n, "7/9PM": n }
    const targetMap = new Map<string, { "8PM": number; "7/9PM": number }>();
    for (const t of targets || []) {
      if (!targetMap.has(t.team_id))
        targetMap.set(t.team_id, { "8PM": 0, "7/9PM": 0 });
      targetMap.get(t.team_id)![t.slot_group as "8PM" | "7/9PM"] =
        t.target_count;
    }

    // Count call_reports per team per slot group
    const approvedSet = new Set(approvedIds);
    const achievedMap = new Map<
      string,
      { "8PM": number; "7/9PM": number; null: number }
    >();
    const approvedMap = new Map<
      string,
      { "8PM": number; "7/9PM": number; null: number }
    >();

    // Per-team project lists for drilldown
    const teamProjects = new Map<string, Array<{ id: string; title: string; writer: string; slot: string | null; slotGroup: string | null; approved: boolean }>>();

    for (const cr of callReports || []) {
      const sg = slotGroup(cr.target_slot);
      const key = sg || "null";
      const tid = cr.team_id;

      if (!achievedMap.has(tid))
        achievedMap.set(tid, { "8PM": 0, "7/9PM": 0, null: 0 });
      achievedMap.get(tid)![key as "8PM" | "7/9PM" | "null"]++;

      const isApproved = approvedSet.has(cr.id);
      if (isApproved) {
        if (!approvedMap.has(tid))
          approvedMap.set(tid, { "8PM": 0, "7/9PM": 0, null: 0 });
        approvedMap.get(tid)![key as "8PM" | "7/9PM" | "null"]++;
      }

      if (!teamProjects.has(tid)) teamProjects.set(tid, []);
      teamProjects.get(tid)!.push({
        id: cr.id,
        title: cr.working_title || "Untitled",
        writer: cr.writer_name || "—",
        slot: cr.target_slot,
        slotGroup: sg,
        approved: isApproved,
      });
    }

    // Build per-team rows (only teams that have targets)
    const teamIds = [...targetMap.keys()];
    const rows = teamIds
      .map((tid) => {
        const tgt = targetMap.get(tid) || { "8PM": 0, "7/9PM": 0 };
        const ach = achievedMap.get(tid) || { "8PM": 0, "7/9PM": 0, null: 0 };
        const apr = approvedMap.get(tid) || { "8PM": 0, "7/9PM": 0, null: 0 };

        return {
          teamId: tid,
          teamName: teamNameMap.get(tid) || "Unknown",
          target8pm: tgt["8PM"],
          target7_9pm: tgt["7/9PM"],
          targetTotal: tgt["8PM"] + tgt["7/9PM"],
          achieved8pm: ach["8PM"],
          achieved7_9pm: ach["7/9PM"],
          achievedTotal: ach["8PM"] + ach["7/9PM"] + ach["null"],
          approved8pm: apr["8PM"],
          approved7_9pm: apr["7/9PM"],
          approvedTotal: apr["8PM"] + apr["7/9PM"] + apr["null"],
          diff8pm: ach["8PM"] - tgt["8PM"],
          diff7_9pm: ach["7/9PM"] - tgt["7/9PM"],
          diffTotal: ach["8PM"] + ach["7/9PM"] + ach["null"] - tgt["8PM"] - tgt["7/9PM"],
          projects: teamProjects.get(tid) || [],
        };
      })
      .sort((a, b) => a.teamName.localeCompare(b.teamName));

    // Totals
    const totals = {
      target8pm: rows.reduce((s, r) => s + r.target8pm, 0),
      target7_9pm: rows.reduce((s, r) => s + r.target7_9pm, 0),
      targetTotal: rows.reduce((s, r) => s + r.targetTotal, 0),
      achieved8pm: rows.reduce((s, r) => s + r.achieved8pm, 0),
      achieved7_9pm: rows.reduce((s, r) => s + r.achieved7_9pm, 0),
      achievedTotal: rows.reduce((s, r) => s + r.achievedTotal, 0),
      approved8pm: rows.reduce((s, r) => s + r.approved8pm, 0),
      approved7_9pm: rows.reduce((s, r) => s + r.approved7_9pm, 0),
      approvedTotal: rows.reduce((s, r) => s + r.approvedTotal, 0),
      diff8pm: 0,
      diff7_9pm: 0,
      diffTotal: 0,
    };
    totals.diff8pm = totals.achieved8pm - totals.target8pm;
    totals.diff7_9pm = totals.achieved7_9pm - totals.target7_9pm;
    totals.diffTotal = totals.achievedTotal - totals.targetTotal;

    // Approved summary (50% and 100% of target)
    const approvedSummary = {
      inHand8pm: totals.achieved8pm,
      inHand7_9pm: totals.achieved7_9pm,
      inHandTotal: totals.achievedTotal,
      approved8pm: totals.approved8pm,
      approved7_9pm: totals.approved7_9pm,
      approvedTotal: totals.approvedTotal,
      inWriting8pm: totals.achieved8pm - totals.approved8pm,
      inWriting7_9pm: totals.achieved7_9pm - totals.approved7_9pm,
      inWritingTotal: totals.achievedTotal - totals.approvedTotal,
      target50pct8pm: Math.ceil(totals.target8pm / 2),
      target50pct7_9pm: Math.ceil(totals.target7_9pm / 2),
      target50pctTotal: Math.ceil(totals.targetTotal / 2),
      behind50pct8pm: totals.approved8pm - Math.ceil(totals.target8pm / 2),
      behind50pct7_9pm:
        totals.approved7_9pm - Math.ceil(totals.target7_9pm / 2),
      behind50pctTotal:
        totals.approvedTotal - Math.ceil(totals.targetTotal / 2),
      behind100pct8pm: totals.approved8pm - totals.target8pm,
      behind100pct7_9pm: totals.approved7_9pm - totals.target7_9pm,
      behind100pctTotal: totals.approvedTotal - totals.targetTotal,
    };

    return NextResponse.json({
      success: true,
      year,
      teams: rows,
      totals,
      approvedSummary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check role
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["admin", "management", "programmer"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { year, teamId, slotGroup: sg, targetCount } = body;

    if (!year || !teamId || !sg || targetCount == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("annual_targets")
      .upsert(
        {
          year,
          team_id: teamId,
          slot_group: sg,
          target_count: targetCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "year,team_id,slot_group" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
