"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, DollarSign, Briefcase, AlertTriangle, Activity, Clock, Loader2 } from "lucide-react";

interface SummaryData {
  totalActiveProjects: number;
  pipelineValue: number;
  activeContracts: number;
  overduePayments: number;
  weeklyActivities: number;
}

interface Props {
  summary: SummaryData;
  pendingApprovals: number;
  isMandatoryApprover?: boolean;
  mandatoryApproverPendingCount?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

const METRIC_LABELS: Record<string, string> = {
  active_projects: "Active Projects",
  pipeline_value: "Pipeline Value",
  active_contracts: "Active Contracts",
  overdue_payments: "Overdue Payments",
  weekly_activities: "Weekly Activities",
  pending_approvals: "Approval Tracking",
};

function DrillDownDialog({ metric, onClose }: { metric: string; onClose: () => void }) {
  const [data, setData] = useState<{ columns: { key: string; label: string }[]; rows: Record<string, any>[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch(`/api/management/executive-drill-down?metric=${metric}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData({ columns: res.columns, rows: res.rows });
        else setData({ columns: [], rows: [] });
      })
      .catch(() => setData({ columns: [], rows: [] }))
      .finally(() => setLoading(false));
  }, [metric]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{METRIC_LABELS[metric] || metric}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No items found</div>
        ) : (
          <div className="overflow-auto flex-1 -mx-6 px-6">
            <div className="text-xs text-gray-500 mb-2">{data.rows.length} item{data.rows.length !== 1 ? "s" : ""}</div>
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="border-b border-gray-200 bg-gray-50">
                  {data.columns.map((col) => (
                    <th key={col.key} className="text-left py-2 px-3 font-medium text-gray-500 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    {data.columns.map((col) => (
                      <td key={col.key} className="py-1.5 px-3 text-gray-700 whitespace-nowrap">
                        {row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ExecutiveSummaryCards({ summary, pendingApprovals, isMandatoryApprover, mandatoryApproverPendingCount }: Props) {
  const [drillDown, setDrillDown] = useState<string | null>(null);

  const cardClass = (border: string) =>
    `bg-white border-l-4 ${border} rounded-lg shadow-sm hover:border-gray-300 transition-colors cursor-pointer`;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-3">
        <Card className={cardClass("border-l-blue-500")} onClick={() => setDrillDown("active_projects")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Active Projects</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{summary.totalActiveProjects}</div>
            <p className="text-xs text-gray-500 mt-1">Stories in development pipeline</p>
          </CardContent>
        </Card>

        <Card className={cardClass("border-l-green-500")} onClick={() => setDrillDown("pipeline_value")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.pipelineValue)}</div>
            <p className="text-xs text-gray-500 mt-1">Total contracts + negotiations</p>
          </CardContent>
        </Card>

        <Card className={cardClass("border-l-orange-500")} onClick={() => setDrillDown("active_contracts")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Active Contracts</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{summary.activeContracts}</div>
            <p className="text-xs text-gray-500 mt-1">Contracts currently in effect</p>
          </CardContent>
        </Card>

        <Card className={cardClass("border-l-red-500")} onClick={() => setDrillDown("overdue_payments")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{summary.overduePayments}</div>
            <p className="text-xs text-gray-500 mt-1">Payments requiring attention</p>
          </CardContent>
        </Card>

        <Card className={cardClass("border-l-purple-500")} onClick={() => setDrillDown("weekly_activities")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Weekly Activities</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">{summary.weeklyActivities}</div>
            <p className="text-xs text-gray-500 mt-1">Actions taken this week</p>
          </CardContent>
        </Card>

        <Card className={cardClass("border-l-indigo-500")} onClick={() => setDrillDown("pending_approvals")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium text-gray-600">Approval Tracking</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {isMandatoryApprover ? (mandatoryApproverPendingCount ?? 0) : pendingApprovals}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isMandatoryApprover ? "Awaiting your review" : "Awaiting committee decision"}
            </p>
          </CardContent>
        </Card>
      </div>

      {drillDown && (
        <DrillDownDialog
          key={drillDown}
          metric={drillDown}
          onClose={() => setDrillDown(null)}
        />
      )}
    </>
  );
}
