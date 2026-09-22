"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Bucket {
  min: number;
  label: string;
  count: number;
}

interface MilestoneData {
  serials: Bucket[];
  longSerials: Bucket[];
}

interface DrillDownState {
  type: "Serial" | "Long Serial";
  min: number;
  label: string;
}

function DrillDownDialog({
  type,
  min,
  label,
  onClose,
}: DrillDownState & { onClose: () => void }) {
  const [data, setData] = useState<{
    columns: { key: string; label: string }[];
    rows: Record<string, any>[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch(
      `/api/management/episode-milestones?drilldown=1&type=${encodeURIComponent(type)}&min=${min}`
    )
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData({ columns: res.columns, rows: res.rows });
      })
      .catch(() => setData({ columns: [], rows: [] }))
      .finally(() => setLoading(false));
  }, [type, min]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            {type}s — {label} Episodes
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No projects found
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200">
                  {data.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    {data.columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 whitespace-nowrap text-gray-700"
                      >
                        {row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-muted-foreground text-right py-2 pr-3">
              {data.rows.length} project{data.rows.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MilestoneRow({
  label,
  buckets,
  color,
  contentType,
  onCardClick,
}: {
  label: string;
  buckets: Bucket[];
  color: string;
  contentType: "Serial" | "Long Serial";
  onCardClick: (type: "Serial" | "Long Serial", min: number, label: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{label}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <button
            key={b.min}
            type="button"
            onClick={() => onCardClick(contentType, b.min, b.label)}
            className={`rounded-lg border p-3 text-center ${color} transition-shadow hover:shadow-md hover:ring-1 hover:ring-gray-300 cursor-pointer`}
          >
            <div className="text-2xl font-bold tabular-nums">{b.count}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {b.label} eps
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function EpisodeMilestones() {
  const [data, setData] = useState<MilestoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  useEffect(() => {
    fetch("/api/management/episode-milestones")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = (type: "Serial" | "Long Serial", min: number, label: string) => {
    setDrillDown({ type, min, label });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Failed to load milestone data
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <MilestoneRow
              label="Serials"
              buckets={data.serials}
              color="bg-blue-50 border-blue-200"
              contentType="Serial"
              onCardClick={handleCardClick}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <MilestoneRow
              label="Long Serials"
              buckets={data.longSerials}
              color="bg-amber-50 border-amber-200"
              contentType="Long Serial"
              onCardClick={handleCardClick}
            />
          </CardContent>
        </Card>
      </div>
      {drillDown && (
        <DrillDownDialog
          key={`${drillDown.type}-${drillDown.min}`}
          type={drillDown.type}
          min={drillDown.min}
          label={drillDown.label}
          onClose={() => setDrillDown(null)}
        />
      )}
    </>
  );
}
