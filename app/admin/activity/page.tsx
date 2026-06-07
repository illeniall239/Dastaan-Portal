"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  MousePointer,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pin,
} from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  timestamp: string;
  type: "page_view" | "click" | "client_error";
  user_id: string | null;
  session_id: string | null;
  route: string | null;
  element_tag: string | null;
  element_text: string | null;
  element_id: string | null;
  error_message: string | null;
  error_stack: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  user: { name: string; email: string; role: string } | null;
}

interface Stats {
  page_views_today: number;
  clicks_today: number;
  client_errors_today: number;
}

const TYPE_CONFIG = {
  page_view: { label: "Page View", color: "bg-blue-100 text-blue-700", icon: Eye },
  click: { label: "Click", color: "bg-green-100 text-green-700", icon: MousePointer },
  client_error: { label: "Client Error", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
  if (!config) return <Badge variant="outline">{type}</Badge>;
  return <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>;
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats>({ page_views_today: 0, clicks_today: 0, client_errors_today: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [freezePanes, setFreezePanes] = useState(false);

  const [typeFilter, setTypeFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", offset: offset.toString(), _t: Date.now().toString() });
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      if (routeFilter) params.set("route", routeFilter);
      if (startDate) params.set("from", new Date(startDate).toISOString());
      if (endDate) params.set("to", new Date(endDate).toISOString());

      const res = await fetch(`/api/admin/activity-logs?${params}`);
      if (!res.ok) {
        if (res.status === 403) { router.push("/unauthorized"); return; }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setLogs(data.logs);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(0); }, []);

  const handleReset = () => {
    setTypeFilter("all");
    setRouteFilter("");
    setStartDate("");
    setEndDate("");
    setTimeout(() => fetchLogs(0), 100);
  };

  const exportCSV = () => {
    const headers = ["Timestamp", "Type", "User", "Email", "Route", "Detail", "Session", "IP"];
    const rows = logs.map(l => {
      let detail = "";
      if (l.type === "click") detail = `${l.element_tag || ""} "${l.element_text || ""}"`;
      if (l.type === "client_error") detail = l.error_message || "";
      return [
        format(new Date(l.timestamp), "yyyy-MM-dd HH:mm:ss"),
        l.type,
        l.user?.name || "Anonymous",
        l.user?.email || "",
        l.route || "",
        `"${detail.replace(/"/g, "'")}"`,
        l.session_id || "",
        l.ip_address || "",
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">Every page visit, click, and client-side error — who did what, where, and when</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full"><Eye className="h-6 w-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Page Views (24h)</p>
              <p className="text-3xl font-bold text-blue-600">{stats.page_views_today.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full"><MousePointer className="h-6 w-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Clicks (24h)</p>
              <p className="text-3xl font-bold text-green-600">{stats.clicks_today.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Client Errors (24h)</p>
              <p className="text-3xl font-bold text-red-600">{stats.client_errors_today.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs mb-1 block">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="page_view">Page Views</SelectItem>
                  <SelectItem value="click">Clicks</SelectItem>
                  <SelectItem value="client_error">Client Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Route</Label>
              <Input placeholder="/admin/..." value={routeFilter} onChange={e => setRouteFilter(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchLogs(0)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">From</Label>
              <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">To</Label>
              <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => fetchLogs(0)} size="sm">Apply</Button>
            <Button onClick={handleReset} variant="outline" size="sm">Reset</Button>
            <Button onClick={exportCSV} variant="outline" size="sm" className="ml-auto gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${pagination.total.toLocaleString()} events total`}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-8 text-xs">
              <Pin className="h-3.5 w-3.5" />
              {freezePanes ? "Unfreeze" : "Freeze Panes"}
            </Button>
            <span>Page {currentPage} of {totalPages || 1}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchLogs(Math.max(0, pagination.offset - pagination.limit))} disabled={pagination.offset === 0 || loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchLogs(pagination.offset + pagination.limit)} disabled={!pagination.hasMore || loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow className={freezePanes ? "sticky top-0 z-10" : ""}>
                  <TableHead className={`w-36 bg-background ${freezePanes ? "sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>Timestamp</TableHead>
                  <TableHead className="w-28 bg-background">Type</TableHead>
                  <TableHead className="w-36 bg-background">User</TableHead>
                  <TableHead className="bg-background">Route</TableHead>
                  <TableHead className="bg-background">Detail</TableHead>
                  <TableHead className="w-8 bg-background"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No activity found.</TableCell></TableRow>
                ) : logs.map(log => {
                  const detail = log.type === "click"
                    ? `${log.element_tag || ""} "${log.element_text || ""}"`
                    : log.type === "client_error"
                    ? log.error_message || ""
                    : "";

                  return (
                    <>
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                        <TableCell className={`text-xs text-muted-foreground whitespace-nowrap bg-background ${freezePanes ? "sticky left-0 z-[9] shadow-[2px_0_5px_rgba(0,0,0,0.06)]" : ""}`}>
                          {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell><TypeBadge type={log.type} /></TableCell>
                        <TableCell className="text-xs">
                          {log.user ? (
                            <div>
                              <div className="font-medium">{log.user.name}</div>
                              <div className="text-muted-foreground">{log.user.role}</div>
                            </div>
                          ) : <span className="text-muted-foreground">Anonymous</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[160px] truncate" title={log.route || ""}>{log.route || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate text-muted-foreground" title={detail}>{detail || "—"}</TableCell>
                        <TableCell>
                          {expandedId === log.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                      </TableRow>

                      {expandedId === log.id && (
                        <TableRow key={`${log.id}-detail`} className="bg-muted/30">
                          <TableCell colSpan={6} className="py-4 px-6">
                            <div className="space-y-3 text-sm">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <p className="font-semibold text-muted-foreground uppercase mb-1">Session</p>
                                  <p className="font-mono">{log.session_id ? log.session_id.slice(0, 8) + "..." : "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-muted-foreground uppercase mb-1">IP</p>
                                  <p className="font-mono">{log.ip_address || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-muted-foreground uppercase mb-1">User</p>
                                  <p>{log.user ? `${log.user.name} (${log.user.email})` : "Anonymous"}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-muted-foreground uppercase mb-1">Route</p>
                                  <p className="font-mono">{log.route || "—"}</p>
                                </div>
                              </div>

                              {log.type === "click" && (
                                <div className="text-xs">
                                  <p className="font-semibold text-muted-foreground uppercase mb-1">Element</p>
                                  <p className="bg-green-50 text-green-800 p-2 rounded border border-green-200">
                                    <span className="font-mono">&lt;{log.element_tag}&gt;</span>
                                    {log.element_id && <span className="ml-2 text-muted-foreground">#{log.element_id}</span>}
                                    {log.element_text && <span className="ml-2">"{log.element_text}"</span>}
                                  </p>
                                </div>
                              )}

                              {log.type === "client_error" && (
                                <>
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Error</p>
                                    <p className="text-xs bg-red-50 text-red-800 p-2 rounded border border-red-200">{log.error_message}</p>
                                  </div>
                                  {log.error_stack && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Stack</p>
                                      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">{log.error_stack}</pre>
                                    </div>
                                  )}
                                </>
                              )}

                              {log.metadata && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Metadata</p>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                                </div>
                              )}

                              {log.user_agent && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">User Agent</p>
                                  <p className="text-xs text-muted-foreground break-all">{log.user_agent}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
