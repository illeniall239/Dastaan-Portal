import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Activity,
  Briefcase,
} from "lucide-react";
import { ManagementHeader } from "@/components/management/management-header";
import { ExportButton } from "@/components/management/export-button";
import { getExecutiveSummary, getDepartmentWorkload } from "@/lib/management/server";
import {
  CriticalAlertsSection,
  TeamPerformanceSection,
  ScriptingEpisodeSection,
  PipelineOverviewSection,
  EvaluatorPerformanceSection,
  ContractTermsSection,
  WriterFinancialSection,
  TeamProjectsSection,
} from "@/components/management/dashboard-sections";
import {
  CriticalAlertsSkeleton,
  TeamPerformanceSkeleton,
  ScriptingPhaseSkeleton,
  PipelineOverviewSkeleton,
  EvaluatorPerformanceSkeleton,
  ContractTermsSkeleton,
  WriterFinancialSkeleton,
  TeamProjectsSkeleton,
} from "@/components/management/skeletons";
import { ErrorBoundary } from "@/components/errors/error-boundary";
import { SectionErrorFallback } from "@/components/errors/section-error-fallback";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";
import { createAdminClient } from "@/lib/supabase/admin";

function SummaryCardWrapper({ href, isViewer, children }: { href: string; isViewer: boolean; children: React.ReactNode }) {
  if (isViewer) return <div>{children}</div>;
  return <Link href={href}>{children}</Link>;
}

