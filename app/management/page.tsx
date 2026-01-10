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
import { ProductionMetricsCards } from "@/components/dashboard/production-metrics-cards";
import { getProductionMetrics } from "@/lib/production-metrics/server";
import {
  CriticalAlertsSection,
  TeamPerformanceSection,
  ScriptingEpisodeSection,
  PipelineOverviewSection,
  EvaluatorPerformanceSection,
  ContractTermsSection,
  WriterFinancialSection,
} from "@/components/management/dashboard-sections";
import {
  CriticalAlertsSkeleton,
  TeamPerformanceSkeleton,
  ScriptingPhaseSkeleton,
  PipelineOverviewSkeleton,
  EvaluatorPerformanceSkeleton,
  ContractTermsSkeleton,
  WriterFinancialSkeleton,
} from "@/components/management/skeletons";

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
  if (!["admin", "management", "executive"].includes(user.role)) {
    redirect("/dashboard");
  }

  // Fetch ONLY critical above-the-fold data
  // Other sections will stream in via Suspense
  const [summary, workload, productionMetrics] = await Promise.all([
    getExecutiveSummary(),
    getDepartmentWorkload(),
    getProductionMetrics(), // No team filter - global access for management
  ]);

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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <ManagementHeader userName={user.name} />

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-3">
          <Link href="/management/active-projects" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm font-medium text-blue-900">Active Projects</CardTitle>
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900">
                  {summary.totalActiveProjects}
                </div>
                <p className="text-xs text-blue-700 mt-1">Stories in development pipeline</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/management/pipeline-value" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm font-medium text-green-900">Pipeline Value</CardTitle>
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-900">
                  {formatCurrency(summary.pipelineValue)}
                </div>
                <p className="text-xs text-green-700 mt-1">Total contracts + negotiations</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/management/contracts" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm font-medium text-orange-900">
                  Active Contracts
                </CardTitle>
                <Briefcase className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-900">
                  {summary.activeContracts}
                </div>
                <p className="text-xs text-orange-700 mt-1">Contracts currently in effect</p>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/management/payments/overdue"
            className="transition-transform hover:scale-105"
          >
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm font-medium text-red-900">Overdue Payments</CardTitle>
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-900">
                  {summary.overduePayments}
                </div>
                <p className="text-xs text-red-700 mt-1">Payments requiring attention</p>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/management/weekly-activities"
            className="transition-transform hover:scale-105"
          >
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm font-medium text-purple-900">
                  Weekly Activities
                </CardTitle>
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-900">
                  {summary.weeklyActivities}
                </div>
                <p className="text-xs text-purple-700 mt-1">Actions taken this week</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/management/approvals" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-sm font-medium text-indigo-900">
                  Pending Approvals
                </CardTitle>
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-900">
                  {workload.executives.pendingApprovals}
                </div>
                <p className="text-xs text-indigo-700 mt-1">Awaiting committee decision</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Production Pipeline Metrics */}
      <div id="production-pipeline" className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
            Production Pipeline Overview
          </h2>
          <div className="no-print">
            <ExportButton
              elementId="production-pipeline"
              filename="production-pipeline"
              formats={["png", "pdf"]}
              compact
            />
          </div>
        </div>
        <ProductionMetricsCards metrics={productionMetrics} showAllMetrics={true} />
      </div>

      {/* Below-the-fold sections - Stream in progressively */}
      <Suspense fallback={<CriticalAlertsSkeleton />}>
        <CriticalAlertsSection />
      </Suspense>

      <Suspense fallback={<TeamPerformanceSkeleton />}>
        <TeamPerformanceSection />
      </Suspense>

      <Suspense fallback={<ScriptingPhaseSkeleton />}>
        <ScriptingEpisodeSection />
      </Suspense>

      <Suspense fallback={<PipelineOverviewSkeleton />}>
        <PipelineOverviewSection />
      </Suspense>

      <Suspense fallback={<EvaluatorPerformanceSkeleton />}>
        <EvaluatorPerformanceSection />
      </Suspense>

      <Suspense fallback={<ContractTermsSkeleton />}>
        <ContractTermsSection />
      </Suspense>

      <Suspense fallback={<WriterFinancialSkeleton />}>
        <WriterFinancialSection />
      </Suspense>
    </div>
  );
}
