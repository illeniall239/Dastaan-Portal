"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Minus, Plus, Save } from "lucide-react";

interface WaadaDetail {
  id: string;
  number: number;
  startDate: string;
  endDate: string | null;
  weeks: number;
  commitmentPerWeek: number;
  commitmentPerMonth: number;
  committedEps: number;
  receivedEps: number;
  months: number;
  ratePerMonth: number;
  deliveryRatePercent: number;
  cumulativeCommittedEps: number | null;
  cumulativeReceivedEps: number | null;
}

interface ProjectRow {
  id: string;
  commitmentId: string;
  title: string;
  writer: string;
  teamName: string | null;
  teamId: string | null;
  slot: string | null;
  totalEpisodes: number | null;
  inHandEpisodes: number;
  commitmentDate: string | null;
  deadline: string | null;
  standard: {
    commitmentPerWeek: number;
    commitmentPerMonth: number;
    scheduleLabel: string;
    firstEpDate: string | null;
    weeks: number;
    months: number;
    totalCommitted: number;
    deliveryRatePerMonth: number;
    deliveryRatePercent: number;
  };
  waadas: WaadaDetail[];
  summaryRates: {
    standard: number;
    waada1: number | null;
    waada2: number | null;
    waada3: number | null;
    waada4: number | null;
  };
  monthlyEpisodes?: Record<string, number>;
}

