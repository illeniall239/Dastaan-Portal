import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectRatings } from "@/lib/management/project-ratings-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/management/approval-queue
 * Every active one-liner, split into pending (the current management user hasn't submitted a
 * story_approval yet) and reviewed. Management evaluates everything, whether or not anyone else
 * has evaluated it yet; evaluation counts/scores are shown where there are some.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!currentUser || !["management", "admin", "executive"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Step 1: every active one-liner, and the evaluations it has so far (if any)
    const [{ data: activeRows, error: activeErr }, { data: viewRows, error: viewErr }] = await Promise.all([
      adminClient
        .from("call_reports")
        .select("id")
        .eq("meeting_type", "call_report")
        .is("archived_at", null),
      adminClient
        .from("call_report_evaluations_with_type")
        .select("call_report_id, evaluator_id, average_score, submitted_at")
        .not("call_report_id", "is", null),
    ]);

    if (activeErr) throw new Error(`Failed to fetch one-liners: ${activeErr.message}`);
    if (viewErr) throw new Error(`Failed to fetch evaluations view: ${viewErr.message}`);

    // (named evaluatedIds historically: now all active one-liners, evaluated or not)
    const evaluatedIds = (activeRows || []).map((r) => r.id as string);

    if (evaluatedIds.length === 0) {
      return NextResponse.json({ success: true, callReports: [], reviewedCallReports: [] });
    }

    // Batch query discussion counts for all evaluated call reports
    const { data: discussionRows } = await adminClient
      .from("call_report_discussions")
      .select("call_report_id")
      .in("call_report_id", evaluatedIds);

    const discussionCountMap: Record<string, number> = {};
    for (const row of discussionRows || []) {
      const crid = row.call_report_id as string;
      discussionCountMap[crid] = (discussionCountMap[crid] || 0) + 1;
    }

    // This manager's own evaluation per one-liner (their latest, original or a revision)
    const myScore = new Map<string, { score: number | null; at: string }>();
    for (const row of viewRows || []) {
      if (row.evaluator_id !== user.id) continue;
      const id = row.call_report_id as string;
      const at = row.submitted_at || "";
      const prev = myScore.get(id);
      if (!prev || at > prev.at) myScore.set(id, { score: row.average_score != null ? Number(row.average_score) : null, at });
    }

    // Build per-call-report stats from the view rows
    const statsByCallReport: Record<string, { scores: number[]; latestAt: string }> = {};
    for (const row of viewRows || []) {
      const id = row.call_report_id as string;
      if (!statsByCallReport[id]) statsByCallReport[id] = { scores: [], latestAt: row.submitted_at || "" };
      if (row.average_score) statsByCallReport[id].scores.push(Number(row.average_score));
      if (row.submitted_at && row.submitted_at > statsByCallReport[id].latestAt) {
        statsByCallReport[id].latestAt = row.submitted_at;
      }
    }

    // Batch-fetch attachments for all evaluated call reports
    const { data: attachmentRows } = await adminClient
      .from("attachments")
      .select("id, entity_id, file_name, file_path")
      .eq("entity_type", "call_report")
      .in("entity_id", evaluatedIds);

    const attachmentsByCallReport = new Map<string, { id: string; fileName: string; filePath: string }[]>();
    for (const att of attachmentRows || []) {
      const list = attachmentsByCallReport.get(att.entity_id) || [];
      list.push({ id: att.id, fileName: att.file_name, filePath: att.file_path });
      attachmentsByCallReport.set(att.entity_id, list);
    }

    // Revision counts (used by both the reviewed and the pending lists)
    const revisionCountMap: Record<string, number> = {};
    const { data: revisionRows } = await adminClient
      .from("call_report_revisions")
      .select("call_report_id")
      .in("call_report_id", evaluatedIds);
    for (const row of revisionRows || []) {
      const crid = row.call_report_id as string;
      revisionCountMap[crid] = (revisionCountMap[crid] || 0) + 1;
    }

    // Step 2: IDs the current user has already acted on in story_approvals
    const { data: myApprovals } = await adminClient
      .from("story_approvals")
      .select("call_report_id")
      .eq("user_id", user.id)
      .in("call_report_id", evaluatedIds);

    const myApprovedIds = new Set((myApprovals || []).map((a) => a.call_report_id));
    const pendingIds = evaluatedIds.filter((id) => !myApprovedIds.has(id));

    // Step 3a: Fetch reviewed items (already voted on) with their decisions
    const reviewedIds = evaluatedIds.filter((id) => myApprovedIds.has(id));
    const { overall } = await getProjectRatings();
    let reviewedResult: any[] = [];

    if (reviewedIds.length > 0) {
      const { data: myDecisions } = await adminClient
        .from("story_approvals")
        .select("call_report_id, decision, notes, created_at")
        .eq("user_id", user.id)
        .in("call_report_id", reviewedIds);

      const decisionMap = new Map(
        (myDecisions || []).map((d) => [d.call_report_id, d])
      );

      const { data: reviewedCRs } = await adminClient
        .from("call_reports")
        .select("id, working_title, call_report_id, created_at, original_submission_date")
        .in("id", reviewedIds)
        .order("created_at", { ascending: false });

      reviewedResult = (reviewedCRs || []).map((cr: any) => {
        const dec = decisionMap.get(cr.id);
        const stats = statsByCallReport[cr.id];
        const scores = stats?.scores || [];
        return {
          id: cr.id,
          workingTitle: cr.working_title || cr.call_report_id,
          callReportId: cr.call_report_id,
          createdAt: cr.created_at,
          averageScore: overall.get(cr.id)?.oneLiner?.score ?? null, // the project's rating (Team Overview rule)
          lastEvaluatedAt: stats?.latestAt || null,
          evaluationCount: scores.length,
          myDecision: dec?.decision ?? null,
          myNotes: dec?.notes ?? null,
          decidedAt: dec?.created_at ?? null,
          discussionCount: discussionCountMap[cr.id] || 0,
          revisionCount: revisionCountMap[cr.id] || 0,
          originalSubmissionDate: cr.original_submission_date || cr.created_at || null,
          attachments: attachmentsByCallReport.get(cr.id) || [],
        evaluatedByMe: myScore.has(cr.id),
        myScore: myScore.get(cr.id)?.score ?? null,
        };
      });
    }

    if (pendingIds.length === 0) {
      return NextResponse.json({ success: true, callReports: [], reviewedCallReports: reviewedResult });
    }

    // Step 3b: Fetch pending call report details
    const { data: callReports, error: crErr } = await adminClient
      .from("call_reports")
      .select("id, working_title, call_report_id, created_at, original_submission_date")
      .in("id", pendingIds)
      .order("created_at", { ascending: false });

    if (crErr) throw new Error(`Failed to fetch call_reports: ${crErr.message}`);

    // Shape the response
    const result = (callReports || []).map((cr: any) => {
      const stats = statsByCallReport[cr.id];
      const scores = stats?.scores || [];
      return {
        id: cr.id,
        workingTitle: cr.working_title || cr.call_report_id,
        callReportId: cr.call_report_id,
        createdAt: cr.created_at,
        averageScore: overall.get(cr.id)?.oneLiner?.score ?? null, // the project's rating (Team Overview rule)
        lastEvaluatedAt: stats?.latestAt || null,
        evaluationCount: scores.length,
        discussionCount: discussionCountMap[cr.id] || 0,
        revisionCount: revisionCountMap[cr.id] || 0,
        originalSubmissionDate: cr.original_submission_date || cr.created_at || null,
        attachments: attachmentsByCallReport.get(cr.id) || [],
        evaluatedByMe: myScore.has(cr.id),
        myScore: myScore.get(cr.id)?.score ?? null,
      };
    });

    return NextResponse.json({ success: true, callReports: result, reviewedCallReports: reviewedResult });
  } catch (error) {
    console.error("Error in approval-queue GET:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval queue" },
      { status: 500 }
    );
  }
}
