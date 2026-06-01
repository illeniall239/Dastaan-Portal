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

export default async function GcmEvaluatePage({
  params,
  searchParams,
}: {
  params: Promise<{ callReportId: string }>;
  searchParams: Promise<{ crossTeamShareId?: string; revision_id?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { callReportId } = resolvedParams;
  const crossTeamShareId = resolvedSearchParams.crossTeamShareId;
  const revisionId = resolvedSearchParams.revision_id;

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "gcm") {
    redirect("/unauthorized");
  }

  let callReport: CallReport | null = null;
  let attachments: any[] = [];
  let progress = null;
  let detailedOneLiner: any = null;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: userProfile } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single();

    let reportQuery = supabase
      .from("call_reports")
      .select("*")
      .eq("id", callReportId);

    if (!crossTeamShareId && userProfile?.team_id) {
      reportQuery = reportQuery.eq("team_id", userProfile.team_id);
    }

    const { data, error } = await reportQuery.single();

    if (error) {
      console.error("Error fetching call report:", error);
      redirect("/gcm/evaluations-list");
    }

    callReport = data as unknown as CallReport;

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

    if (writersData && writersData.length > 0) {
      callReport.writers = writersData.map((w: any) => ({
        writer_id: w.writer_id,
        writer_name: w.writer?.name || "",
        writer_email: w.writer_email,
        writer_phone: w.writer_phone,
        display_order: w.display_order ?? 0,
      }));
    }

    try {
      attachments = await getAttachmentsForEntityServer("call_report", callReportId);
    } catch (attachmentError) {
      console.error("Error fetching attachments:", attachmentError);
    }

    try {
      progress = await getEvaluationProgress(callReportId);
    } catch (progressError) {
      console.error("Error fetching evaluation progress:", progressError);
    }

    try {
      const detailedOneLiners = await getDetailedOneLinersByCallReport(callReportId);
      detailedOneLiner = detailedOneLiners[0] || null;
    } catch (detailedOneLinerError) {
      console.error("Error fetching detailed one-liner:", detailedOneLinerError);
    }
  } catch (error) {
    console.error("Error in GCM evaluation page:", error);
    redirect("/gcm/evaluations-list");
  }

  if (!callReport) {
    redirect("/gcm/evaluations-list");
  }

  let crossTeamFromTeamName: string | undefined;
  if (crossTeamShareId) {
    try {
      const { createClient: createServerClient } = await import("@/lib/supabase/server");
      const supabaseServer = await createServerClient();
      const { data: share } = await supabaseServer
        .from('cross_team_shares')
        .select('from_team:teams!cross_team_shares_from_team_id_fkey (name)')
        .eq('id', crossTeamShareId)
        .single();
      crossTeamFromTeamName = (share as any)?.from_team?.name;
    } catch {
      // Non-critical
    }
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <EvaluatorEvaluationForm
        callReport={callReport}
        userId={user.id}
        userName={user.name || "GCM"}
        attachments={attachments}
        progress={progress}
        detailedOneLiner={detailedOneLiner}
        crossTeamShareId={crossTeamShareId}
        crossTeamFromTeamName={crossTeamFromTeamName}
        revisionId={revisionId}
        portalPrefix="gcm"
      />
    </div>
  );
}
