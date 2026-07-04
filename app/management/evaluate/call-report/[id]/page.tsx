import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EvaluatorEvaluationForm } from "@/app/evaluator/evaluate/[callReportId]/evaluation-form-prefilled";
import { getAttachmentsForEntityServer } from "@/lib/attachments/server";
import { getEvaluationProgress } from "@/lib/evaluations/assignments";
import { getDetailedOneLinersByCallReport } from "@/lib/detailed-one-liner/server";

interface Writer {
  writer_id: string;
  writer_name: string;
  writer_email?: string;
  writer_phone?: string;
  display_order: number;
}

interface CallReport {
  id: string;
  call_report_id: string;
  working_title: string;
  writer_name: string;
  contact_email: string;
  logline: string;
  short_synopsis?: string;
  episodic_synopsis?: string;
  category: string;
  writers?: Writer[];
}

export default async function ManagementEvaluateCallReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision_id?: string }>;
}) {
  const resolvedParams = await params;
  const { id: callReportId } = resolvedParams;
  const resolvedSearchParams = await searchParams;
  const revisionId = resolvedSearchParams.revision_id || undefined;

  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Ensure user has management role (admin, management, or executive)
  if (!["admin", "management", "executive"].includes(user.role)) {
    redirect("/unauthorized");
  }

  // Fetch the call report data and check if already evaluated
  let callReport: CallReport | null = null;
  let attachments: any[] = [];
  let progress = null;
  let detailedOneLiner: any = null;
  let existingEvaluation: any = null;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Check if user has already evaluated this call report (scoped by revision)
    let evalQuery = supabase
      .from("evaluator_forms")
      .select("*")
      .eq("evaluator_id", user.id)
      .eq("call_report_id", callReportId);

    if (revisionId) {
      evalQuery = evalQuery.eq("revision_id", revisionId);
    } else {
      evalQuery = evalQuery.is("revision_id", null);
    }

    const { data: evaluationData } = await evalQuery.maybeSingle();
    existingEvaluation = evaluationData;

    // Fetch the call report
    const { data, error } = await supabase
      .from("call_reports")
      .select("*")
      .eq("id", callReportId)
      .single();

    if (error) {
      console.error("Error fetching call report:", error);
      redirect("/management");
    }

    callReport = data as unknown as CallReport;

    // Fetch writers for this call report from the junction table
    const { data: writersData } = await supabase
      .from("call_report_writers")
      .select(`
        writer_id,
        writer_email,
        writer_phone,
        display_order,
        writer:writers(name)
      `)
      .eq("call_report_id", callReportId)
      .order("display_order", { ascending: true });

    // Transform writers data
    if (writersData && writersData.length > 0) {
      callReport.writers = writersData.map((w: any) => ({
        writer_id: w.writer_id,
        writer_name: w.writer?.name || "",
        writer_email: w.writer_email,
        writer_phone: w.writer_phone,
        display_order: w.display_order ?? 0,
      }));
    }

    // Fetch attachments for the call report
    try {
      attachments = await getAttachmentsForEntityServer("call_report", callReportId);
    } catch (attachmentError) {
      console.error("Error fetching attachments:", attachmentError);
    }

    // Fetch evaluation progress
    try {
      progress = await getEvaluationProgress(callReportId);
    } catch (progressError) {
      console.error("Error fetching evaluation progress:", progressError);
    }

    // Fetch detailed one-liner for this call report
    try {
      const detailedOneLiners = await getDetailedOneLinersByCallReport(callReportId);
      detailedOneLiner = detailedOneLiners[0] || null;
    } catch (detailedOneLinerError) {
      console.error("Error fetching detailed one-liner:", detailedOneLinerError);
    }
  } catch (error) {
    console.error("Error in management evaluation page:", error);
    redirect("/management");
  }

  if (!callReport) {
    redirect("/management");
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <EvaluatorEvaluationForm
        callReport={callReport}
        userId={user.id}
        userName={user.name || "Management"}
        attachments={attachments}
        progress={progress}
        detailedOneLiner={detailedOneLiner}
        isManagementEvaluation={true}
        existingEvaluation={existingEvaluation}
        portalPrefix="management"
        revisionId={revisionId}
      />
    </div>
  );
}
