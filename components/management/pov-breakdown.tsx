"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Project {
  id: string;
  title: string;
  writer: string;
  slot: string | null;
  teamName: string | null;
}

interface Segment {
  label: string;
  count: number;
  color: string;
  projects: Project[];
}

interface PovData {
  segments: Segment[];
  totalWithFocus: number;
  totalProjects: number;
  noDataYet: boolean;
}

function DrillDialog({ segment, onClose }: { segment: Segment; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{segment.label}</DialogTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {segment.count} {segment.count === 1 ? "project" : "projects"}
            </Badge>
          </div>
        </DialogHeader>
        <div className="overflow-auto flex-1 -mx-6 px-6">
          {segment.projects.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No projects</p>
          ) : (
            <div className="space-y-2">
              {segment.projects.map((p) => (
                <div key={p.id} className="border rounded-lg p-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.writer}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.teamName && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                        {p.teamName}
                      </Badge>
                    )}
                    {p.slot && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50">
                        {p.slot.replace(":00 ", "")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PovBreakdown() {
  const [data, setData] = useState<PovData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  useEffect(() => {
    fetch(`/api/management/pov-breakdown?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.noDataYet) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No audience focus data yet.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Evaluators will populate this when they fill the audience focus field during evaluations.
          </p>
          {data && data.totalProjects > 0 && (
            <p className="text-[10px] text-gray-400 mt-2">
              {data.totalProjects} active projects waiting for POV classification
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const chartData = data.segments.map((s) => ({
    name: s.label,
    value: s.count,
    fill: s.color,
    segment: s,
  }));

  const handleClick = (d: any) => {
    if (d && d.segment) setSelectedSegment(d.segment);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative w-28 h-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={48}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={handleClick}
                    cursor="pointer"
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} projects`, name]}
                    contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{data.totalWithFocus}</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {chartData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1 -mx-1 transition-colors"
                  onClick={() => handleClick(item)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.fill }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{item.value}</span>
                </div>
              ))}
              {data.totalProjects - data.totalWithFocus > 0 && (
                <p className="text-[10px] text-gray-400">
                  {data.totalProjects - data.totalWithFocus} not yet classified
                </p>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">Click a segment to see projects</p>
        </CardContent>
      </Card>

      {selectedSegment && (
        <DrillDialog segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
      )}
    </>
  );
}