function rateBg(pct: number): string {
  if (pct < 0) return "";
  if (pct >= 85) return "bg-green-100 text-green-900";
  if (pct >= 80) return "bg-gray-200 text-gray-800";
  if (pct >= 60) return "bg-orange-100 text-orange-900";
  return "bg-red-100 text-red-900";
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function fmtNum(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtMonthCol(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_SHORT[parseInt(m) - 1]} ${y.slice(2)}`;
}

export function DeliveryRateView() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [monthColumns, setMonthColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  // Track how many waada column groups are shown per team (teamId → count)
  const [teamWaadaCols, setTeamWaadaCols] = useState<Record<string, number>>({});
  // Track inline waada input per row: commitmentId → { startDate, endDate, commitmentPerWeek }
  const [rowWaadaInputs, setRowWaadaInputs] = useState<Record<string, { startDate: string; endDate: string; commitmentPerWeek: string }>>({});

  const fetchData = useCallback(() => {
    fetch(`/api/writer-commitments/delivery-rate?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setProjects(res.projects);
          if (res.monthColumns) setMonthColumns(res.monthColumns);
          // Initialize waada col counts from data (max waada per team)
          const counts: Record<string, number> = {};
          for (const p of res.projects) {
            const key = p.teamId || "unknown";
            counts[key] = Math.max(counts[key] || 0, p.waadas.length);
          }
          setTeamWaadaCols((prev) => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(counts)) {
              // Keep the higher of existing shown cols or data-driven cols
              merged[k] = Math.max(merged[k] || 0, v);
            }
            return merged;
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const teams = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of projects) if (p.teamId && p.teamName) seen.set(p.teamId, p.teamName);
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [projects]);

  const filtered = useMemo(() => {
    if (teamFilter === "all") return projects;
    return projects.filter((p) => p.teamId === teamFilter);
  }, [projects, teamFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { teamId: string; teamName: string; projects: ProjectRow[] }>();
    for (const p of filtered) {
      const key = p.teamId || "unknown";
      const g = map.get(key) || { teamId: key, teamName: p.teamName || "Unknown", projects: [] };
      g.projects.push(p);
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [filtered]);

  const handleAddWaadaCols = (teamId: string) => {
    setTeamWaadaCols((prev) => {
      const current = prev[teamId] || 0;
      if (current >= 4) return prev;
      return { ...prev, [teamId]: current + 1 };
    });
  };

  const handleRemoveWaadaCols = async (teamId: string, groupProjects: ProjectRow[]) => {
    const current = teamWaadaCols[teamId] || 0;
    if (current <= 0) return;
    // Delete all waada records with the highest waada number in this team
    const waadaIdsToDelete = groupProjects
      .flatMap((p) => p.waadas)
      .filter((w) => w.number === current)
      .map((w) => w.id);
    if (waadaIdsToDelete.length > 0) {
      await Promise.all(
        waadaIdsToDelete.map((id) =>
          fetch(`/api/writer-commitments/delivery-rate?id=${id}`, { method: "DELETE" })
        )
      );
    }
    setTeamWaadaCols((prev) => ({ ...prev, [teamId]: current - 1 }));
    if (waadaIdsToDelete.length > 0) {
      setLoading(true);
      fetchData();
    }
  };

  const handleSaveRowWaada = async (commitmentId: string, waadaNumber: number) => {
    const input = rowWaadaInputs[`${commitmentId}-${waadaNumber}`];
    if (!input?.startDate || !input?.commitmentPerWeek) return;
    setSaving(true);
    await fetch("/api/writer-commitments/delivery-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writerCommitmentId: commitmentId,
        startDate: input.startDate,
        endDate: input.endDate || null,
        commitmentPerWeek: parseFloat(input.commitmentPerWeek),
      }),
    });
    setSaving(false);
    // Clear the input
    setRowWaadaInputs((prev) => {
      const next = { ...prev };
      delete next[`${commitmentId}-${waadaNumber}`];
      return next;
    });
    setLoading(true);
    fetchData();
  };

  const handleDateChange = async (commitmentId: string, field: "commitment_date" | "revised_commitment_date", value: string) => {
    await fetch("/api/writer-commitments/delivery-rate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commitmentId, field, value: value || null }),
    });
    setProjects((prev) =>
      prev.map((p) => {
        if (p.commitmentId !== commitmentId) return p;
        return {
          ...p,
          commitmentDate: field === "commitment_date" ? (value || null) : p.commitmentDate,
          deadline: field === "revised_commitment_date" ? (value || null) : p.deadline,
        };
      })
    );
  };

  const handleDeleteWaada = async (waadaId: string) => {
    await fetch(`/api/writer-commitments/delivery-rate?id=${waadaId}`, { method: "DELETE" });
    setLoading(true);
    fetchData();
  };

  const updateRowInput = (key: string, field: string, value: string) => {
    setRowWaadaInputs((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { startDate: "", endDate: "", commitmentPerWeek: "1" }), [field]: value },
    }));
  };

  if (loading) {
    return <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  if (projects.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No delivery rate data. Add writer commitments first.</CardContent></Card>;
  }

  const thClass = "py-2 px-2 font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap text-center";
  const tdClass = "py-1.5 px-2 text-[11px] text-center whitespace-nowrap";
  const groupHeaderClass = "text-center text-[10px] font-bold uppercase tracking-wider py-1.5 px-2";
  const inputClass = "text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300";

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">Team:</label>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="all">All Teams</option>
          {teams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {grouped.map((group) => {
        const shownWaadas = teamWaadaCols[group.teamId] || 0;
        const waadaNums = Array.from({ length: shownWaadas }, (_, i) => i + 1);
        const canAddMore = shownWaadas < 4;
        // Waada 1 = 10 cols, Waada 2+ = 12 cols (2 extra cumulative columns)
        const waadaColCount = (n: number) => n === 1 ? 10 : 12;
        const totalWaadaCols = waadaNums.reduce((s, n) => s + waadaColCount(n), 0);
        const totalCols = 7 + 10 + totalWaadaCols + (shownWaadas > 0 ? 1 + shownWaadas : 0) + monthColumns.length;

        return (
          <Card key={group.teamId}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">{group.teamName}</h3>
                <div className="flex items-center gap-2">
                  {shownWaadas > 0 && (
                    <button
                      onClick={() => handleRemoveWaadaCols(group.teamId, group.projects)}
                      className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 border border-red-200 rounded-md px-2.5 py-1 hover:bg-red-50 transition-colors"
                    >
                      <Minus className="h-3 w-3" /> Remove Waada {String(shownWaadas).padStart(2, "0")}
                    </button>
                  )}
                  {canAddMore && (
                    <button
                      onClick={() => handleAddWaadaCols(group.teamId)}
                      className="text-[11px] text-[#224794] hover:text-[#1a3670] font-medium flex items-center gap-1 border border-[#224794]/30 rounded-md px-2.5 py-1 hover:bg-[#224794]/5 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Waada {String(shownWaadas + 1).padStart(2, "0")}
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="text-[11px] border-collapse min-w-max">
                  <thead>
                    {/* Group headers */}
                    <tr className="border-b border-gray-300">
                      <th colSpan={7} className={`${groupHeaderClass} bg-blue-50 text-blue-800 border-r border-gray-300`}>Summary</th>
                      <th colSpan={10} className={`${groupHeaderClass} bg-gray-50 text-gray-700 border-r border-gray-300`}>Standard</th>
                      {waadaNums.map((n) => (
                        <th key={n} colSpan={waadaColCount(n)} className={`${groupHeaderClass} bg-amber-50 text-amber-800 border-r border-gray-300`}>Waada {String(n).padStart(2, "0")}</th>
                      ))}
                      {(shownWaadas > 0) && (
                        <th colSpan={1 + shownWaadas} className={`${groupHeaderClass} bg-purple-50 text-purple-800 border-r border-gray-300`}>Waada Summary %</th>
                      )}
                      {monthColumns.length > 0 && (
                        <th colSpan={monthColumns.length} className={`${groupHeaderClass} bg-teal-50 text-teal-800`}>Monthly Episodes Received</th>
                      )}
                    </tr>
                    {/* Column headers */}
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className={`${thClass} text-left text-gray-700`}>Title</th>
                      <th className={`${thClass} text-left text-gray-700`}>Writer</th>
                      <th className={`${thClass} text-gray-700`}>Slot</th>
                      <th className={`${thClass} text-gray-700`}>Total Eps</th>
                      <th className={`${thClass} text-gray-700`}>In Hand</th>
                      <th className={`${thClass} text-gray-700`}>Contract Date</th>
                      <th className={`${thClass} text-gray-700 border-r border-gray-300`}>Deadline</th>
                      <th className={`${thClass} text-gray-600`}>Commit/wk</th>
                      <th className={`${thClass} text-gray-600`}>Commit/mo</th>
                      <th className={`${thClass} text-gray-600`}>Total Committed</th>
                      <th className={`${thClass} text-gray-600`}>1st Ep Date</th>
                      <th className={`${thClass} text-gray-600`}>Weeks</th>
                      <th className={`${thClass} text-gray-600`}>As of</th>
                      <th className={`${thClass} text-gray-600`}>Months</th>
                      <th className={`${thClass} text-gray-600`}>In Hand</th>
                      <th className={`${thClass} text-gray-600`}>Rate/mo</th>
                      <th className={`${thClass} text-gray-600 border-r border-gray-300`}>Rate %</th>
                      {waadaNums.map((n) => (
                        <Fragment key={n}>
                          <th className={`${thClass} text-amber-700`}>Start</th>
                          <th className={`${thClass} text-amber-700`}>End</th>
                          <th className={`${thClass} text-amber-700`}>Wks</th>
                          <th className={`${thClass} text-amber-700`}>Cmit/wk</th>
                          <th className={`${thClass} text-amber-700`}>Cmit/mo</th>
                          <th className={`${thClass} text-amber-700`}>Total Cmtd</th>
                          {n >= 2 && <th className={`${thClass} text-amber-700`}>Cmtd Till W{n}</th>}
                          <th className={`${thClass} text-amber-700`}>Rcvd</th>
                          {n >= 2 && <th className={`${thClass} text-amber-700`}>In Hand Till W{n}</th>}
                          <th className={`${thClass} text-amber-700`}>Months</th>
                          <th className={`${thClass} text-amber-700`}>Rate/mo</th>
                          <th className={`${thClass} text-amber-700 border-r border-gray-300`}>Rate %</th>
                        </Fragment>
                      ))}
                      {shownWaadas > 0 && (
                        <>
                          <th className={`${thClass} text-purple-700`}>Std %</th>
                          {waadaNums.map((n) => (
                            <th key={n} className={`${thClass} text-purple-700`}>W{n} %</th>
                          ))}
                        </>
                      )}
                      {monthColumns.map((mc) => (
                        <th key={mc} className={`${thClass} text-teal-700`}>{fmtMonthCol(mc)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.projects.map((p) => {
                      const w = (n: number) => p.waadas.find((w) => w.number === n);

                      return (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          {/* Summary */}
                          <td className={`${tdClass} text-left font-medium text-gray-900 max-w-[160px] truncate`}>{p.title}</td>
                          <td className={`${tdClass} text-left text-gray-600 max-w-[120px] truncate`}>{p.writer}</td>
                          <td className={`${tdClass} text-gray-600`}>{p.slot || "—"}</td>
                          <td className={`${tdClass} text-gray-700`}>{p.totalEpisodes ?? "—"}</td>
                          <td className={`${tdClass} font-semibold text-gray-900`}>{p.inHandEpisodes}</td>
                          <td className={tdClass}>
                            <input type="date" value={p.commitmentDate || ""}
                              onChange={(e) => handleDateChange(p.commitmentId, "commitment_date", e.target.value)}
                              className={`${inputClass} w-[105px]`} />
                          </td>
                          <td className={`${tdClass} border-r border-gray-200`}>
                            <input type="date" value={p.deadline || ""}
                              onChange={(e) => handleDateChange(p.commitmentId, "revised_commitment_date", e.target.value)}
                              className={`${inputClass} w-[105px]`} />
                          </td>
                          {/* Standard */}
                          <td className={tdClass}>{p.standard.commitmentPerWeek > 0 ? fmtNum(p.standard.commitmentPerWeek) : "—"}</td>
                          <td className={tdClass}>{p.standard.commitmentPerMonth > 0 ? fmtNum(p.standard.commitmentPerMonth) : "—"}</td>
                          <td className={tdClass}>{p.standard.totalCommitted > 0 ? fmtNum(p.standard.totalCommitted) : "—"}</td>
                          <td className={tdClass}>{fmtDate(p.standard.firstEpDate)}</td>
                          <td className={tdClass}>{p.standard.weeks > 0 ? fmtNum(p.standard.weeks) : "—"}</td>
                          <td className={`${tdClass} text-gray-400`}>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                          <td className={tdClass}>{p.standard.months > 0 ? fmtNum(p.standard.months) : "—"}</td>
                          <td className={`${tdClass} font-semibold`}>{p.inHandEpisodes}</td>
                          <td className={tdClass}>{p.standard.deliveryRatePerMonth > 0 ? fmtNum(p.standard.deliveryRatePerMonth) : "—"}</td>
                          <td className={`${tdClass} font-bold border-r border-gray-200 ${rateBg(p.standard.deliveryRatePercent)}`}>
                            {p.standard.deliveryRatePercent < 0 ? "N/A" : `${p.standard.deliveryRatePercent}%`}
                          </td>
                          {/* Waada columns */}
                          {waadaNums.map((n) => {
                            const wd = w(n);
                            const inputKey = `${p.commitmentId}-${n}`;
                            const input = rowWaadaInputs[inputKey];

                            // Has saved data — show computed values
                            if (wd) {
                              return (
                                <Fragment key={n}>
                                  <td className={tdClass}>{fmtDate(wd.startDate)}</td>
                                  <td className={tdClass}>{fmtDate(wd.endDate)}</td>
                                  <td className={tdClass}>{fmtNum(wd.weeks)}</td>
                                  <td className={tdClass}>{fmtNum(wd.commitmentPerWeek)}</td>
                                  <td className={tdClass}>{fmtNum(wd.commitmentPerMonth)}</td>
                                  <td className={tdClass}>{fmtNum(wd.committedEps)}</td>
                                  {n >= 2 && <td className={`${tdClass} font-semibold`}>{wd.cumulativeCommittedEps !== null ? fmtNum(wd.cumulativeCommittedEps) : "—"}</td>}
                                  <td className={`${tdClass} font-semibold`}>{wd.receivedEps}</td>
                                  {n >= 2 && <td className={`${tdClass} font-semibold`}>{wd.cumulativeReceivedEps !== null ? wd.cumulativeReceivedEps : "—"}</td>}
                                  <td className={tdClass}>{fmtNum(wd.months)}</td>
                                  <td className={tdClass}>{fmtNum(wd.ratePerMonth)}</td>
                                  <td className={`${tdClass} font-bold border-r border-gray-200 ${rateBg(wd.deliveryRatePercent)}`}>
                                    {wd.deliveryRatePercent}%
                                  </td>
                                </Fragment>
                              );
                            }

                            // No data yet — show inline inputs to fill
                            return (
                              <Fragment key={n}>
                                <td className={tdClass}>
                                  <input type="date" value={input?.startDate || ""}
                                    onChange={(e) => updateRowInput(inputKey, "startDate", e.target.value)}
                                    className={`${inputClass} w-[100px]`} />
                                </td>
                                <td className={tdClass}>
                                  <input type="date" value={input?.endDate || ""}
                                    onChange={(e) => updateRowInput(inputKey, "endDate", e.target.value)}
                                    className={`${inputClass} w-[100px]`} />
                                </td>
                                <td className={`${tdClass} text-gray-300`}>—</td>
                                <td className={tdClass}>
                                  <input type="number" min="0.5" step="0.5" value={input?.commitmentPerWeek || "1"}
                                    onChange={(e) => updateRowInput(inputKey, "commitmentPerWeek", e.target.value)}
                                    className={`${inputClass} w-[50px]`} />
                                </td>
                                <td className={`${tdClass} text-gray-300`}>—</td>
                                <td className={`${tdClass} text-gray-300`}>—</td>
                                {n >= 2 && <td className={`${tdClass} text-gray-300`}>—</td>}
                                <td className={`${tdClass} text-gray-300`}>—</td>
                                {n >= 2 && <td className={`${tdClass} text-gray-300`}>—</td>}
                                <td className={`${tdClass} text-gray-300`}>—</td>
                                <td className={`${tdClass} text-gray-300`}>—</td>
                                <td className={`${tdClass} border-r border-gray-200`}>
                                  {input?.startDate ? (
                                    <button onClick={() => handleSaveRowWaada(p.commitmentId, n)} disabled={saving}
                                      className="text-[9px] bg-[#224794] text-white rounded px-1.5 py-0.5 hover:bg-[#1a3670] disabled:opacity-50">
                                      {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />}
                                    </button>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </Fragment>
                            );
                          })}
                          {/* Summary % */}
                          {shownWaadas > 0 && (
                            <>
                              <td className={`${tdClass} font-bold ${rateBg(p.summaryRates.standard)}`}>
                                {p.summaryRates.standard < 0 ? "N/A" : `${p.summaryRates.standard}%`}
                              </td>
                              {waadaNums.map((n) => {
                                const r = p.summaryRates[`waada${n}` as keyof typeof p.summaryRates];
                                return (
                                  <td key={n} className={`${tdClass} font-bold ${r !== null && r !== undefined ? rateBg(r) : ""}`}>
                                    {r !== null && r !== undefined ? `${r}%` : ""}
                                  </td>
                                );
                              })}
                            </>
                          )}
                          {/* Monthly episode counts */}
                          {monthColumns.map((mc) => {
                            const count = p.monthlyEpisodes?.[mc] || 0;
                            return (
                              <td key={mc} className={`${tdClass} ${count > 0 ? "font-semibold text-teal-800 bg-teal-50" : "text-gray-300"}`}>
                                {count > 0 ? count : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Color legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500 px-1">
        <span className="font-semibold">Delivery Rate:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-green-100 border border-green-200 inline-block" /> 85-100%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-gray-200 border border-gray-300 inline-block" /> 80-84%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-orange-100 border border-orange-200 inline-block" /> 60-79%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-red-100 border border-red-200 inline-block" /> 0-59%</span>
      </div>
    </div>
  );
}
