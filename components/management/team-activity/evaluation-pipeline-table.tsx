"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, AlertTriangle, Clock } from "lucide-react";
import { TeamBadge } from "@/components/shared/team-badge";

interface PipelineItem {
  id: string;
  call_report_id: string;
  working_title: string;
  team: { name: string; team_type: string } | null;
  evaluation_status: string;
  evaluation_deadline: string | null;
  required_evaluators: number;
  completed_evaluations: number;
  progress_pct: number;
  pending_evaluators: number;
  is_overdue: boolean;
  is_near_deadline: boolean;
  created_at: string;
}

type FilterType = "all" | "pending" | "in_progress" | "overdue";

interface EvaluationPipelineTableProps {
  data: PipelineItem[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600 border-slate-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    accepted: "bg-teal-100 text-teal-700 border-teal-200",
    needs_improvement: "bg-amber-100 text-amber-700 border-amber-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    completed_after_deadline: "bg-purple-100 text-purple-700 border-purple-200",
  };
  const label: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    accepted: "Accepted",
    needs_improvement: "Needs Work",
    rejected: "Rejected",
    completed_after_deadline: "Late",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${map[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {label[status] || status}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8">{pct}%</span>
    </div>
  );
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "overdue", label: "Overdue" },
];

export function EvaluationPipelineTable({ data }: EvaluationPipelineTableProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = data.filter(item => {
    if (filter === "overdue") return item.is_overdue;
    if (filter === "pending") return item.evaluation_status === "pending";
    if (filter === "in_progress") return item.evaluation_status === "in_progress";
    return true;
  });

  const overdueCnt = data.filter(d => d.is_overdue).length;

  return (
    <Card>
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Evaluation Pipeline
          </CardTitle>
          <div className="flex items-center gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  filter === f.key
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
                {f.key === "overdue" && overdueCnt > 0 && (
                  <span className={`ml-1 text-[10px] font-bold ${filter === "overdue" ? "text-red-200" : "text-red-600"}`}>
                    {overdueCnt}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-3">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            No items found.
          </div>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-slate-50 sticky top-0 z-10">
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium sticky left-0 z-20 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.06)]">Call Report</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Team</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Progress</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Status</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Deadline</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(item => (
                  <tr
                    key={item.id}
                    className={
                      item.is_overdue
                        ? "bg-red-50 hover:bg-red-100/50"
                        : item.is_near_deadline
                        ? "bg-amber-50 hover:bg-amber-100/50"
                        : "hover:bg-slate-50"
                    }
                  >
                    <td className={`px-4 py-2.5 sticky left-0 z-[9] shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${item.is_overdue ? "bg-red-50" : item.is_near_deadline ? "bg-amber-50" : "bg-white"}`}>
                      <div>
                        <p className="font-medium text-slate-800 leading-tight">{item.working_title}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{item.call_report_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {item.team ? (
                        <TeamBadge team={item.team as any} size="sm" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col items-center gap-1">
                        <ProgressBar pct={item.progress_pct} />
                        <span className="text-[10px] text-slate-400">
                          {item.completed_evaluations}/{item.required_evaluators}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={item.evaluation_status} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.evaluation_deadline ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            {item.is_overdue && <AlertTriangle className="h-3 w-3 text-red-500" />}
                            {item.is_near_deadline && !item.is_overdue && <Clock className="h-3 w-3 text-amber-500" />}
                            <span className={
                              item.is_overdue ? "text-red-600 font-medium" :
                              item.is_near_deadline ? "text-amber-600 font-medium" :
                              "text-slate-600"
                            }>
                              {formatDate(item.evaluation_deadline)}
                            </span>
                          </div>
                          {item.is_overdue && (
                            <span className="text-[10px] text-red-500 font-medium">Overdue</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.pending_evaluators > 0 ? (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                          {item.pending_evaluators}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
