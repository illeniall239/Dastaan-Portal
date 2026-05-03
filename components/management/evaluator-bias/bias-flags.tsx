"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BiasFlag {
  evaluatorId: string;
  evaluatorName: string;
  dimensionValue: string;
  avgScore: number;
  peerAvg: number;
  deviation: number;
  count: number;
}

interface BiasFlagsProps {
  flags: BiasFlag[];
  dimension: string;
}

export function BiasFlags({ flags, dimension }: BiasFlagsProps) {
  const [open, setOpen] = useState(true);

  const below = flags.filter((f) => f.deviation < 0);
  const above = flags.filter((f) => f.deviation > 0);

  if (flags.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No significant bias detected (no evaluator deviates ≥ 1.5 from peers for any {dimension} value with sufficient data).
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          Bias Flags
          <Badge variant="destructive" className="text-xs">{flags.length}</Badge>
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-4">
          {below.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-red-700 uppercase tracking-wide">
                <TrendingDown className="h-3.5 w-3.5" />
                Consistently Below Peers
              </div>
              <div className="space-y-1.5">
                {below.map((f, i) => (
                  <FlagRow key={i} flag={f} />
                ))}
              </div>
            </div>
          )}

          {above.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-green-700 uppercase tracking-wide">
                <TrendingUp className="h-3.5 w-3.5" />
                Consistently Above Peers
              </div>
              <div className="space-y-1.5">
                {above.map((f, i) => (
                  <FlagRow key={i} flag={f} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FlagRow({ flag }: { flag: BiasFlag }) {
  const isBelow = flag.deviation < 0;
  return (
    <div className={`flex items-center justify-between rounded px-3 py-2 text-sm ${isBelow ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium truncate">{flag.evaluatorName}</span>
        <span className="text-muted-foreground">for</span>
        <span className="font-medium truncate">{flag.dimensionValue}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4 text-xs">
        <span className="text-muted-foreground">avg {flag.avgScore.toFixed(1)}</span>
        <span className="text-muted-foreground">peer {flag.peerAvg.toFixed(1)}</span>
        <span className={`font-semibold ${isBelow ? "text-red-700" : "text-green-700"}`}>
          {flag.deviation > 0 ? "+" : ""}{flag.deviation.toFixed(2)}
        </span>
        <span className="text-muted-foreground">n={flag.count}</span>
      </div>
    </div>
  );
}
