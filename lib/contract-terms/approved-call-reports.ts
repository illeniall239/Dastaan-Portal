/**
 * Server-side utility to compute approved call_report_ids directly from
 * story_approvals + evaluator_forms (team heads), bypassing evaluation_logs.
 *
 * This handles both:
 *  - New approvals (where evaluation_logs.final_decision is correctly set)
 *  - Legacy approvals (where evaluation_logs row was never created/updated)
 */
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";

export async function getApprovedCallReportIds(
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<string[]> {
  // 1. Fetch all story_approvals
  const { data: allApprovals } = await adminClient
    .from("story_approvals")
    .select("call_report_id, decision, approver_type, user_id");

  if (!allApprovals || allApprovals.length === 0) return [];

  // 2. Fetch user emails (to identify mandatory approvers by email)
  const userIds = [...new Set(allApprovals.map((a) => a.user_id))];
  const { data: users } = await adminClient
    .from("users")
    .select("id, email")
    .in("id", userIds);

  const userEmailMap: Record<string, string> = {};
  for (const u of users || []) userEmailMap[u.id] = u.email;

  // 3. Group approvals by call_report_id
  const byCallReport = new Map<string, typeof allApprovals>();
  for (const a of allApprovals) {
    const list = byCallReport.get(a.call_report_id) || [];
    list.push(a);
    byCallReport.set(a.call_report_id, list);
  }

  // 4. Fetch positive evaluator_forms from team heads as implicit third approval
  const { data: positiveEvals } = await adminClient
    .from("evaluator_forms")
    .select("call_report_id, evaluator_id")
    .eq("decision", "approve")
    .not("submitted_at", "is", null);

  // 5. Identify which evaluators are team heads
  const evalIds = [...new Set((positiveEvals || []).map((e) => e.evaluator_id))];
  let teamHeadIds = new Set<string>();
  if (evalIds.length > 0) {
    const { data: teams } = await adminClient
      .from("teams")
      .select("team_head_id")
      .in("team_head_id", evalIds);
    teamHeadIds = new Set((teams || []).map((t) => t.team_head_id));
  }

  // Map: call_report_id → has a positive team-head evaluation
  const teamHeadApprovedCrs = new Set<string>();
  for (const e of positiveEvals || []) {
    if (teamHeadIds.has(e.evaluator_id)) {
      teamHeadApprovedCrs.add(e.call_report_id);
    }
  }

  // 6. Compute which call_reports have met the threshold
  const approvedIds: string[] = [];
  for (const [crId, approvals] of byCallReport.entries()) {
    const rejected = approvals.some(
      (a) =>
        a.approver_type === "management" &&
        a.decision === "rejected" &&
        MANDATORY_APPROVER_EMAILS.includes(userEmailMap[a.user_id] as (typeof MANDATORY_APPROVER_EMAILS)[number])
    );
    if (rejected) continue;

    const allMandatoryApproved = MANDATORY_APPROVER_EMAILS.every((email) =>
      approvals.some(
        (a) =>
          a.approver_type === "management" &&
          a.decision === "approved" &&
          userEmailMap[a.user_id] === email
      )
    );

    const hasThirdApproval =
      approvals.some((a) => a.approver_type !== "management" && a.decision === "approved") ||
      teamHeadApprovedCrs.has(crId);

    if (allMandatoryApproved && hasThirdApproval) {
      approvedIds.push(crId);
    }
  }

  return approvedIds;
}
