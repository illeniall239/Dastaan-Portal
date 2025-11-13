import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDetailedOneLinersByCallReport } from "@/lib/detailed-one-liner/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePenLine, AlertCircle } from "lucide-react";
import { DetailedOneLinerDisplay } from "@/components/evaluations/detailed-one-liner-display";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = {
  title: "Detailed One-Liner | Dastaan Portal",
  description: "View detailed one-liner analysis for call report",
};

export default async function CallReportDetailedOneLinerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["evaluator", "content_manager", "management", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch call report details
  const { data: callReport, error: callReportError } = await supabase
    .from("call_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (callReportError || !callReport) {
    console.error("Error fetching call report:", callReportError);
    redirect("/evaluator/call-reports");
  }

  // Fetch detailed one-liner for this call report
  const detailedOneLiners = await getDetailedOneLinersByCallReport(id);
  const detailedOneLiner = detailedOneLiners[0] || null;

  // Check if user can edit (owner or manager/admin)
  const canEdit =
    detailedOneLiner &&
    (detailedOneLiner.created_by === user.id ||
      ["content_manager", "admin"].includes(userData.role));

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackHref="/evaluator/call-reports" variant="outline" />
          {canEdit && detailedOneLiner && (
            <Button asChild variant="default" size="sm">
              <Link href={`/evaluator/detailed-one-liner/${detailedOneLiner.id}/edit`}>
                <FilePenLine className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>

        {/* Call Report Info */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Detailed One-Liner</h1>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>Call Report: {callReport.call_report_id}</span>
            <span>•</span>
            <span>{callReport.working_title}</span>
            <span>•</span>
            <span>Writer: {callReport.writer_name}</span>
          </div>
        </div>

        {/* Detailed One-Liner Display or Empty State */}
        {detailedOneLiner ? (
          <DetailedOneLinerDisplay detailedOneLiner={detailedOneLiner} />
        ) : (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-amber-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-amber-900">
                No Detailed One-Liner Logged
              </h3>
              <p className="text-sm text-amber-800 mb-6 text-center max-w-md">
                No detailed one-liner analysis has been created for this writer engagement report yet.
                You can log one now to provide comprehensive story analysis.
              </p>
              <Button asChild variant="default">
                <Link
                  href={`/evaluator/log-detailed-one-liner?callReportId=${id}`}
                >
                  <FilePenLine className="h-4 w-4 mr-2" />
                  Log Detailed One-Liner
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
