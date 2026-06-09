"use client";

import { useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users, ShieldCheck, Pin } from "lucide-react";
import { TeamBadge } from "@/components/shared/team-badge";

interface MemberData {
  user_id: string;
  name: string;
  role: string;
  call_reports: number;
  pending_evals: number;
  evaluations: number;
  one_liners: number;
  episodes_logged: number;
  episodes_evaluated: number;
  pending_eps_evals: number;
  last_activity: string | null;
  is_idle: boolean;
  total_sessions: number;
  period_minutes: number;
  effective_last_login: string | null;
  is_online: boolean;
}

interface TeamData {
  team_id: string;
  team_name: string;
  team_type: string;
  member_count: number;
  call_reports: number;
  pending_evals: number;
  evaluations: number;
  one_liners: number;
  episodes_logged: number;
  episodes_evaluated: number;
  pending_eps_evals: number;
  online_count: number;
  last_activity: string | null;
  members: MemberData[];
}

interface AccountabilityTableProps {
  data: TeamData[];
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
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

function formatDuration(minutes: number): string {
  if (minutes < 1) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Num({ value }: { value: number }) {
  return (
    <span className={`font-medium tabular-nums ${value === 0 ? "text-slate-300" : "text-slate-800"}`}>
      {value}
    </span>
  );
}

function TeamRows({ team, freeze }: { team: TeamData; freeze: boolean }) {
  const [open, setOpen] = useState(false);
  const hasMembers = team.member_count > 0;

  return (
    <>
      {/* Team row */}
      <tr
        className={`border-b border-slate-100 transition-colors ${hasMembers ? "cursor-pointer hover:bg-slate-50" : ""} group`}
        onClick={() => hasMembers && setOpen(o => !o)}
      >
        <td className={`px-4 py-3 ${freeze ? "sticky left-0 z-[9] bg-white shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-4 shrink-0 flex items-center justify-center">
              {hasMembers ? (
                open
                  ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  : <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-slate-900">{team.team_name}</span>
                <TeamBadge team={{ name: team.team_name.match(/\(([^)]+)\)/)?.[0] ?? team.team_name, team_type: team.team_type } as any} size="sm" />
                {team.online_count > 0 && (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                    {team.online_count} online
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {team.member_count} member{team.member_count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="font-semibold text-slate-800 tabular-nums">{team.call_reports}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="font-semibold text-slate-800 tabular-nums">{team.evaluations}</span>
        </td>
        <td className="px-4 py-3 text-center">
          {team.pending_evals > 0 ? (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-red-100 text-red-700">
              {team.pending_evals} pending
            </span>
          ) : (
            <span className="text-slate-300 text-sm font-medium tabular-nums">0</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="font-semibold text-slate-800 tabular-nums">{team.episodes_logged}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="font-semibold text-slate-800 tabular-nums">{team.episodes_evaluated}</span>
        </td>
        {/* Pending Eps Eval cell hidden for now */}
        <td className="px-4 py-3 text-right hidden md:table-cell">
          <p className="text-xs text-slate-500">{timeAgo(team.last_activity)}</p>
        </td>
        <td className="px-4 py-3 text-right hidden md:table-cell">
          <p className="text-xs text-slate-400">—</p>
        </td>
      </tr>

      {/* Member rows */}
      {open && team.members.map(m => (
        <tr key={m.user_id} className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50">
          <td className={`px-4 py-2 pl-12 ${freeze ? "sticky left-0 z-[9] bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-slate-600">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {m.is_online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-700 truncate">{m.name}</span>
                </div>
              </div>
            </div>
          </td>
          <td className="px-4 py-2 text-center"><Num value={m.call_reports} /></td>
          <td className="px-4 py-2 text-center"><Num value={m.evaluations} /></td>
          <td className="px-4 py-2 text-center">
            {m.pending_evals > 0 ? (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-red-100 text-red-700">
                {m.pending_evals} pending
              </span>
            ) : (
              <span className="text-slate-300 text-sm font-medium tabular-nums">0</span>
            )}
          </td>
          <td className="px-4 py-2 text-center"><Num value={m.episodes_logged} /></td>
          <td className="px-4 py-2 text-center"><Num value={m.episodes_evaluated} /></td>
          {/* Pending Eps Eval cell hidden for now */}
          <td className="px-4 py-2 text-right hidden md:table-cell">
            {m.effective_last_login ? (
              <div>
                <p className="text-xs text-slate-500 leading-tight">{timeAgo(m.effective_last_login)}</p>
                {m.total_sessions > 0 && (
                  <p className="text-[10px] text-slate-400">{m.total_sessions} session{m.total_sessions !== 1 ? "s" : ""}</p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-amber-600 font-medium">Never logged in</p>
            )}
          </td>
          <td className="px-4 py-2 text-right hidden md:table-cell">
            <p className="text-xs text-slate-500">{formatDuration(m.period_minutes)}</p>
          </td>
        </tr>
      ))}
    </>
  );
}

export function AccountabilityTable({ data }: AccountabilityTableProps) {
  const [freezePanes, setFreezePanes] = useState(false);
  const sorted = [...data].sort((a, b) => {
    const aTotal = a.call_reports + a.evaluations;
    const bTotal = b.call_reports + b.evaluations;
    return bTotal - aTotal;
  });

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Team Accountability
        </CardTitle>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400 hidden sm:block">Click a team to expand members</p>
          <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-7 text-xs px-2">
            <Pin className="h-3 w-3" />
            {freezePanes ? "Unfreeze" : "Freeze Panes"}
          </Button>
        </div>
      </div>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            No team data found.
          </div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b bg-slate-50 ${freezePanes ? "sticky top-0 z-10" : ""}`}>
                  <th className={`px-4 py-2 text-left text-[10px] uppercase tracking-wide text-slate-400 font-medium bg-slate-50 ${freezePanes ? "sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>Team / Member</th>
                  <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap bg-slate-50">New Ideas Logged</th>
                  <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap bg-slate-50">Evals Done</th>
                  <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wide text-amber-500 font-medium whitespace-nowrap bg-slate-50">Pending Evals</th>
                  <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap bg-slate-50">Eps Logged</th>
                  <th className="px-4 py-2 text-center text-[10px] uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap bg-slate-50">Eps Eval</th>
                  {/* Pending Eps Eval column hidden for now — data available via pending_eps_evals */}
                  <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wide text-slate-400 font-medium hidden md:table-cell whitespace-nowrap bg-slate-50">Last Login</th>
                  <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wide text-slate-400 font-medium hidden md:table-cell whitespace-nowrap bg-slate-50">Median Session</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(team => <TeamRows key={team.team_id} team={team} freeze={freezePanes} />)}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
