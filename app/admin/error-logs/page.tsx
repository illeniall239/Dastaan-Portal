"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFreezeColumns } from "@/lib/hooks/useFreezeColumns";
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
  AlertTriangle,
  Route,
  Users,
  ChevronDown,
  ChevronUp,
  Pin,
} from "lucide-react";
import { format } from "date-fns";

interface ErrorLog {
  id: string;
  timestamp: string;
  route: string | null;
  method: string | null;
  status_code: number;
  error_message: string;
  error_type: string | null;
  error_stack: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  context: Record<string, unknown> | null;
  user: {
    name: string;
    email: string;
    role: string;
  } | null;
}

interface Stats {
  errors_today: number;
  unique_routes_today: number;
  unique_users_today: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

function StatusBadge({ code }: { code: number }) {
  if (code >= 500) return <Badge className="bg-red-100 text-red-700 border-red-200">{code}</Badge>;
  if (code === 429) return <Badge className="bg-orange-100 text-orange-700 border-orange-200">{code}</Badge>;
  if (code >= 400) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{code}</Badge>;
  return <Badge variant="outline">{code}</Badge>;
}

function ErrorTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const colors: Record<string, string> = {
    INTERNAL_ERROR: "bg-red-100 text-red-700",
    DB_ERROR: "bg-purple-100 text-purple-700",
    AUTH_ERROR: "bg-yellow-100 text-yellow-700",
    VALIDATION_ERROR: "bg-blue-100 text-blue-700",
    RATE_LIMIT: "bg-orange-100 text-orange-700",
  };
  return (
    <Badge className={`text-xs ${colors[type] || "bg-gray-100 text-gray-700"}`}>
      {type.replace("_", " ")}
    </Badge>
  );
}

export default function ErrorLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<Stats>({ errors_today: 0, unique_routes_today: 0, unique_users_today: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, limit: 50, offset: 0, hasMore: false });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [freezePanes, setFreezePanes] = useState(false);
  const freezeRef = useFreezeColumns(freezePanes);

  // Filters
  const [routeFilter, setRouteFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "50",
        offset: offset.toString(),
        _t: Date.now().toString(),
      });
      if (routeFilter) params.set("route", routeFilter);
      if (statusFilter && statusFilter !== "all") params.set("statusCode", statusFilter);
      if (startDate) params.set("from", new Date(startDate).toISOString());
      if (endDate) params.set("to", new Date(endDate).toISOString());

      const res = await fetch(`/api/admin/error-logs?${params}`);
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

  const handleFilter = () => fetchLogs(0);

  const handleReset = () => {
    setRouteFilter("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setTimeout(() => fetchLogs(0), 100);
  };

  const exportCSV = () => {
    const headers = ["Timestamp", "Route", "Method", "Status", "Error Type", "Message", "User", "Email", "IP"];
    const rows = logs.map(l => [
      format(new Date(l.timestamp), "yyyy-MM-dd HH:mm:ss"),
      l.route || "",
      l.method || "",
      l.status_code,
      l.error_type || "",
      `"${l.error_message.replace(/"/g, "'")}"`,
      l.user?.name || "Anonymous",
      l.user?.email || "",
      l.ip_address || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Error Logs</h1>
        <p className="text-muted-foreground mt-1">API errors captured in production — who, where, and when</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Errors (24h)</p>
              <p className="text-3xl font-bold text-red-600">{stats.errors_today}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Route className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Routes Affected (24h)</p>
              <p className="text-3xl font-bold text-blue-600">{stats.unique_routes_today}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Users Affected (24h)</p>
              <p className="text-3xl font-bold text-amber-600">{stats.unique_users_today}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs mb-1 block">Route</Label>
              <Input
                placeholder="/api/..."
                value={routeFilter}
                onChange={e => setRouteFilter(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleFilter()}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status Code</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="400">400 Bad Request</SelectItem>
                  <SelectItem value="401">401 Unauthorized</SelectItem>
                  <SelectItem value="403">403 Forbidden</SelectItem>
                  <SelectItem value="404">404 Not Found</SelectItem>
                  <SelectItem value="429">429 Rate Limited</SelectItem>
                  <SelectItem value="500">500 Internal Error</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleFilter} size="sm">Apply Filters</Button>
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
            {loading ? "Loading..." : `${pagination.total.toLocaleString()} errors total`}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-8 text-xs">
              <Pin className="h-3.5 w-3.5" />
              {freezePanes ? "Unfreeze" : "Freeze Panes"}
            </Button>
            <span>Page {currentPage} of {totalPages || 1}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchLogs(Math.max(0, pagination.offset - pagination.limit))}
              disabled={pagination.offset === 0 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchLogs(pagination.offset + pagination.limit)}
              disabled={!pagination.hasMore || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={freezeRef} className="overflow-auto max-h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 bg-background">Timestamp</TableHead>
                  <TableHead className="bg-background">Route</TableHead>
                  <TableHead className="w-16 bg-background">Method</TableHead>
                  <TableHead className="w-20 bg-background">Status</TableHead>
                  <TableHead className="w-32 bg-background">Type</TableHead>
                  <TableHead className="bg-background">Error</TableHead>
                  <TableHead className="w-36 bg-background">User</TableHead>
                  <TableHead className="w-8 bg-background"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No errors found. Great news!
                    </TableCell>
                  </TableRow>
                ) : logs.map(log => (
                  <>
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap bg-background">
                        {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[180px] truncate" title={log.route || ""}>
                        {log.route || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{log.method || "—"}</TableCell>
                      <TableCell><StatusBadge code={log.status_code} /></TableCell>
                      <TableCell><ErrorTypeBadge type={log.error_type} /></TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={log.error_message}>
                        {log.error_message}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.user ? (
                          <div>
                            <div className="font-medium">{log.user.name}</div>
                            <div className="text-muted-foreground">{log.user.role}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Anonymous</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expandedId === log.id
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </TableCell>
                    </TableRow>

                    {expandedId === log.id && (
                      <TableRow key={`${log.id}-detail`} className="bg-muted/30">
                        <TableCell colSpan={8} className="py-4 px-6">
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Full Route</p>
                                <p className="font-mono text-xs">{log.route || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">IP Address</p>
                                <p className="font-mono text-xs">{log.ip_address || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">User</p>
                                <p className="text-xs">{log.user ? `${log.user.name} (${log.user.email})` : "Anonymous"}</p>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Error Message</p>
                              <p className="text-xs bg-red-50 text-red-800 p-2 rounded border border-red-200 whitespace-pre-wrap">
                                {log.error_message}
                              </p>
                            </div>

                            {log.error_stack && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Stack Trace</p>
                                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                  {log.error_stack}
                                </pre>
                              </div>
                            )}

                            {log.context && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Context</p>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.context, null, 2)}
                                </pre>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
