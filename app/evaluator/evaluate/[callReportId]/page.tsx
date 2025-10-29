import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EvaluatorEvaluationForm } from "./evaluation-form-prefilled";
import { exampleWriters } from "@/lib/mock/writers";
import { getAttachmentsForEntityServer } from "@/lib/attachments/server";
import { getEvaluationProgress } from "@/lib/evaluations/assignments";

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
  let writers: { id: string; name: string; email: string }[] = [];

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

    // Use the same example writers list as the writer engagement form
    writers = exampleWriters;
  } catch (error) {
    console.error("Error in evaluator evaluation page:", error);
    redirect("/evaluator/evaluations");
  }

  if (!callReport) {
    redirect("/evaluator/evaluations");
  }

  return (
    <div className="p-6 space-y-6">
      <EvaluatorEvaluationForm
        callReport={callReport}
        userId={user.id}
        userName={user.name || "Evaluator"}
        attachments={attachments}
        progress={progress}
        writers={writers}
      />
    </div>
  );
}