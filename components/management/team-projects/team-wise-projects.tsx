"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ChevronDown, FileText, Film, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { CallReportDetailDialog } from "@/components/management/call-report-detail-dialog";
import type { TeamProjectGroup, TeamProjectReport } from "@/lib/management/team-projects";

interface TeamWiseProjectsProps {
  teams: TeamProjectGroup[];
}

const TEAM_TYPE_COLORS: Record<string, { bg: string; border: string; badge: string; header: string }> = {
  content:    { bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-800 border-blue-300",    header: "bg-gradient-to-r from-blue-50 to-blue-100" },
  evaluator:  { bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-800 border-yellow-300",header: "bg-gradient-to-r from-yellow-50 to-yellow-100" },
  programmer: { bg: "bg-indigo-50", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-800 border-indigo-300",header: "bg-gradient-to-r from-indigo-50 to-indigo-100" },
  gcm:        { bg: "bg-teal-50",   border: "border-teal-200",   badge: "bg-teal-100 text-teal-800 border-teal-300",     header: "bg-gradient-to-r from-teal-50 to-teal-100" },
  management: { bg: "bg-slate-50",  border: "border-slate-200",  badge: "bg-slate-100 text-slate-800 border-slate-300",  header: "bg-gradient-to-r from-slate-50 to-slate-100" },
  other:      { bg: "bg-gray-50",   border: "border-gray-200",   badge: "bg-gray-100 text-gray-700 border-gray-300",     header: "bg-gradient-to-r from-gray-50 to-gray-100" },
};

const TEAM_TYPE_LABELS: Record<string, string> = {
  content: "Content", evaluator: "Evaluator", programmer: "Programmer",
  gcm: "GCM", management: "Management", other: "Other",
};


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
        const colors = TEAM_TYPE_COLORS[team.team_type] ?? TEAM_TYPE_COLORS.other;
        const isExpanded = expandedTeams.has(team.team_id);

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
                <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${colors.badge}`}>
                  {TEAM_TYPE_LABELS[team.team_type] ?? team.team_type}
                </Badge>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {team.call_reports.length} project{team.call_reports.length !== 1 ? "s" : ""}
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
                      const episodesExpanded = expandedReports.has(report.id);
                      return (
                        <div key={report.id} className="bg-white">
                          {/* Call Report Row */}
                          <div
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => openReport(report)}
                          >
                            <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">
                                  {report.call_report_id}
                                </span>
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {report.working_title || "Untitled"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[11px] text-gray-400">
                                  {report.meeting_date
                                    ? format(new Date(report.meeting_date), "MMM d, yyyy")
                                    : "No date"}
                                </span>
                                {report.genre && report.genre.length > 0 && (
                                  <span className="text-[11px] text-gray-400">· {report.genre.join(", ")}</span>
                                )}
                              </div>
                            </div>
                            {/* Episodes toggle */}
                            {report.episodes.length > 0 && (
                              <button
                                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 flex-shrink-0 mt-0.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                onClick={(e) => toggleReportEpisodes(e, report.id)}
                              >
                                <Film className="h-3 w-3" />
                                {report.episodes.length} ep{report.episodes.length !== 1 ? "s" : ""}
                                {episodesExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            )}
                            {report.episodes.length === 0 && (
                              <span className="text-[11px] text-gray-300 flex-shrink-0 mt-0.5">No eps</span>
                            )}
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
