import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EvaluatorEvaluationForm } from "./evaluation-form-prefilled";
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
  usp: string;
  category: string;
  writers?: Writer[];
}

export default async function EvaluatorEvaluatePage({ 
  params 
}: { 
  params: Promise<{ callReportId: string }> 
}) {
  const resolvedParams = await params;
  const { callReportId } = resolvedParams;
  
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Ensure user has evaluator role
  if (user.role !== "evaluator") {
    redirect("/unauthorized");
  }

  // Fetch the call report data
  let callReport: CallReport | null = null;
  let attachments: any[] = [];
  let progress = null;
  let detailedOneLiner: any = null;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("call_reports")
      .select("*")
      .eq("id", callReportId)
      .single();

    if (error) {
      console.error("Error fetching call report:", error);
      redirect("/evaluator/evaluations");
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

    // Fetch attachments for the call report using the proper helper function
    try {
      attachments = await getAttachmentsForEntityServer("call_report", callReportId);
    } catch (attachmentError) {
      console.error("Error fetching attachments:", attachmentError);
      // Continue without attachments if there's an error
    }

    // Fetch evaluation progress
    try {
      progress = await getEvaluationProgress(callReportId);
    } catch (progressError) {
      console.error("Error fetching evaluation progress:", progressError);
      // Continue without progress if there's an error
    }

    // Fetch detailed one-liner for this call report
    try {
      const detailedOneLiners = await getDetailedOneLinersByCallReport(callReportId);
      detailedOneLiner = detailedOneLiners[0] || null;
    } catch (detailedOneLinerError) {
      console.error("Error fetching detailed one-liner:", detailedOneLinerError);
      // Continue without detailed one-liner if there's an error
    }
  } catch (error) {
    console.error("Error in evaluator evaluation page:", error);
    redirect("/evaluator/evaluations");
  }

  if (!callReport) {
    redirect("/evaluator/evaluations");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <EvaluatorEvaluationForm
        callReport={callReport}
        userId={user.id}
        userName={user.name || "Evaluator"}
        attachments={attachments}
        progress={progress}
        detailedOneLiner={detailedOneLiner}
      />
    </div>
  );
}