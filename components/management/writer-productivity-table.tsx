"use client";

import { useState } from "react";
import { useFreezeColumns } from "@/lib/hooks/useFreezeColumns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Pin } from "lucide-react";
import type { WriterProductivity } from "@/lib/management/active-ideas-details";

interface WriterProductivityTableProps {
  writers: WriterProductivity[];
}

export function WriterProductivityTable({ writers }: WriterProductivityTableProps) {
  const [freezePanes, setFreezePanes] = useState(false);
  const freezeRef = useFreezeColumns(freezePanes);
  // Show first 10 writers
  const displayedWriters = writers.slice(0, 10);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Writer Productivity
          </CardTitle>
          <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-7 text-xs px-2">
            <Pin className="h-3 w-3" />
            {freezePanes ? "Unfreeze" : "Freeze Panes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {displayedWriters.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No writer data available
          </div>
        ) : (
          <div ref={freezeRef} className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700 bg-slate-50">Writer</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-center bg-slate-50">Projects</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-center bg-slate-50">Episodes</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-[140px] bg-slate-50">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedWriters.map((writer, index) => (
                  <TableRow key={writer.writerName} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {index + 1}
                        </span>
                        <span className="truncate max-w-[150px]">{writer.writerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                        {writer.projectCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">
                      <span className="text-green-600 font-medium">{writer.episodesDelivered}</span>
                      <span className="text-slate-400"> / </span>
                      <span>{writer.totalEpisodesAssigned}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={writer.completionRate}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs font-medium text-slate-600 w-10 text-right">
                          {writer.completionRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {writers.length > 10 && (
          <p className="text-xs text-slate-500 text-center mt-3">
            Showing 10 of {writers.length} writers
          </p>
        )}
      </CardContent>
    </Card>
  );
}
