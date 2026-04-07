"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  Wifi,
  WifiOff,
  User,
  Loader2,
} from "lucide-react";
import { TeamBadge } from "@/components/shared/team-badge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionDetail {
  id: string;
  login_at: string;
  last_seen_at: string;
  logout_at: string | null;
  duration_minutes: number;
  status: "online" | "logged_out" | "expired";
}

interface UserActivity {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  team: { name: string; team_type: string } | null;
  account_created: string;
  total_sessions: number;
  total_minutes: number;
  last_login: string | null;           // from user_sessions (our tracking)
  supabase_last_login: string | null;  // from auth.users.last_sign_in_at
  effective_last_login: string | null; // last_login ?? supabase_last_login
  is_online: boolean;
  sessions: SessionDetail[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function roleBadgeColor(role: string) {
  switch (role) {
    case "admin":        return "bg-red-100 text-red-800 border-red-200";
    case "management":   return "bg-purple-100 text-purple-800 border-purple-200";
    case "evaluator":    return "bg-blue-100 text-blue-800 border-blue-200";
    case "programmer":   return "bg-green-100 text-green-800 border-green-200";
    case "content_manager":
    case "content_creator": return "bg-amber-100 text-amber-800 border-amber-200";
    default:             return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ s }: { s: SessionDetail }) {
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {s.status === "online" ? (
          <Wifi className="h-3.5 w-3.5 text-green-500 shrink-0" />
        ) : s.status === "logged_out" ? (
          <LogOut className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <LogIn className="h-3 w-3 text-slate-400" />
            <span className="text-slate-600">{formatDateTime(s.login_at)}</span>
          </div>
          {(s.logout_at || s.status !== "online") && (
            <div className="flex items-center gap-2 mt-0.5">
              <LogOut className="h-3 w-3 text-slate-400" />
              <span className="text-slate-500">
                {s.logout_at
                  ? formatDateTime(s.logout_at)
                  : `Last seen ${formatDateTime(s.last_seen_at)}`}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
          s.status === "online"
            ? "bg-green-50 text-green-700 border-green-200"
            : s.status === "logged_out"
            ? "bg-slate-50 text-slate-500 border-slate-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          {s.status === "online" ? "Online" : s.status === "logged_out" ? "Logged out" : "Expired"}
        </span>
        <span className="text-slate-500 font-medium w-16 text-right">
          {formatDuration(s.duration_minutes)}
        </span>
      </div>
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({ u }: { u: UserActivity }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Clickable summary row */}
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group"
        onClick={() => u.sessions.length > 0 && setOpen((o) => !o)}
      >
        {/* Left: avatar + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            {u.is_online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-slate-900">{u.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleBadgeColor(u.role)}`}>
                {u.role.replace(/_/g, " ")}
              </span>
              {u.team && <TeamBadge team={u.team as any} size="sm" />}
              {u.is_online && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200 font-medium">
                  Online now
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">{u.email}</p>
          </div>
        </div>

        {/* Right: stats + chevron */}
        <div className="flex items-center gap-6 shrink-0 ml-4">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Created</p>
            <p className="text-xs text-slate-600">{formatDate(u.account_created)}</p>
          </div>
          <div className="hidden md:block text-right w-28">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Last Login</p>
            {u.effective_last_login ? (
              <p className="text-xs text-slate-600">
                {timeAgo(u.effective_last_login)}
                {!u.last_login && u.supabase_last_login && (
                  <span className="ml-1 text-[9px] text-slate-400" title="From Supabase auth">(auth)</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Never</p>
            )}
          </div>
          <div className="text-right w-16">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Sessions</p>
            <p className="text-sm font-semibold text-slate-700">{u.total_sessions}</p>
          </div>
          <div className="text-right w-20">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total Time</p>
            <p className="text-sm font-semibold text-slate-700">
              {u.total_sessions > 0 ? formatDuration(u.total_minutes) : "—"}
            </p>
          </div>
          {u.sessions.length > 0 ? (
            open
              ? <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              : <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          ) : (
            <div className="w-4" />
          )}
        </div>
      </div>

      {/* Expanded session history */}
      {u.sessions.length > 0 && open && (
        <div className="px-6 pb-3 bg-slate-50/50 border-t">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 pt-2 pb-1 font-medium">
            Session History ({u.sessions.length})
          </p>
          {u.sessions.map((s) => (
            <SessionRow key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LoginActivityList() {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/login-activity?_t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load login activity");
        return;
      }
      setUsers(data.users);
      setLastRefreshed(new Date());
    } catch {
      setError("Failed to load login activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const onlineCount = users.filter((u) => u.is_online).length;
  const totalSessions = users.reduce((acc, u) => acc + u.total_sessions, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Login Activity</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track who has logged in and how long they've been active
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <p className="text-xs text-slate-400 hidden sm:block">
              Updated {timeAgo(lastRefreshed.toISOString())}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={fetchActivity} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Users</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                Online Now
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">{onlineCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Sessions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalSessions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Never Logged In</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {users.filter((u) => !u.effective_last_login).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User list */}
      <Card>
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              User Sessions
            </CardTitle>
            <p className="text-xs text-slate-400">Click a row to expand session history</p>
          </div>

          {/* Column headers */}
          <div className="flex items-center justify-end gap-6 px-0 pt-3 pb-2 border-b text-[10px] uppercase tracking-wide text-slate-400 font-medium">
            <span className="hidden sm:block w-20 text-right">Created</span>
            <span className="hidden md:block w-24 text-right">Last Login</span>
            <span className="w-16 text-right">Sessions</span>
            <span className="w-20 text-right">Total Time</span>
            <span className="w-4" />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchActivity}>Retry</Button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              No users found.
            </div>
          ) : (
            <div className="divide-y">
              {users.map((u) => <UserRow key={u.id} u={u} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
