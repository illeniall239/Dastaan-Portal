import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, Briefcase, AlertTriangle, Activity, Clock } from "lucide-react";
import { getExecutiveSummary, getDepartmentWorkload } from "@/lib/management/server";
import { ExportButton } from "@/components/management/export-button";

export async function ExecutiveSummarySection() {
  const [summary, workload] = await Promise.all([
    getExecutiveSummary(),
    getDepartmentWorkload()
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div id="executive-summary" className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
        <div className="no-print">
          <ExportButton
            elementId="executive-summary"
            filename="executive-summary"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Active Projects
            </CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{summary.totalActiveProjects}</div>
            <p className="text-xs text-blue-700 mt-1">
              Stories in development pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900">
              Pipeline Value
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {formatCurrency(summary.pipelineValue)}
            </div>
            <p className="text-xs text-green-700 mt-1">
              Total contracts + negotiations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">
              Active Contracts
            </CardTitle>
            <Briefcase className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{summary.activeContracts}</div>
            <p className="text-xs text-orange-700 mt-1">
              Contracts currently in effect
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-900">
              Overdue Payments
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{summary.overduePayments}</div>
            <p className="text-xs text-red-700 mt-1">
              Payments requiring attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">
              Weekly Activities
            </CardTitle>
            <Activity className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{summary.weeklyActivities}</div>
            <p className="text-xs text-purple-700 mt-1">
              Actions taken this week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">
              Pending Approvals
            </CardTitle>
            <Clock className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900">{workload.executives.pendingApprovals}</div>
            <p className="text-xs text-indigo-700 mt-1">
              Awaiting committee decision
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
