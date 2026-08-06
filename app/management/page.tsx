import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ManagementHeader } from "@/components/management/management-header";
import { ExportButton } from "@/components/management/export-button";
import { getExecutiveSummary, getDepartmentWorkload } from "@/lib/management/server";
import { ExecutiveSummaryCards } from "@/components/management/sections/executive-summary-cards";
import {
  TeamsOverviewSection,
  ActiveProjectsChartsSection,
  ContractTermsSection,
  WriterFinancialSection,
  RatingDifferentialSection,
  PendingByPersonSection,
  RatingComparisonSection,
  DeptOutputSection,
} from "@/components/management/dashboard-sections";
import {
  TeamProjectsSkeleton,
  ChartSkeleton,
  ContractTermsSkeleton,
  WriterFinancialSkeleton,
} from "@/components/management/skeletons";
import { ErrorBoundary } from "@/components/errors/error-boundary";
import { SectionErrorFallback } from "@/components/errors/section-error-fallback";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";
import { createAdminClient } from "@/lib/supabase/admin";


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
        <ExecutiveSummaryCards
          summary={summary}
          pendingApprovals={workload.executives.pendingApprovals}
          isMandatoryApprover={isMandatoryApprover}
          mandatoryApproverPendingCount={mandatoryApproverPendingCount}
        />
      </div>

      {/* Below-the-fold sections - Stream in progressively */}
      <ErrorBoundary fallback={<SectionErrorFallback title="Teams Overview" />}>
        <Suspense fallback={<TeamProjectsSkeleton />}>
          <TeamsOverviewSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback title="Pending by Person" />}>
        <Suspense fallback={<ChartSkeleton />}>
          <PendingByPersonSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback title="Active Projects" />}>
        <Suspense fallback={<ChartSkeleton />}>
          <ActiveProjectsChartsSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback title="Rating Differential" />}>
        <Suspense fallback={<ChartSkeleton />}>
          <RatingDifferentialSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback title="One-Liner vs Episode Ratings" />}>
        <Suspense fallback={<ChartSkeleton />}>
          <RatingComparisonSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback title="Content Dept Output" />}>
        <Suspense fallback={<ChartSkeleton />}>
          <DeptOutputSection />
        </Suspense>
      </ErrorBoundary>

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