function SummaryCards({ user, summary, formatCurrency, isMandatoryApprover, mandatoryApproverPendingCount, pendingApprovals }: {
  user: { role: string };
  summary: { totalActiveProjects: number; pipelineValue: number; activeContracts: number; overduePayments: number; weeklyActivities: number };
  formatCurrency: (n: number) => string;
  isMandatoryApprover: boolean;
  mandatoryApproverPendingCount: number;
  pendingApprovals: number;
}) {
  const isViewer = user.role === "management_viewer";
  const cardClass = (border: string) =>
    `bg-white border-l-4 ${border} rounded-lg shadow-sm ${isViewer ? "" : "hover:border-gray-300 transition-colors cursor-pointer"}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-3">
      <SummaryCardWrapper href="/management/active-projects" isViewer={isViewer}>
        <Card className={cardClass("border-l-blue-500")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Active Projects</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{summary.totalActiveProjects}</div>
            <p className="text-xs text-gray-500 mt-1">Stories in development pipeline</p>
          </CardContent>
        </Card>
      </SummaryCardWrapper>

      <SummaryCardWrapper href="/management/pipeline-value" isViewer={isViewer}>
        <Card className={cardClass("border-l-green-500")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.pipelineValue)}</div>
            <p className="text-xs text-gray-500 mt-1">Total contracts + negotiations</p>
          </CardContent>
        </Card>
      </SummaryCardWrapper>

      <SummaryCardWrapper href="/management/contracts" isViewer={isViewer}>
        <Card className={cardClass("border-l-orange-500")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Active Contracts</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{summary.activeContracts}</div>
            <p className="text-xs text-gray-500 mt-1">Contracts currently in effect</p>
          </CardContent>
        </Card>
      </SummaryCardWrapper>

      <SummaryCardWrapper href="/management/payments/overdue" isViewer={isViewer}>
        <Card className={cardClass("border-l-red-500")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{summary.overduePayments}</div>
            <p className="text-xs text-gray-500 mt-1">Payments requiring attention</p>
          </CardContent>
        </Card>
      </SummaryCardWrapper>

      <SummaryCardWrapper href="/management/weekly-activities" isViewer={isViewer}>
        <Card className={cardClass("border-l-purple-500")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Weekly Activities</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{summary.weeklyActivities}</div>
            <p className="text-xs text-gray-500 mt-1">Actions taken this week</p>
          </CardContent>
        </Card>
      </SummaryCardWrapper>

      {!isViewer && (
        <Link href="/management/pending-evaluations">
          <Card className={cardClass("border-l-indigo-500")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
              <CardTitle className="text-sm font-medium text-gray-600">Approval Tracking</CardTitle>
              <Clock className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl font-bold text-gray-900">
                {isMandatoryApprover ? mandatoryApproverPendingCount : pendingApprovals}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isMandatoryApprover ? "Awaiting your review" : "Awaiting committee decision"}
              </p>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}

// Add Next.js caching
export const revalidate = 300; // 5 minutes for better performance

export default async function ManagementDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Redirect if not management, executive, or admin
  if (!["admin", "management", "executive", "management_viewer"].includes(user.role)) {
    redirect("/dashboard");
  }

  // Fetch ONLY critical above-the-fold data
  // Other sections will stream in via Suspense
  const [summary, workload] = await Promise.all([
    getExecutiveSummary(),
    getDepartmentWorkload(),
  ]);

  // Detect if current user is a mandatory approver (Humera / Salman)
  const isMandatoryApprover = MANDATORY_APPROVER_EMAILS.includes(user.email ?? "");

  let mandatoryApproverPendingCount = 0;
  if (isMandatoryApprover) {
    try {
      const adminClient = createAdminClient();

      // Get all evaluated call_report_ids
      const { data: viewRows } = await adminClient
        .from("call_report_evaluations_with_type")
        .select("call_report_id")
        .not("call_report_id", "is", null);

      const evaluatedIds = [
        ...new Set((viewRows || []).map((r: any) => r.call_report_id as string)),
      ];

      if (evaluatedIds.length > 0) {
        // IDs this user has already voted on
        const { data: myApprovals } = await adminClient
          .from("story_approvals")
          .select("call_report_id")
          .eq("user_id", user.id)
          .in("call_report_id", evaluatedIds);

        const myApprovedIds = new Set((myApprovals || []).map((a: any) => a.call_report_id));
        mandatoryApproverPendingCount = evaluatedIds.filter((id) => !myApprovedIds.has(id)).length;
      }
    } catch {
      // Non-fatal — fall back to 0
    }
  }

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <ManagementHeader userName={user.name} userRole={user.role} />

      {/* Executive Summary Stats - Critical, loaded immediately */}
      <div id="executive-summary" className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Executive Summary
          </h2>
          <div className="no-print">
            <ExportButton
              elementId="executive-summary"
              filename="executive-summary"
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <SummaryCards
          user={user}
          summary={summary}
          formatCurrency={formatCurrency}
          isMandatoryApprover={isMandatoryApprover}
          mandatoryApproverPendingCount={mandatoryApproverPendingCount}
          pendingApprovals={workload.executives.pendingApprovals}
        />
      </div>

      {/* Below-the-fold sections - Stream in progressively */}
      <ErrorBoundary fallback={<SectionErrorFallback title="Critical Alerts" />}>
        <Suspense fallback={<CriticalAlertsSkeleton />}>
          <CriticalAlertsSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback title="Team-wise Projects" />}>
        <Suspense fallback={<TeamProjectsSkeleton />}>
          <TeamProjectsSection />
        </Suspense>
      </ErrorBoundary>

      {user.role !== "management_viewer" && (
        <ErrorBoundary fallback={<SectionErrorFallback title="Team Performance" />}>
          <Suspense fallback={<TeamPerformanceSkeleton />}>
            <TeamPerformanceSection />
          </Suspense>
        </ErrorBoundary>
      )}

      {user.role !== "management_viewer" && (
        <ErrorBoundary fallback={<SectionErrorFallback title="Scripting & Episode Evaluation" />}>
          <Suspense fallback={<ScriptingPhaseSkeleton />}>
            <ScriptingEpisodeSection />
          </Suspense>
        </ErrorBoundary>
      )}

      <ErrorBoundary fallback={<SectionErrorFallback title="Pipeline Overview" />}>
        <Suspense fallback={<PipelineOverviewSkeleton />}>
          <PipelineOverviewSection />
        </Suspense>
      </ErrorBoundary>

      {user.role !== "management_viewer" && (
        <ErrorBoundary fallback={<SectionErrorFallback title="Evaluator Performance" />}>
          <Suspense fallback={<EvaluatorPerformanceSkeleton />}>
            <EvaluatorPerformanceSection />
          </Suspense>
        </ErrorBoundary>
      )}

      <ErrorBoundary fallback={<SectionErrorFallback title="Contract Terms" />}>
        <Suspense fallback={<ContractTermsSkeleton />}>
          <ContractTermsSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback title="Writer Financials" />}>
        <Suspense fallback={<WriterFinancialSkeleton />}>
          <WriterFinancialSection />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
