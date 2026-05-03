"use client";

interface BiasCell {
  avgScore: number | null;
  count: number;
  deviation: number | null;
}

interface Evaluator {
  id: string;
  name: string;
  cells: Record<string, BiasCell>;
}

interface BiasHeatmapProps {
  dimensionValues: string[];
  evaluators: Evaluator[];
  peerAverages: Record<string, number | null>;
}

function deviationClass(deviation: number | null): string {
  if (deviation === null) return "";
  if (deviation > 1.5) return "bg-green-200 text-green-900";
  if (deviation > 0.5) return "bg-green-100 text-green-800";
  if (deviation < -1.5) return "bg-red-200 text-red-900";
  if (deviation < -0.5) return "bg-amber-100 text-amber-900";
  return "bg-muted/30 text-foreground";
}

export function BiasHeatmap({ dimensionValues, evaluators, peerAverages }: BiasHeatmapProps) {
  if (evaluators.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No data available for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 px-4 py-2.5 text-left font-semibold border-b border-r whitespace-nowrap min-w-[160px]">
              Evaluator
            </th>
            {dimensionValues.map((dv) => (
              <th key={dv} className="px-3 py-2.5 text-center font-semibold border-b border-r whitespace-nowrap max-w-[120px]">
                <span className="block truncate max-w-[110px]" title={dv}>{dv}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {evaluators.map((ev, i) => (
            <tr key={ev.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <td className="sticky left-0 z-10 px-4 py-2 font-medium border-r border-b whitespace-nowrap bg-inherit">
                {ev.name}
              </td>
              {dimensionValues.map((dv) => {
                const cell = ev.cells[dv];
                if (!cell || cell.avgScore === null) {
                  return (
                    <td key={dv} className="px-3 py-2 text-center border-r border-b text-muted-foreground/50">
                      {cell && cell.count > 0 ? (
                        <span title={`${cell.count} eval(s) — below minimum`}>—</span>
                      ) : "—"}
                    </td>
                  );
                }
                const cls = deviationClass(cell.deviation);
                const deviationStr = cell.deviation !== null
                  ? `${cell.deviation > 0 ? "+" : ""}${cell.deviation.toFixed(2)} vs peers`
                  : "";
                return (
                  <td
                    key={dv}
                    className={`px-3 py-2 text-center border-r border-b ${cls}`}
                    title={`${ev.name} · ${dv}: avg ${cell.avgScore.toFixed(1)}, n=${cell.count}${deviationStr ? `, ${deviationStr}` : ""}`}
                  >
                    <div className="font-semibold">{cell.avgScore.toFixed(1)}</div>
                    <div className="text-[10px] opacity-70">n={cell.count}</div>
                    {cell.deviation !== null && (
                      <div className="text-[10px] font-medium">
                        {cell.deviation > 0 ? "+" : ""}{cell.deviation.toFixed(1)}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/60 font-semibold border-t-2">
            <td className="sticky left-0 z-10 bg-muted/60 px-4 py-2.5 border-r text-xs uppercase tracking-wide text-muted-foreground">
              Peer Avg
            </td>
            {dimensionValues.map((dv) => {
              const avg = peerAverages[dv];
              return (
                <td key={dv} className="px-3 py-2.5 text-center border-r text-xs">
                  {avg !== null ? avg.toFixed(2) : <span className="text-muted-foreground">—</span>}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
