"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingDown, TrendingUp, Pencil, Check } from "lucide-react";

interface TeamRow {
  teamId: string;
  teamName: string;
  target8pm: number;
  target7_9pm: number;
  achieved8pm: number;
  achieved7_9pm: number;
  achievedTotal: number;
  approved8pm: number;
  approved7_9pm: number;
  approvedTotal: number;
}

function DiffCell({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
        <TrendingUp className="h-3 w-3" />+{value}
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
        <TrendingDown className="h-3 w-3" />{value}
      </span>
    );
  return (
    <span className="inline-flex items-center text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
      0
    </span>
  );
}

type TabKey = "targets" | "achievement" | "summary" | "approved" | "approved_summary";

const TAB_LABELS: Record<TabKey, string> = {
  targets: "Annual Targets",
  achievement: "Target Achievement",
  summary: "Achievement Summary",
  approved: "Approved vs 50% Target",
  approved_summary: "Approved Summary",
};

export function AnnualTargetTracker() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("targets");
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, { "8PM": number; "7/9PM": number }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetch(`/api/programmer/annual-targets?_t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setTeams(res.teams);
          setYear(res.year);
          // Init edit values from current targets
          const ev: Record<string, { "8PM": number; "7/9PM": number }> = {};
          for (const t of res.teams) {
            ev[t.teamId] = { "8PM": t.target8pm, "7/9PM": t.target7_9pm };
          }
          setEditValues(ev);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derive all data from editValues (targets) + raw achieved/approved from API
  const computed = useMemo(() => {
    const rows = teams.map((t) => {
      const tgt8 = editing ? (editValues[t.teamId]?.["8PM"] ?? t.target8pm) : t.target8pm;
      const tgt79 = editing ? (editValues[t.teamId]?.["7/9PM"] ?? t.target7_9pm) : t.target7_9pm;
      const tgtTotal = tgt8 + tgt79;
      return {
        ...t,
        target8pm: tgt8,
        target7_9pm: tgt79,
        targetTotal: tgtTotal,
        achievedTotal: t.achieved8pm + t.achieved7_9pm + (t.achievedTotal - t.achieved8pm - t.achieved7_9pm),
        diff8pm: t.achieved8pm - tgt8,
        diff7_9pm: t.achieved7_9pm - tgt79,
        diffTotal: t.achievedTotal - tgtTotal,
      };
    });

    const totals = {
      target8pm: rows.reduce((s, r) => s + r.target8pm, 0),
      target7_9pm: rows.reduce((s, r) => s + r.target7_9pm, 0),
      targetTotal: rows.reduce((s, r) => s + r.targetTotal, 0),
      achieved8pm: rows.reduce((s, r) => s + r.achieved8pm, 0),
      achieved7_9pm: rows.reduce((s, r) => s + r.achieved7_9pm, 0),
      achievedTotal: rows.reduce((s, r) => s + r.achievedTotal, 0),
      approved8pm: rows.reduce((s, r) => s + r.approved8pm, 0),
      approved7_9pm: rows.reduce((s, r) => s + r.approved7_9pm, 0),
      approvedTotal: rows.reduce((s, r) => s + r.approvedTotal, 0),
      diff8pm: 0, diff7_9pm: 0, diffTotal: 0,
    };
    totals.diff8pm = totals.achieved8pm - totals.target8pm;
    totals.diff7_9pm = totals.achieved7_9pm - totals.target7_9pm;
    totals.diffTotal = totals.achievedTotal - totals.targetTotal;

    const t50_8 = Math.ceil(totals.target8pm / 2);
    const t50_79 = Math.ceil(totals.target7_9pm / 2);
    const t50_total = Math.ceil(totals.targetTotal / 2);
    const approvedSummary = {
      inHand8pm: totals.achieved8pm,
      inHand7_9pm: totals.achieved7_9pm,
      inHandTotal: totals.achievedTotal,
      approved8pm: totals.approved8pm,
      approved7_9pm: totals.approved7_9pm,
      approvedTotal: totals.approvedTotal,
      inWriting8pm: totals.achieved8pm - totals.approved8pm,
      inWriting7_9pm: totals.achieved7_9pm - totals.approved7_9pm,
      inWritingTotal: totals.achievedTotal - totals.approvedTotal,
      target50pct8pm: t50_8,
      target50pct7_9pm: t50_79,
      target50pctTotal: t50_total,
      behind50pct8pm: totals.approved8pm - t50_8,
      behind50pct7_9pm: totals.approved7_9pm - t50_79,
      behind50pctTotal: totals.approvedTotal - t50_total,
      behind100pct8pm: totals.approved8pm - totals.target8pm,
      behind100pct7_9pm: totals.approved7_9pm - totals.target7_9pm,
      behind100pctTotal: totals.approvedTotal - totals.targetTotal,
    };

    return { rows, totals, approvedSummary };
  }, [teams, editValues, editing]);

  const handleEditChange = (teamId: string, slot: "8PM" | "7/9PM", value: string) => {
    const num = parseInt(value) || 0;
    setEditValues((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [slot]: Math.max(0, num) },
    }));
  };

  const handleSave = async () => {
    setSaving("all");
    const promises: Promise<any>[] = [];
    for (const t of teams) {
      const ev = editValues[t.teamId];
      if (!ev) continue;
      if (ev["8PM"] !== t.target8pm) {
        promises.push(
          fetch("/api/programmer/annual-targets", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, teamId: t.teamId, slotGroup: "8PM", targetCount: ev["8PM"] }),
          })
        );
      }
      if (ev["7/9PM"] !== t.target7_9pm) {
        promises.push(
          fetch("/api/programmer/annual-targets", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, teamId: t.teamId, slotGroup: "7/9PM", targetCount: ev["7/9PM"] }),
          })
        );
      }
    }
    await Promise.all(promises);
    setSaving(null);
    setEditing(false);
    // Refetch to get fresh data
    setLoading(true);
    fetchData();
  };

  const { rows, totals, approvedSummary } = computed;
  const tabs: TabKey[] = ["targets", "achievement", "summary", "approved", "approved_summary"];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No annual target data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-[#224794] text-[#224794]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab 1: Annual Targets (Editable) */}
        {activeTab === "targets" && (
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">Annual Content Requirement (January {year} - December {year})</p>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-[#224794] hover:text-[#1a3670] font-medium px-2 py-1 rounded border border-[#224794]/20 hover:bg-[#224794]/5 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit Targets
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      // Reset edit values
                      const ev: Record<string, { "8PM": number; "7/9PM": number }> = {};
                      for (const t of teams) ev[t.teamId] = { "8PM": t.target8pm, "7/9PM": t.target7_9pm };
                      setEditValues(ev);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving !== null}
                    className="flex items-center gap-1 text-xs text-white bg-[#224794] hover:bg-[#1a3670] font-medium px-3 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              )}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-700">Content Team</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-blue-700">8PM</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-amber-700">7/9PM</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.teamId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-3 font-medium text-gray-800">{t.teamName}</td>
                    <td className="text-center py-1 px-2">
                      {editing ? (
                        <input
                          type="number"
                          min={0}
                          value={editValues[t.teamId]?.["8PM"] ?? t.target8pm}
                          onChange={(e) => handleEditChange(t.teamId, "8PM", e.target.value)}
                          className="w-14 text-center text-xs border border-blue-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50"
                        />
                      ) : (
                        <span className="text-gray-700">{t.target8pm}</span>
                      )}
                    </td>
                    <td className="text-center py-1 px-2">
                      {editing ? (
                        <input
                          type="number"
                          min={0}
                          value={editValues[t.teamId]?.["7/9PM"] ?? t.target7_9pm}
                          onChange={(e) => handleEditChange(t.teamId, "7/9PM", e.target.value)}
                          className="w-14 text-center text-xs border border-amber-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50"
                        />
                      ) : (
                        <span className="text-gray-700">{t.target7_9pm}</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-3 font-semibold text-gray-900">{t.targetTotal}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-2.5 px-3 text-gray-900">Total Script Ideas/Concepts</td>
                  <td className="text-center py-2.5 px-3 text-blue-800">{totals.target8pm}</td>
                  <td className="text-center py-2.5 px-3 text-amber-800">{totals.target7_9pm}</td>
                  <td className="text-center py-2.5 px-3 text-gray-900">{totals.targetTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Target Achievement */}
        {activeTab === "achievement" && (
          <div className="overflow-x-auto">
            <p className="text-xs text-gray-500 mb-3">Target Achievement as of {new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-2 font-semibold text-gray-700" rowSpan={2}>Content Team</th>
                  <th className="text-center py-1.5 px-1 font-semibold text-blue-700 border-b border-blue-100" colSpan={3}>8PM</th>
                  <th className="text-center py-1.5 px-1 font-semibold text-amber-700 border-b border-amber-100" colSpan={3}>7/9PM</th>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Target</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Achieve</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Diff</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Target</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Achieve</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.teamId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-2 font-medium text-gray-800">{t.teamName}</td>
                    <td className="text-center py-2 px-1 text-gray-600">{t.target8pm}</td>
                    <td className="text-center py-2 px-1 font-semibold">{t.achieved8pm}</td>
                    <td className="text-center py-2 px-1"><DiffCell value={t.diff8pm} /></td>
                    <td className="text-center py-2 px-1 text-gray-600">{t.target7_9pm}</td>
                    <td className="text-center py-2 px-1 font-semibold">{t.achieved7_9pm}</td>
                    <td className="text-center py-2 px-1"><DiffCell value={t.diff7_9pm} /></td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-2.5 px-2 text-gray-900">Total</td>
                  <td className="text-center py-2.5 px-1 text-gray-700">{totals.target8pm}</td>
                  <td className="text-center py-2.5 px-1">{totals.achieved8pm}</td>
                  <td className="text-center py-2.5 px-1"><DiffCell value={totals.diff8pm} /></td>
                  <td className="text-center py-2.5 px-1 text-gray-700">{totals.target7_9pm}</td>
                  <td className="text-center py-2.5 px-1">{totals.achieved7_9pm}</td>
                  <td className="text-center py-2.5 px-1"><DiffCell value={totals.diff7_9pm} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Achievement Summary */}
        {activeTab === "summary" && (
          <div className="overflow-x-auto">
            <p className="text-xs text-gray-500 mb-3">Summary of Target Achievement</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-700"></th>
                  <th className="text-center py-2.5 px-3 font-semibold text-blue-700">8PM</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-amber-700">7/9PM</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-3 font-medium text-gray-800">Annual Target of Script Ideas</td>
                  <td className="text-center py-2.5 px-3 text-gray-700">{totals.target8pm}</td>
                  <td className="text-center py-2.5 px-3 text-gray-700">{totals.target7_9pm}</td>
                  <td className="text-center py-2.5 px-3 font-semibold">{totals.targetTotal}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-3 font-medium text-gray-800">In-Hand Ideas/Scripts (Approved & Rejected)</td>
                  <td className="text-center py-2.5 px-3 text-gray-700">{totals.achieved8pm}</td>
                  <td className="text-center py-2.5 px-3 text-gray-700">{totals.achieved7_9pm}</td>
                  <td className="text-center py-2.5 px-3 font-semibold">{totals.achievedTotal}</td>
                </tr>
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td className="py-2.5 px-3 font-bold text-gray-900">Behind/Ahead Concepts Required till Dec &apos;{String(year).slice(2)}</td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={totals.diff8pm} /></td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={totals.diff7_9pm} /></td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={totals.diffTotal} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Approved Concepts vs 50% Target */}
        {activeTab === "approved" && (
          <div className="overflow-x-auto">
            <p className="text-xs text-gray-500 mb-3">Approved Concepts & Requirement (50% of Annual Target)</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-2 font-semibold text-gray-700" rowSpan={2}>Content Team</th>
                  <th className="text-center py-1.5 px-1 font-semibold text-blue-700 border-b border-blue-100" colSpan={3}>8PM</th>
                  <th className="text-center py-1.5 px-1 font-semibold text-amber-700 border-b border-amber-100" colSpan={3}>7/9PM</th>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">50% Tgt</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Approved</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Diff</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">50% Tgt</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Approved</th>
                  <th className="text-center py-1.5 px-1 font-medium text-gray-500">Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const tgt50_8 = Math.ceil(t.target8pm / 2);
                  const tgt50_79 = Math.ceil(t.target7_9pm / 2);
                  return (
                    <tr key={t.teamId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-2 font-medium text-gray-800">{t.teamName}</td>
                      <td className="text-center py-2 px-1 text-gray-600">{tgt50_8}</td>
                      <td className="text-center py-2 px-1 font-semibold">{t.approved8pm}</td>
                      <td className="text-center py-2 px-1"><DiffCell value={t.approved8pm - tgt50_8} /></td>
                      <td className="text-center py-2 px-1 text-gray-600">{tgt50_79}</td>
                      <td className="text-center py-2 px-1 font-semibold">{t.approved7_9pm}</td>
                      <td className="text-center py-2 px-1"><DiffCell value={t.approved7_9pm - tgt50_79} /></td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-2.5 px-2 text-gray-900">Total</td>
                  <td className="text-center py-2.5 px-1 text-gray-700">{approvedSummary.target50pct8pm}</td>
                  <td className="text-center py-2.5 px-1">{approvedSummary.approved8pm}</td>
                  <td className="text-center py-2.5 px-1"><DiffCell value={approvedSummary.behind50pct8pm} /></td>
                  <td className="text-center py-2.5 px-1 text-gray-700">{approvedSummary.target50pct7_9pm}</td>
                  <td className="text-center py-2.5 px-1">{approvedSummary.approved7_9pm}</td>
                  <td className="text-center py-2.5 px-1"><DiffCell value={approvedSummary.behind50pct7_9pm} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Approved Summary */}
        {activeTab === "approved_summary" && (
          <div className="overflow-x-auto">
            <p className="text-xs text-gray-500 mb-3">Summary of Approved Concepts & Requirement</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-700"></th>
                  <th className="text-center py-2.5 px-3 font-semibold text-blue-700">8PM</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-amber-700">7/9PM</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-3 font-medium text-gray-800">In-Hand Ideas/Scripts</td>
                  <td className="text-center py-2.5 px-3">{approvedSummary.inHand8pm}</td>
                  <td className="text-center py-2.5 px-3">{approvedSummary.inHand7_9pm}</td>
                  <td className="text-center py-2.5 px-3 font-semibold">{approvedSummary.inHandTotal}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-3 font-medium text-gray-800">Concepts Approved</td>
                  <td className="text-center py-2.5 px-3">{approvedSummary.approved8pm}</td>
                  <td className="text-center py-2.5 px-3">{approvedSummary.approved7_9pm}</td>
                  <td className="text-center py-2.5 px-3 font-semibold">{approvedSummary.approvedTotal}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-3 font-medium text-gray-800">Concepts In Writing Process</td>
                  <td className="text-center py-2.5 px-3">{approvedSummary.inWriting8pm}</td>
                  <td className="text-center py-2.5 px-3">{approvedSummary.inWriting7_9pm}</td>
                  <td className="text-center py-2.5 px-3 font-semibold">{approvedSummary.inWritingTotal}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-blue-50">
                  <td className="py-2.5 px-3 font-medium text-blue-800">Approved Scripts Target (50% of Annual Target)</td>
                  <td className="text-center py-2.5 px-3 text-blue-700">{approvedSummary.target50pct8pm}</td>
                  <td className="text-center py-2.5 px-3 text-blue-700">{approvedSummary.target50pct7_9pm}</td>
                  <td className="text-center py-2.5 px-3 font-semibold text-blue-800">{approvedSummary.target50pctTotal}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2.5 px-3 font-bold text-gray-900">Behind/Ahead (vs 50% Target)</td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={approvedSummary.behind50pct8pm} /></td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={approvedSummary.behind50pct7_9pm} /></td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={approvedSummary.behind50pctTotal} /></td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-700">Total Script Ideas/Concepts (100% Target)</td>
                  <td className="text-center py-2.5 px-3 text-gray-600">{totals.target8pm}</td>
                  <td className="text-center py-2.5 px-3 text-gray-600">{totals.target7_9pm}</td>
                  <td className="text-center py-2.5 px-3 font-semibold text-gray-700">{totals.targetTotal}</td>
                </tr>
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td className="py-2.5 px-3 font-bold text-gray-900">Behind/Ahead (vs 100% Target)</td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={approvedSummary.behind100pct8pm} /></td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={approvedSummary.behind100pct7_9pm} /></td>
                  <td className="text-center py-2.5 px-3"><DiffCell value={approvedSummary.behind100pctTotal} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
