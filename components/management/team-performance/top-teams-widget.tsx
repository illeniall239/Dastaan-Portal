"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ClipboardList,
  Film,
  Pencil,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";
import { CallReportDetailDialog } from "@/components/management/call-report-detail-dialog";
import type { TeamPerformanceExtended } from "@/lib/management/team-performance";
import type { TeamProjectReport, TeamProjectGroup } from "@/lib/management/team-projects";

export interface TeamPendingBacklog {
  pendingOneLiners: number;
  pendingEpisodes: number;
  totalOneLiners: number;
  totalEpisodes: number;
  evaluatedOneLiners: number;
  evaluatedEpisodes: number;
  oldestOneLinerDays: number | null;
  oldestEpisodeDays: number | null;
}

export interface TeamOverviewData {
  team_id: string;
  team_name: string;
  team_type: string;
  display_label: string;
  performance: TeamPerformanceExtended | null;
  projects: TeamProjectReport[];
  pendingBacklog: TeamPendingBacklog;
}

interface TopTeamsWidgetProps {
  teams: TeamOverviewData[];
}

// --- Shared sub-components ---

function MetricCell({ icon, label, value, subtitle, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-100 p-3 transition-colors ${
        onClick ? "cursor-pointer hover:border-gray-300" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-[11px] text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

const METRIC_LABELS: Record<string, string> = {
  ideas_logged: "New Ideas Logged",
  oneliner_evals: "One-Liner Evaluations",
  episodic_evals: "Episodic Evaluations",
  episodes_received: "Episodes Received",
  approved: "Approved",
  rejected: "Rejected",
  pending_oneliners: "Pending One-Liners",
  pending_episodes: "Pending Episodes",
};

function DrillDownDialog({ teamId, metric, teamName, onClose }: {
  teamId: string;
  metric: string;
  teamName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ columns: { key: string; label: string }[]; rows: Record<string, any>[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch(`/api/management/team-drill-down?teamId=${teamId}&metric=${metric}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData({ columns: res.columns, rows: res.rows });
        else setData({ columns: [], rows: [] });
      })
      .catch(() => setData({ columns: [], rows: [] }))
      .finally(() => setLoading(false));
  }, [teamId, metric]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            {teamName} — {METRIC_LABELS[metric] || metric}
          </DialogTitle>
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
                      <td key={col.key} className={`py-1.5 px-3 text-gray-700 ${col.key === "remarks" ? "max-w-[200px] whitespace-normal" : "whitespace-nowrap"}`}>
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

// --- Project sub-components (from team-wise-projects) ---

const APPROVAL_STATUS_CONFIG: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  approved:       { icon: <CheckCircle className="h-3 w-3" />, cls: "text-green-700 bg-green-50 border-green-200",  label: "Approved" },
  rejected:       { icon: <XCircle className="h-3 w-3" />,    cls: "text-red-700 bg-red-50 border-red-200",         label: "Rejected" },
  needs_revision: { icon: <AlertCircle className="h-3 w-3" />,cls: "text-amber-700 bg-amber-50 border-amber-200",   label: "Needs Revision" },
};

function EpisodeApprovalBadge({ status }: { status: string | null }) {
  if (!status || !APPROVAL_STATUS_CONFIG[status]) return null;
  const { icon, cls, label } = APPROVAL_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
      {icon}{label}
    </span>
  );
}

const SCRIPT_STATUS_CONFIG: Record<string, { cls: string }> = {
  on_schedule:     { cls: "text-green-700 bg-green-50 border-green-200" },
  on_hold:         { cls: "text-amber-700 bg-amber-50 border-amber-200" },
  behind_schedule: { cls: "text-red-700 bg-red-50 border-red-200" },
};

function ScriptBadge({ report }: { report: TeamProjectReport }) {
  if (report.scriptProgress === null || !report.scriptStatus) return null;
  const cfg = SCRIPT_STATUS_CONFIG[report.scriptStatus];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
      <Pencil className="h-2.5 w-2.5" />
      {report.scriptCurrentPhase}
    </span>
  );
}

function ProjectsList({ projects, expandedReports, toggleReportEpisodes, openReport }: {
  projects: TeamProjectReport[];
  expandedReports: Set<string>;
  toggleReportEpisodes: (e: React.MouseEvent, id: string) => void;
  openReport: (r: TeamProjectReport) => void;
}) {
  if (projects.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-3">No projects</p>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden divide-y divide-gray-50">
      {projects.map((report) => {
        const received = report.episodes.length;
        const total = report.total_episodes || 0;
        const pct = total > 0 ? Math.round((received / total) * 100) : 0;
        const barColor = total === 0
          ? "bg-gray-300"
          : pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
        const episodesExpanded = expandedReports.has(report.id);

        return (
          <div key={report.id}>
            <div
              className="px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => openReport(report)}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-gray-900 truncate">
                    {report.working_title || "Untitled"}
                  </span>
                  <ScriptBadge report={report} />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {received > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      report.evaluatedEpisodes >= received
                        ? "text-green-700 bg-green-50"
                        : report.evaluatedEpisodes > 0
                          ? "text-amber-700 bg-amber-50"
                          : "text-gray-500 bg-gray-100"
                    }`}>
                      {report.evaluatedEpisodes}/{received} evaluated
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-gray-700">
                    {total > 0 ? `${received}/${total}` : `${received} eps`}
                  </span>
                  {report.episodes.length > 0 && (
                    <button
                      className="text-gray-400 hover:text-gray-700 p-0.5"
                      onClick={(e) => toggleReportEpisodes(e, report.id)}
                    >
                      {episodesExpanded
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${total > 0 ? Math.max(pct, 2) : 0}%` }}
                />
              </div>
            </div>

            {episodesExpanded && report.episodes.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 space-y-1.5">
                {report.episodes.map((ep) => (
                  <div key={ep.id} className="flex items-center gap-2 text-xs text-gray-700 pl-4">
                    <Film className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500 flex-shrink-0">Ep {ep.episode_number}</span>
                    <span className="truncate flex-1">
                      {ep.title || <span className="text-gray-400 italic">Untitled</span>}
                    </span>
                    <EpisodeApprovalBadge status={ep.approval_status} />
                    {ep.evalCompleted > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border text-green-700 bg-green-50 border-green-200">
                        <CheckCircle className="h-3 w-3" />
                        {ep.evalCompleted} eval{ep.evalCompleted > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">No evals</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Helpers ---

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// --- Lazy-loaded sub-components ---

interface MemberStats {
  name: string;
  email: string;
  ideasLogged: number;
  oneLinerEvals: number;
  episodicEvals: number;
  totalActivity: number;
  lastLogin: string | null;
  medianSessionMinutes: number;
}

function TeamMemberActivity({ teamId }: { teamId: string }) {
  const [members, setMembers] = useState<MemberStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch(`/api/management/team-members?teamId=${teamId}`)
      .then((r) => r.json())
      .then((res) => setMembers(res.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-16 text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Loading members...</span>
      </div>
    );
  }

  if (!members || members.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] text-gray-500 font-medium mb-2">Team Members</p>
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500">Ideas</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500">Oneliner Evals</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500">Ep Evals</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500">Total</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500">Last Login</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500">Median Session</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.email} className="border-b border-gray-50 last:border-0">
                <td className="py-1.5 px-3 text-gray-800">{m.name}</td>
                <td className="py-1.5 px-3 text-center text-gray-600">{m.ideasLogged}</td>
                <td className="py-1.5 px-3 text-center text-gray-600">{m.oneLinerEvals}</td>
                <td className="py-1.5 px-3 text-center text-gray-600">{m.episodicEvals}</td>
                <td className="py-1.5 px-3 text-center font-semibold text-gray-800">{m.totalActivity}</td>
                <td className="py-1.5 px-3 text-center text-gray-600">
                  {m.lastLogin ? formatRelativeTime(m.lastLogin) : <span className="text-gray-400">Never</span>}
                </td>
                <td className="py-1.5 px-3 text-center text-gray-600">
                  {m.medianSessionMinutes > 0 ? formatDuration(m.medianSessionMinutes) : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface TrendData {
  period: string;
  call_reports: number;
  evaluations: number;
  stories_approved: number;
}

function MiniTrendChart({ teamId }: { teamId: string }) {
  const [data, setData] = useState<TrendData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch(`/api/management/team-trends?teamId=${teamId}`)
      .then((r) => r.json())
      .then((res) => setData(res.trends || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Loading trends...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-xs">
        No trend data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-sm text-xs">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="h-44">
      <p className="text-[11px] text-gray-500 font-medium mb-2">6-Month Trend</p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="call_reports" name="One-Liners" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="evaluations" name="Evaluations" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="stories_approved" name="Approved" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Main Component ---

export function TopTeamsWidget({ teams }: TopTeamsWidgetProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<TeamProjectReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drillDown, setDrillDown] = useState<{ teamId: string; metric: string; teamName: string } | null>(null);

  const toggle = (teamId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const toggleReportEpisodes = (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    setExpandedReports((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  const openReport = (report: TeamProjectReport) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const openDrillDown = (teamId: string, metric: string, teamName: string) => {
    setDrillDown({ teamId, metric, teamName });
  };

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        No team data available yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {teams.map((team) => {
        const isExpanded = expanded.has(team.team_id);
        const perf = team.performance;
        const projectCount = team.projects.length;
        const scriptingCount = team.projects.filter((r) => r.scriptProgress !== null).length;

        const pb = team.pendingBacklog;
        const pendingOneLinerSubtitle = pb.totalOneLiners > 0
          ? `reviewed ${pb.evaluatedOneLiners}/${pb.totalOneLiners}${pb.oldestOneLinerDays != null ? ` · oldest: ${pb.oldestOneLinerDays}d` : ""}`
          : undefined;
        const pendingEpisodeSubtitle = pb.totalEpisodes > 0
          ? `reviewed ${pb.evaluatedEpisodes}/${pb.totalEpisodes}${pb.oldestEpisodeDays != null ? ` · oldest: ${pb.oldestEpisodeDays}d` : ""}`
          : undefined;

        return (
          <Card key={team.team_id} className="border-gray-200 overflow-hidden">
            {/* Collapsed Header */}
            <button
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:brightness-[0.97] transition-all"
              onClick={() => toggle(team.team_id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600 flex-shrink-0" />
                )}
                <span className="font-semibold text-sm text-gray-900 truncate">
                  {team.team_name}
                </span>
                {team.display_label && (
                  <span className="text-xs text-gray-500 font-normal flex-shrink-0">{team.display_label}</span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                <span>
                  <span className="font-medium text-gray-700">{projectCount}</span>{" "}
                  Project{projectCount !== 1 ? "s" : ""}
                </span>
                {perf && (
                  <span>
                    <span className="font-medium text-gray-700">{(perf.evaluations_completed || 0) + (perf.episodic_evaluations || 0)}</span>{" "}
                    Evals
                  </span>
                )}
                {team.pendingBacklog.pendingOneLiners + team.pendingBacklog.pendingEpisodes > 0 && (
                  <span className="text-amber-600 font-medium">
                    {team.pendingBacklog.pendingOneLiners + team.pendingBacklog.pendingEpisodes} Pending
                  </span>
                )}
                {scriptingCount > 0 && (
                  <span className="text-green-600 font-medium">{scriptingCount} scripting</span>
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <CardContent className="p-4 bg-gray-50 border-t border-gray-100 space-y-4">
                {/* Metrics Grid */}
                {perf && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    <MetricCell
                      icon={<ClipboardList className="h-3.5 w-3.5 text-blue-500" />}
                      label="New Ideas Logged"
                      value={perf.call_reports_created || 0}
                      subtitle={`${perf.call_reports_last_30_days || 0} in last 30d`}
                      onClick={() => openDrillDown(team.team_id, "ideas_logged", team.team_name)}
                    />
                    <MetricCell
                      icon={<CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                      label="One-Liner Evaluations"
                      value={perf.evaluations_completed || 0}
                      subtitle={`${perf.evaluations_last_30_days || 0} in last 30d`}
                      onClick={() => openDrillDown(team.team_id, "oneliner_evals", team.team_name)}
                    />
                    <MetricCell
                      icon={<CheckCircle className="h-3.5 w-3.5 text-cyan-500" />}
                      label="Episodic Evaluations"
                      value={perf.episodic_evaluations || 0}
                      onClick={() => openDrillDown(team.team_id, "episodic_evals", team.team_name)}
                    />
                    <MetricCell
                      icon={<Film className="h-3.5 w-3.5 text-teal-500" />}
                      label="Episodes Received"
                      value={perf.episodes_received || 0}
                      onClick={() => openDrillDown(team.team_id, "episodes_received", team.team_name)}
                    />
                    <MetricCell
                      icon={<Star className="h-3.5 w-3.5 text-amber-500" />}
                      label="Avg Score"
                      value={perf.avg_evaluation_score != null ? perf.avg_evaluation_score.toFixed(1) : "--"}
                    />
                    <MetricCell
                      icon={<ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />}
                      label="Approved"
                      value={perf.stories_approved || 0}
                      subtitle={`${perf.stories_approved_last_30_days || 0} in last 30d`}
                      onClick={() => openDrillDown(team.team_id, "approved", team.team_name)}
                    />
                    <MetricCell
                      icon={<ThumbsDown className="h-3.5 w-3.5 text-red-500" />}
                      label="Rejected"
                      value={perf.stories_rejected || 0}
                      subtitle={`${perf.stories_rejected_last_30_days || 0} in last 30d`}
                      onClick={() => openDrillDown(team.team_id, "rejected", team.team_name)}
                    />
                    <MetricCell
                      icon={<Users className="h-3.5 w-3.5 text-purple-500" />}
                      label="Members"
                      value={perf.team_member_count || 0}
                    />
                    <MetricCell
                      icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
                      label="Pending One-Liners"
                      value={team.pendingBacklog.pendingOneLiners}
                      subtitle={pendingOneLinerSubtitle}
                      onClick={() => openDrillDown(team.team_id, "pending_oneliners", team.team_name)}
                    />
                    <MetricCell
                      icon={<Clock className="h-3.5 w-3.5 text-orange-500" />}
                      label="Pending Episodes"
                      value={team.pendingBacklog.pendingEpisodes}
                      subtitle={pendingEpisodeSubtitle}
                      onClick={() => openDrillDown(team.team_id, "pending_episodes", team.team_name)}
                    />
                  </div>
                )}

                {/* Pending Backlog (shown when no perf data but backlog exists) */}
                {!perf && (team.pendingBacklog.pendingOneLiners > 0 || team.pendingBacklog.pendingEpisodes > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    <MetricCell
                      icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
                      label="Pending One-Liners"
                      value={team.pendingBacklog.pendingOneLiners}
                      subtitle={pendingOneLinerSubtitle}
                      onClick={() => openDrillDown(team.team_id, "pending_oneliners", team.team_name)}
                    />
                    <MetricCell
                      icon={<Clock className="h-3.5 w-3.5 text-orange-500" />}
                      label="Pending Episodes"
                      value={team.pendingBacklog.pendingEpisodes}
                      subtitle={pendingEpisodeSubtitle}
                      onClick={() => openDrillDown(team.team_id, "pending_episodes", team.team_name)}
                    />
                  </div>
                )}

                {/* Projects */}
                <div>
                  <p className="text-[11px] text-gray-500 font-medium mb-2">
                    Projects ({projectCount})
                  </p>
                  <ProjectsList
                    projects={team.projects}
                    expandedReports={expandedReports}
                    toggleReportEpisodes={toggleReportEpisodes}
                    openReport={openReport}
                  />
                </div>

                {/* Trend Chart — lazy loaded */}
                <MiniTrendChart teamId={team.team_id} />

                {/* Member Activity — lazy loaded */}
                <TeamMemberActivity teamId={team.team_id} />
              </CardContent>
            )}
          </Card>
        );
      })}

      <CallReportDetailDialog
        report={selectedReport}
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedReport(null);
        }}
      />

      {drillDown && (
        <DrillDownDialog
          key={`${drillDown.teamId}-${drillDown.metric}`}
          teamId={drillDown.teamId}
          metric={drillDown.metric}
          teamName={drillDown.teamName}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
