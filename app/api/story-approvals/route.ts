import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";
import { createNotifications, getUserIdsByRoles, excludeUserFromList } from "@/lib/notifications/server";

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

    // Fetch the latest revision for this call report (determines the "current round")
    const { data: latestRevision } = await supabase
      .from("call_report_revisions")
      .select("id, revision_number")
      .eq("call_report_id", callReportId)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const currentRevisionId = latestRevision?.id ?? null;

    // Fetch all approvals (no join — user_id FK points to auth.users, not public.users)
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
    const allApprovals = (rawApprovals || []).map((a) => ({
      ...a,
      user: userMap[a.user_id] || null,
    }));

    // Split into current round vs history
    const currentApprovals = allApprovals.filter((a) =>
      currentRevisionId === null
        ? a.revision_id === null
        : a.revision_id === currentRevisionId
    );
    const historicalApprovals = allApprovals.filter((a) =>
      currentRevisionId === null
        ? a.revision_id !== null
        : a.revision_id !== currentRevisionId
    );

    // Build approvalHistory grouped by revision_id
    const historicalRevisionIds = [
      ...new Set(historicalApprovals.map((a) => a.revision_id).filter(Boolean)),
    ] as string[];
    let revisionNumberMap: Record<string, number> = {};
    if (historicalRevisionIds.length > 0) {
      const { data: historicalRevisions } = await supabase
        .from("call_report_revisions")
        .select("id, revision_number")
        .in("id", historicalRevisionIds);
      for (const r of historicalRevisions || []) {
        revisionNumberMap[r.id] = r.revision_number;
      }
    }

    // Group historical by revision
    const historyByRevision = new Map<string, typeof currentApprovals>();
    for (const a of historicalApprovals) {
      const key = a.revision_id ?? "base";
      const list = historyByRevision.get(key) || [];
      list.push(a);
      historyByRevision.set(key, list);
    }
    const approvalHistory = [...historyByRevision.entries()].map(([revId, approvalsForRev]) => ({
      revisionId: revId === "base" ? null : revId,
      revisionNumber: revId === "base" ? 0 : (revisionNumberMap[revId] ?? null),
      approvals: approvalsForRev,
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
    const isMandatoryApprover = MANDATORY_APPROVER_EMAILS.includes(currentUser?.email || "");
    const isProgrammer = currentUser?.role === "programmer";
    const isManagement = currentUser?.role === "management";
    const canApprove = isMandatoryApprover || isTeamHead || isProgrammer || isManagement;

    // Compute approval status using CURRENT ROUND approvals only
    const approvedList = currentApprovals.filter((a) => a.decision === "approved");
    const rejectedList = currentApprovals.filter((a) => a.decision === "rejected");

    // Only Humera & Salman's votes count toward threshold — filter by email
    const mandatoryApprovals = approvedList.filter(
      (a) => a.approver_type === "management" && MANDATORY_APPROVER_EMAILS.includes(a.user?.email || "")
    );
    const mandatoryRejections = rejectedList.filter(
      (a) => a.approver_type === "management" && MANDATORY_APPROVER_EMAILS.includes(a.user?.email || "")
    );
    const managementApproved = mandatoryApprovals.length >= MANDATORY_APPROVER_EMAILS.length;
    const managementRejected = mandatoryRejections.length > 0;

    const thirdApprovals = approvedList.filter((a) => a.approver_type !== "management");
    const thirdApproved = thirdApprovals.length >= 1;

    const isFullyApproved = managementApproved && thirdApproved;
    const isRejected = managementRejected;

    // Check current user's existing approval in current round
    const currentUserApproval = currentApprovals.find((a) => a.user_id === user.id) || null;

    return NextResponse.json({
      data: {
        approvals: currentApprovals,
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
        currentRevisionId,
        approvalHistory,
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

    // Determine approver type
    let approverType: string;
    const isMandatoryApprover = MANDATORY_APPROVER_EMAILS.includes(currentUser.email);

    if (isMandatoryApprover || currentUser.role === "management") {
      // All management votes stored as "management" — full audit trail
      // Threshold logic filters by mandatory approver emails to determine what counts
      approverType = "management";
    } else if (currentUser.role === "programmer") {
      approverType = "programmer";
    } else if (currentUser.role === "evaluator") {
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

    // Auto-detect current revision (determines which round this approval belongs to)
    const { data: latestRevision } = await supabase
      .from("call_report_revisions")
      .select("id")
      .eq("call_report_id", call_report_id)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const revisionId = latestRevision?.id ?? null;

    // Manual check-then-insert/update (upsert doesn't work with partial unique indexes)
    let approvalQuery = supabase
      .from("story_approvals")
      .select("id")
      .eq("call_report_id", call_report_id)
      .eq("user_id", user.id);
    if (revisionId) {
      approvalQuery = approvalQuery.eq("revision_id", revisionId);
    } else {
      approvalQuery = approvalQuery.is("revision_id", null);
    }
    const { data: existingApproval } = await approvalQuery.maybeSingle();

    let approval: any;
    if (existingApproval) {
      const { data: updated, error } = await supabase
        .from("story_approvals")
        .update({
          decision,
          notes: notes || null,
          approver_type: approverType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingApproval.id)
        .select("*")
        .single();
      if (error) {
        console.error("Error updating approval:", error);
        return NextResponse.json({ error: "Failed to submit approval" }, { status: 500 });
      }
      approval = updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("story_approvals")
        .insert({
          call_report_id,
          user_id: user.id,
          revision_id: revisionId,
          decision,
          notes: notes || null,
          approver_type: approverType,
        })
        .select("*")
        .single();
      if (error) {
        console.error("Error inserting approval:", error);
        return NextResponse.json({ error: "Failed to submit approval" }, { status: 500 });
      }
      approval = inserted;
    }

    // Use admin client to bypass RLS for story status updates and lookups
    const adminClient = createAdminClient();
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

      const recipientIds = (mandatoryUsers || []).map((u) => u.id);
      const storyTitle = callReport?.working_title || callReport?.call_report_id || call_report_id;
      const approverName = currentUser.name || currentUser.email;

      if (recipientIds.length > 0) {
        await createNotifications(
          recipientIds,
          "info",
          `${approverName} evaluated a story — your review is needed`,
          `"${storyTitle}" has been ${decision === "approved" ? "approved" : "rejected"} by evaluator ${approverName}. Please review and submit your management decision.`,
          "call_report",
          call_report_id,
          user.id
        );
      } else {
        console.warn("[story-approvals] No mandatory approver users found for emails:", MANDATORY_APPROVER_EMAILS);
      }
    }

    // Notify the call report creator when management approves/rejects
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

    // After insert/update, check threshold using CURRENT ROUND approvals only
    let currentRoundQuery = supabase
      .from("story_approvals")
      .select("decision, approver_type, user_id")
      .eq("call_report_id", call_report_id);
    if (revisionId) {
      currentRoundQuery = currentRoundQuery.eq("revision_id", revisionId);
    } else {
      currentRoundQuery = currentRoundQuery.is("revision_id", null);
    }
    const { data: allApprovalsRaw } = await currentRoundQuery;

    if (allApprovalsRaw) {
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

      const approved = allApprovals.filter((a) => a.decision === "approved");
      const managementApproved = approved.filter((a) => a.approver_type === "management");
      const mandatoryEmailSet = new Set<string>(MANDATORY_APPROVER_EMAILS);
      const managementRejected = allApprovals.filter(
        (a) => a.decision === "rejected" && a.approver_type === "management"
          && mandatoryEmailSet.has(a.user?.email || "")
      );
      const thirdApproved = approved.filter((a) => a.approver_type !== "management");

      const mandatoryEmails = new Set(MANDATORY_APPROVER_EMAILS);
      const mandatoryApprovedEmails = managementApproved
        .filter(
          (a) =>
            a.user?.email &&
            mandatoryEmails.has(a.user.email as (typeof MANDATORY_APPROVER_EMAILS)[number])
        )
        .map((a) => a.user?.email);
      const allMandatoryApproved = MANDATORY_APPROVER_EMAILS.every((email) =>
        mandatoryApprovedEmails.includes(email)
      );

      let effectiveThirdApproved = thirdApproved.length;
      if (effectiveThirdApproved === 0) {
        const { data: positiveEvals } = await adminClient
          .from("evaluator_forms")
          .select("evaluator_id")
          .eq("call_report_id", call_report_id)
          .eq("decision", "approve")
          .not("submitted_at", "is", null);

        if (positiveEvals && positiveEvals.length > 0) {
          const evalIds = positiveEvals.map((e) => e.evaluator_id);
          const { data: teamHeads } = await adminClient
            .from("teams")
            .select("team_head_id")
            .in("team_head_id", evalIds);
          if (teamHeads && teamHeads.length > 0) {
            effectiveThirdApproved = 1;
          }
        }
      }

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
        // Notify full team of the rejection milestone
        try {
          const teamIds = await getUserIdsByRoles(["management", "content_manager", "content_creator"]);
          const recipients = excludeUserFromList(teamIds, user.id);
          const storyTitle = callReport?.working_title || call_report_id;
          if (recipients.length > 0) {
            await createNotifications(
              recipients,
              "error",
              `Story rejected: ${storyTitle}`,
              `"${storyTitle}" has been rejected in the approval process.`,
              "call_report",
              call_report_id,
              user.id
            );
          }
        } catch { /* non-fatal */ }

      } else if (allMandatoryApproved && effectiveThirdApproved >= 1) {
        await upsertEvalLog("approved");
        if (callReport?.story_id) {
          await adminClient
            .from("stories")
            .update({ status: "approved" })
            .eq("id", callReport.story_id);
        }
        // Notify full team of the approval milestone
        try {
          const teamIds = await getUserIdsByRoles(["management", "content_manager", "content_creator"]);
          const recipients = excludeUserFromList(teamIds, user.id);
          const storyTitle = callReport?.working_title || call_report_id;
          if (recipients.length > 0) {
            await createNotifications(
              recipients,
              "success",
              `Story fully approved: ${storyTitle}`,
              `"${storyTitle}" has been approved by all required parties and is ready for the next stage.`,
              "call_report",
              call_report_id,
              user.id
            );
          }
        } catch { /* non-fatal */ }
      }
    }

    return NextResponse.json({ data: approval });
  } catch (error) {
    console.error("Error in story-approvals POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
