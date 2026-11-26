import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { EvaluatorEvaluationForm } from "@/app/evaluator/evaluate/[callReportId]/evaluation-form-prefilled";
import { getAttachmentsForEntityServer } from "@/lib/attachments/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CallReport } from "@/types";

export const dynamic = "force-dynamic";

/**
 * The content team's view of their content head's evaluation of a one-liner (original or a revision):
 * exactly what the head sees on their own evaluation, read-only.
 */
export default async function ContentHeadEvaluationPage({
  params,
  searchParams,
}: {
  params: Promise<{ callReportId: string }>;
  searchParams: Promise<{ revision_id?: string }>;
}) {
  const { callReportId } = await params;
  const { revision_id: revisionId } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "content_creator" && user.role !== "content_manager") redirect("/content-department");

  const admin = createAdminClient();
  const { data: me } = await admin.from("users").select("team_id").eq("id", user.id).single();
  if (!me?.team_id) redirect("/content-department/one-liners");

  const [{ data: report }, { data: team }] = await Promise.all([
    admin.from("call_reports").select("*").eq("id", callReportId).eq("team_id", me.team_id).single(),
    admin.from("teams").select("team_head_id, head:users!teams_team_head_id_fkey(name)").eq("id", me.team_id).single(),
  ]);
  if (!report) redirect("/content-department/one-liners");
  const callReport = report as unknown as CallReport;

  let evalQuery = admin.from("evaluator_forms").select("*").eq("call_report_id", callReportId)
    .eq("evaluator_id", team?.team_head_id ?? "");
  evalQuery = revisionId ? evalQuery.eq("revision_id", revisionId) : evalQuery.is("revision_id", null);
  const { data: evaluation } = await evalQuery.maybeSingle();

  const head: any = Array.isArray(team?.head) ? team?.head[0] : team?.head;
  if (!evaluation) {
    return (
      <div className="mobile-container mobile-section max-w-4xl mx-auto">
        <Card className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            {head?.name ? `${head.name} hasn't` : "Your content head hasn't"} evaluated this version of &ldquo;{callReport.working_title}&rdquo; yet.
          </p>
          <BackButton fallbackHref="/content-department/one-liners" />
        </Card>
      </div>
    );
  }

  const { data: writersData } = await admin
    .from("call_report_writers")
    .select("writer_id, writer_email, writer_phone, display_order, writer:writers(name)")
    .eq("call_report_id", callReportId)
    .order("display_order", { ascending: true });
  if (writersData?.length) {
    callReport.writers = writersData.map((w: any) => ({
      writer_id: w.writer_id,
      writer_name: w.writer?.name || "",
      writer_email: w.writer_email,
      writer_phone: w.writer_phone,
      display_order: w.display_order ?? 0,
    })) as any;
  }
  let attachments: any[] = [];
  try {
    attachments = await getAttachmentsForEntityServer("call_report", callReportId);
  } catch {
    // Continue without attachments
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <EvaluatorEvaluationForm
        callReport={callReport}
        userId={user.id}
        userName={user.name || "User"}
        attachments={attachments}
        progress={null}
        detailedOneLiner={null}
        revisionId={revisionId}
        existingEvaluation={evaluation}
        viewOnly
        portalPrefix="content-department"
      />
    </div>
  );
}
