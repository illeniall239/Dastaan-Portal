import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";
import { createNotifications } from "@/lib/notifications/server";

export const dynamic = "force-dynamic";

// GET: Fetch approvals for a call report + compute approval status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callReportId = request.nextUrl.searchParams.get("call_report_id");
    if (!callReportId) {
      return NextResponse.json({ error: "call_report_id is required" }, { status: 400 });
    }

    // Fetch approvals (no join — user_id FK points to auth.users, not public.users)
    const { data: rawApprovals, error } = await supabase
      .from("story_approvals")
      .select("*")
      .eq("call_report_id", callReportId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching approvals:", error);
      return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
    }

    // Fetch user info separately from public.users
    const adminClient = createAdminClient();
    const approverUserIds = [...new Set((rawApprovals || []).map((a) => a.user_id))];
    let userMap: Record<string, { name: string; email: string }> = {};
    if (approverUserIds.length > 0) {
      const { data: approverUsers } = await adminClient
        .from("users")
        .select("id, name, email")
        .in("id", approverUserIds);
      for (const u of approverUsers || []) {
        userMap[u.id] = { name: u.name, email: u.email };
      }
    }
    const approvals = (rawApprovals || []).map((a) => ({
      ...a,
      user: userMap[a.user_id] || null,
    }));

    // Get current user info to determine if they can approve
    const { data: currentUser } = await adminClient
      .from("users")
      .select("id, name, role, email, team_id")
      .eq("id", user.id)
      .single();

    // Check if user is a team head
    let isTeamHead = false;
    if (currentUser?.team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("team_head_id")
        .eq("id", currentUser.team_id)
        .single();
      isTeamHead = team?.team_head_id === user.id;
    }

    // Determine if current user can approve
    // Only: Humera/Salman (mandatory), evaluator team heads, or programmers
    const isMandatoryApprover = MANDATORY_APPROVER_EMAILS.includes(currentUser?.email || "");
    const isProgrammer = currentUser?.role === "programmer";
    const canApprove = isMandatoryApprover || isTeamHead || isProgrammer;

    // Compute approval status
    const approvedList = (approvals || []).filter(a => a.decision === "approved");
    const rejectedList = (approvals || []).filter(a => a.decision === "rejected");

    // Check mandatory approvers
    const mandatoryApprovals = approvedList.filter(a => a.approver_type === "management");
    const mandatoryRejections = rejectedList.filter(a => a.approver_type === "management");
    const managementApproved = mandatoryApprovals.length >= MANDATORY_APPROVER_EMAILS.length;
    const managementRejected = mandatoryRejections.length > 0;

    // Check 3rd approver (non-management)
    const thirdApprovals = approvedList.filter(a => a.approver_type !== "management");
    const thirdApproved = thirdApprovals.length >= 1;

    const isFullyApproved = managementApproved && thirdApproved;
    const isRejected = managementRejected;

    // Check current user's existing approval
    const currentUserApproval = (approvals || []).find(a => a.user_id === user.id) || null;

    return NextResponse.json({
      data: {
        approvals: approvals || [],
        totalApprovals: approvedList.length,
        totalRejections: rejectedList.length,
        managementApproved,
        managementRejected,
        thirdApproved,
        isFullyApproved,
        isRejected,
        canCurrentUserApprove: canApprove,
        currentUserApproval,
        isCurrentUserMandatoryApprover: isMandatoryApprover,
        currentUserName: currentUser?.name || null,
      },
    });
  } catch (error) {
    console.error("Error in story-approvals GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Submit an approval/rejection
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { call_report_id, decision, notes } = body;

    if (!call_report_id || !decision) {
      return NextResponse.json({ error: "call_report_id and decision are required" }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });
    }

    // Get current user info
    const { data: currentUser } = await supabase
      .from("users")
      .select("id, role, email, name, team_id")
      .eq("id", user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine approver type — only specific people can approve
    let approverType: string;
    const isMandatoryApprover = MANDATORY_APPROVER_EMAILS.includes(currentUser.email);

    if (isMandatoryApprover) {
      // Only Humera and Salman — no other management/admin users
      approverType = "management";
    } else if (currentUser.role === "programmer") {
      approverType = "programmer";
    } else if (currentUser.role === "evaluator") {
      // Evaluators must be team heads to approve
      let isTeamHead = false;
      if (currentUser.team_id) {
        const { data: team } = await supabase
          .from("teams")
          .select("team_head_id")
          .eq("id", currentUser.team_id)
          .single();
        isTeamHead = team?.team_head_id === user.id;
      }

      if (!isTeamHead) {
        return NextResponse.json({ error: "You are not authorized to approve this story" }, { status: 403 });
      }
      approverType = "evaluator";
    } else {
      return NextResponse.json({ error: "You are not authorized to approve this story" }, { status: 403 });
    }

    // Upsert the approval
    const { data: approval, error } = await supabase
      .from("story_approvals")
      .upsert(
        {
          call_report_id,
          user_id: user.id,
          decision,
          notes: notes || null,
          approver_type: approverType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "call_report_id,user_id" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error submitting approval:", error);
      return NextResponse.json({ error: "Failed to submit approval" }, { status: 500 });
    }

    // Use admin client to bypass RLS for story status updates and lookups
    const adminClient = createAdminClient();
    // Fetch the call report's linked story_id and title (used for notifications + threshold)
    const { data: callReport } = await adminClient
      .from("call_reports")
      .select("story_id, working_title, call_report_id, created_by")
      .eq("id", call_report_id)
      .single();

    // Notify Humera & Salman when an evaluator team head votes
    if (approverType === "evaluator") {
      const { data: mandatoryUsers, error: usersError } = await adminClient
        .from("users")
        .select("id, email")
        .in("email", MANDATORY_APPROVER_EMAILS);

      if (usersError) {
        console.error("[story-approvals] Error fetching mandatory approver users:", usersError);
      }

      console.log("[story-approvals] Mandatory approver users found:", mandatoryUsers);

      const recipientIds = (mandatoryUsers || []).map(u => u.id);
      const storyTitle = callReport?.working_title || callReport?.call_report_id || call_report_id;
      const approverName = currentUser.name || currentUser.email;

      if (recipientIds.length > 0) {
        const notifResult = await createNotifications(
          recipientIds,
          "info",
          `${approverName} evaluated a story — your review is needed`,
          `"${storyTitle}" has been ${decision === "approved" ? "approved" : "rejected"} by evaluator ${approverName}. Please review and submit your management decision.`,
          "call_report",
          call_report_id,
          user.id
        );
        console.log("[story-approvals] Notifications sent:", notifResult?.length ?? 0);
      } else {
        console.warn("[story-approvals] No mandatory approver users found for emails:", MANDATORY_APPROVER_EMAILS);
      }
    }

    // Notify the call report creator (evaluator team head) when management approves/rejects
    if (approverType === "management") {
      const creatorId = callReport?.created_by;
      if (creatorId && creatorId !== user.id) {
        const storyTitle = callReport?.working_title || callReport?.call_report_id || call_report_id;
        const approverName = currentUser.name || currentUser.email;
        const decisionLabel = decision === "approved" ? "approved" : "rejected";
        const notesText = notes?.trim() ? ` — Notes: "${notes.trim()}"` : "";

        await createNotifications(
          [creatorId],
          decision === "approved" ? "success" : "warning",
          `Management ${decisionLabel} your evaluation`,
          `"${storyTitle}" was ${decisionLabel} by ${approverName}.${notesText}`,
          "call_report",
          call_report_id,
          user.id
        );
      }
    }

    // After upsert, check if approval threshold is met
    const { data: allApprovalsRaw } = await supabase
      .from("story_approvals")
      .select("decision, approver_type, user_id")
      .eq("call_report_id", call_report_id);

    if (allApprovalsRaw) {
      // Fetch emails for approvers to check mandatory approver status
      const approverIds = [...new Set(allApprovalsRaw.map((a) => a.user_id))];
      const { data: approverInfos } = await adminClient
        .from("users")
        .select("id, email")
        .in("id", approverIds);
      const approverEmailMap: Record<string, string> = {};
      for (const u of approverInfos || []) approverEmailMap[u.id] = u.email;

      const allApprovals = allApprovalsRaw.map((a) => ({
        ...a,
        user: { email: approverEmailMap[a.user_id] || "" },
      }));

      const approved = allApprovals.filter(a => a.decision === "approved");
      const managementApproved = approved.filter(a => a.approver_type === "management");
      const managementRejected = allApprovals.filter(a => a.decision === "rejected" && a.approver_type === "management");
      const thirdApproved = approved.filter(a => a.approver_type !== "management");

      // Check mandatory approvers specifically
      const mandatoryEmails = new Set(MANDATORY_APPROVER_EMAILS);
      const mandatoryApprovedEmails = managementApproved
        .filter(a => a.user?.email && mandatoryEmails.has(a.user.email as (typeof MANDATORY_APPROVER_EMAILS)[number]))
        .map(a => a.user?.email);
      const allMandatoryApproved = MANDATORY_APPROVER_EMAILS.every(email =>
        mandatoryApprovedEmails.includes(email)
      );

      // If no explicit story_approvals from non-management, also count positive evaluator_forms
      // from team heads — the team head's evaluation IS their implicit approval
      let effectiveThirdApproved = thirdApproved.length;
      if (effectiveThirdApproved === 0) {
        const { data: positiveEvals } = await adminClient
          .from("evaluator_forms")
          .select("evaluator_id")
          .eq("call_report_id", call_report_id)
          .eq("decision", "approve")
          .not("submitted_at", "is", null);

        if (positiveEvals && positiveEvals.length > 0) {
          const evalIds = positiveEvals.map(e => e.evaluator_id);
          const { data: teamHeads } = await adminClient
            .from("teams")
            .select("team_head_id")
            .in("team_head_id", evalIds);
          if (teamHeads && teamHeads.length > 0) {
            effectiveThirdApproved = 1;
          }
        }
      }

      // Helper: upsert evaluation_logs final_decision (UPDATE does nothing if no row exists)
      const upsertEvalLog = async (finalDecision: "approved" | "rejected") => {
        const { data: existingLog } = await adminClient
          .from("evaluation_logs")
          .select("id")
          .eq("call_report_id", call_report_id)
          .maybeSingle();
        if (existingLog) {
          await adminClient
            .from("evaluation_logs")
            .update({ final_decision: finalDecision })
            .eq("id", existingLog.id);
        } else {
          await adminClient
            .from("evaluation_logs")
            .insert({ call_report_id, final_decision: finalDecision });
        }
      };

      if (managementRejected.length > 0) {
        await upsertEvalLog("rejected");
        if (callReport?.story_id) {
          await adminClient
            .from("stories")
            .update({ status: "rejected" })
            .eq("id", callReport.story_id);
        }
      } else if (allMandatoryApproved && effectiveThirdApproved >= 1) {
        await upsertEvalLog("approved");
        if (callReport?.story_id) {
          await adminClient
            .from("stories")
            .update({ status: "approved" })
            .eq("id", callReport.story_id);
        }
      }
    }

    return NextResponse.json({ data: approval });
  } catch (error) {
    console.error("Error in story-approvals POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
