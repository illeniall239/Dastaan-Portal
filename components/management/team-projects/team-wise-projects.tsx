"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Film, CheckCircle, XCircle, AlertCircle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { CallReportDetailDialog } from "@/components/management/call-report-detail-dialog";
import type { TeamProjectGroup, TeamProjectReport } from "@/lib/management/team-projects";

interface TeamWiseProjectsProps {
  teams: TeamProjectGroup[];
}

const TEAM_COLORS = { bg: "bg-gray-50", border: "border-gray-200", header: "bg-gradient-to-r from-gray-50 to-gray-100" };


const APPROVAL_STATUS_CONFIG: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  approved:       { icon: <CheckCircle className="h-3 w-3" />, cls: "text-green-700 bg-green-50 border-green-200",  label: "Approved" },
  rejected:       { icon: <XCircle className="h-3 w-3" />,    cls: "text-red-700 bg-red-50 border-red-200",         label: "Rejected" },
  needs_revision: { icon: <AlertCircle className="h-3 w-3" />,cls: "text-amber-700 bg-amber-50 border-amber-200",   label: "Needs Revision" },
};

function EpisodeApprovalBadge({ status }: { status: string | null }) {
  if (!status || !APPROVAL_STATUS_CONFIG[status]) {
    return null;
  }
  const { icon, cls, label } = APPROVAL_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

const SCRIPT_STATUS_CONFIG: Record<string, { cls: string; dot: string }> = {
  on_schedule:     { cls: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500" },
  on_hold:         { cls: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  behind_schedule: { cls: "text-red-700 bg-red-50 border-red-200",      dot: "bg-red-500" },
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

export function TeamWiseProjects({ teams }: TeamWiseProjectsProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<TeamProjectReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
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

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        No team projects found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => {
        const colors = TEAM_COLORS;
        const isExpanded = expandedTeams.has(team.team_id);

        const scriptingCount = team.call_reports.filter((r) => r.scriptProgress !== null).length;

        return (
          <Card key={team.team_id} className={`${colors.border} overflow-hidden`}>
            {/* Team Header */}
            <button
              className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 ${colors.header} hover:brightness-[0.97] transition-all`}
              onClick={() => toggleTeam(team.team_id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600 flex-shrink-0" />
                )}
                <span className="font-semibold text-sm text-gray-900 truncate">{team.team_name}</span>
                {team.display_label && (
                  <span className="text-xs text-gray-500 font-normal flex-shrink-0">{team.display_label}</span>
                )}
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {team.call_reports.length} project{team.call_reports.length !== 1 ? "s" : ""}
                {scriptingCount > 0 && (
                  <span className="text-green-600 font-medium"> · {scriptingCount} in scripting</span>
                )}
              </span>
            </button>

            {/* Call Reports List */}
            {isExpanded && (
              <CardContent className={`p-0 ${colors.bg}`}>
                {team.call_reports.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No projects for this team.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {team.call_reports.map((report) => {
                      const received = report.episodes.length;
                      const total = report.total_episodes || 0;
                      const pct = total > 0 ? Math.round((received / total) * 100) : 0;
                      const barColor = total === 0
                        ? "bg-gray-300"
                        : pct >= 70
                          ? "bg-emerald-500"
                          : pct >= 40
                            ? "bg-amber-500"
                            : "bg-red-500";
                      const episodesExpanded = expandedReports.has(report.id);

                      return (
                        <div key={report.id} className="bg-white">
                          {/* Call Report Row */}
                          <div
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => openReport(report)}
                          >
                            {/* Title + meta */}
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-gray-900 truncate">
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
                                <span className="text-xs font-semibold text-gray-700">
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

                            {/* Progress bar */}
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${total > 0 ? Math.max(pct, 2) : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Episodes Inline List */}
                          {episodesExpanded && report.episodes.length > 0 && (
                            <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 space-y-1.5">
                              {report.episodes.map((ep) => (
                                <div
                                  key={ep.id}
                                  className="flex items-center gap-2 text-xs text-gray-700 pl-6"
                                >
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
                )}
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
    </div>
  );
}
