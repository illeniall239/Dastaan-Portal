"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users, Clock, AlertCircle } from "lucide-react";
import { TeamBadge } from "@/components/shared/team-badge";

interface MemberData {
  user_id: string;
  name: string;
  role: string;
  call_reports: number;
  evaluations: number;
  one_liners: number;
  last_activity: string | null;
  is_idle: boolean;
}

interface TeamActivityData {
  team_id: string;
  team_name: string;
  team_type: string;
  member_count: number;
  call_reports: number;
  evaluations: number;
  one_liners: number;
  last_activity: string | null;
  members: MemberData[];
}

interface MemberActivityTableProps {
  data: TeamActivityData[];
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-slate-800">{value}</p>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function MemberRow({ m }: { m: MemberData }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 hover:bg-slate-50">
      <div className="flex items-center gap-3 min-w-0 pl-6">
        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-medium text-slate-600">
            {m.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-700">{m.name}</span>
            <span className="text-[10px] text-slate-400 capitalize">{m.role.replace(/_/g, " ")}</span>
            {m.is_idle && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                <AlertCircle className="h-2.5 w-2.5" />
                Idle
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-8 shrink-0 mr-2">
        <StatCell value={m.call_reports} label="Reports" />
        <StatCell value={m.evaluations} label="Evals" />
        <StatCell value={m.one_liners} label="1-Liners" />
        <div className="w-20 text-right">
          <p className="text-xs text-slate-500">{timeAgo(m.last_activity)}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Last active</p>
        </div>
      </div>
    </div>
  );
}

function TeamRow({ team }: { team: TeamActivityData }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group"
        onClick={() => team.member_count > 0 && setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {team.member_count > 0 ? (
            open
              ? <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
              : <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
          ) : (
            <div className="w-4 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-slate-900">{team.team_name}</span>
              <TeamBadge team={{ name: team.team_name, team_type: team.team_type } as any} size="sm" />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {team.member_count} member{team.member_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 shrink-0 mr-2">
          <StatCell value={team.call_reports} label="Reports" />
          <StatCell value={team.evaluations} label="Evals" />
          <StatCell value={team.one_liners} label="1-Liners" />
          <div className="w-20 text-right">
            <p className="text-xs text-slate-500">{timeAgo(team.last_activity)}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Last active</p>
          </div>
        </div>
      </div>

      {open && team.members.length > 0 && (
        <div>
          {team.members.map(m => <MemberRow key={m.user_id} m={m} />)}
        </div>
      )}
    </div>
  );
}

export function MemberActivityTable({ data }: MemberActivityTableProps) {
  const sortedTeams = [...data].sort((a, b) => {
    const aTotal = a.call_reports + a.evaluations + a.one_liners;
    const bTotal = b.call_reports + b.evaluations + b.one_liners;
    return bTotal - aTotal;
  });

  return (
    <Card>
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Member Activity
          </CardTitle>
          <p className="text-xs text-slate-400">Click a team to expand members</p>
        </div>
        {/* Column headers */}
        <div className="flex items-center justify-end gap-8 px-0 pt-3 pb-2 border-b text-[10px] uppercase tracking-wide text-slate-400 font-medium mr-2">
          <span className="w-12 text-center">Reports</span>
          <span className="w-12 text-center">Evals</span>
          <span className="w-12 text-center">1-Liners</span>
          <span className="w-20 text-right">Last Active</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            No team activity found.
          </div>
        ) : (
          <div className="divide-y">
            {sortedTeams.map(team => <TeamRow key={team.team_id} team={team} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
