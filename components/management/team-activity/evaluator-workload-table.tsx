"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gauge, Pin } from "lucide-react";
import { useFreezeColumns } from "@/lib/hooks/useFreezeColumns";
import { TeamBadge } from "@/components/shared/team-badge";

interface WorkloadItem {
  evaluator_id: string;
  name: string;
  team: { name: string; team_type: string } | null;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
}

interface EvaluatorWorkloadTableProps {
  data: WorkloadItem[];
}

function CompletionBar({ completed, assigned }: { completed: number; assigned: number }) {
  const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-blue-500" : "bg-amber-500"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500">{pct}%</span>
    </div>
  );
}

export function EvaluatorWorkloadTable({ data }: EvaluatorWorkloadTableProps) {
  const [freezePanes, setFreezePanes] = useState(false);
  const freezeRef = useFreezeColumns(freezePanes, 1);
  const maxPending = Math.max(...data.map(d => d.pending), 1);

  return (
    <Card>
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Evaluator Workload
          </CardTitle>
          <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-7 text-xs px-2">
            <Pin className="h-3 w-3" />
            {freezePanes ? "Unfreeze" : "Freeze Panes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-3">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            No evaluator data found.
          </div>
        ) : (
          <div ref={freezeRef} className="overflow-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Evaluator</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Team</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Assigned</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Completed</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Pending</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50">Overdue</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wide text-slate-400 font-medium w-32 bg-slate-50">Load</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map(item => (
                  <tr
                    key={item.evaluator_id}
                    className={item.overdue > 0 ? "bg-red-50 hover:bg-red-100/50" : "hover:bg-slate-50"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-medium text-slate-600">
                            {item.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {item.team ? (
                        <TeamBadge team={item.team as any} size="sm" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-medium text-slate-700">{item.assigned}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-green-700 font-medium">{item.completed}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.pending > 0 ? (
                        <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold border ${
                          item.pending >= maxPending * 0.7
                            ? "bg-red-100 text-red-700 border-red-200"
                            : item.pending >= maxPending * 0.4
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-blue-100 text-blue-700 border-blue-200"
                        }`}>
                          {item.pending}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.overdue > 0 ? (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                          {item.overdue}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <CompletionBar completed={item.completed} assigned={item.assigned} />
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
