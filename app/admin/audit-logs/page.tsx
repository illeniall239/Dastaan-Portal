"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Download, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  timestamp: string;
  details: Record<string, any> | null;
  performed_by_user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  // Filters
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchAuditLogs = async (offset: number = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
      });

      if (entityType) params.append("entityType", entityType);
      if (action) params.append("action", action);
      if (performedBy) params.append("performedBy", performedBy);
      if (startDate) params.append("startDate", new Date(startDate).toISOString());
      if (endDate) params.append("endDate", new Date(endDate).toISOString());

      const response = await fetch(`/api/admin/audit-logs?${params}`);

      if (!response.ok) {
        if (response.status === 403) {
          router.push("/unauthorized");
          return;
        }
        throw new Error("Failed to fetch audit logs");
      }

      const data: AuditLogsResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(0);
  }, []);

  const handleFilter = () => {
    fetchAuditLogs(0);
  };

  const handleReset = () => {
    setEntityType("");
    setAction("");
    setPerformedBy("");
    setStartDate("");
    setEndDate("");
    setTimeout(() => fetchAuditLogs(0), 100);
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      const newOffset = pagination.offset + pagination.limit;
      fetchAuditLogs(newOffset);
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      const newOffset = Math.max(0, pagination.offset - pagination.limit);
      fetchAuditLogs(newOffset);
    }
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "User", "Email", "Action", "Entity Type", "Entity ID", "IP Address"];
    const rows = logs.map(log => [
      format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      log.performed_by_user?.name || "Unknown",
      log.performed_by_user?.email || "Unknown",
      log.action,
      log.entity_type,
      log.entity_id,
      log.details?.ipAddress || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case "created":
        return "default";
      case "updated":
      case "role_changed":
        return "secondary";
      case "deleted":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Complete audit trail of all admin operations</p>
        </div>
        <Button onClick={exportToCSV} disabled={logs.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter audit logs by criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger id="entityType">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="external_evaluation">External Evaluation</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="call_report">Call Report</SelectItem>
                  <SelectItem value="evaluation">Evaluation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="role_changed">Role Changed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 flex items-end gap-2">
              <Button onClick={handleFilter} className="flex-1">
                <Search className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail ({pagination.total} total records)</CardTitle>
          <CardDescription>
            Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{log.performed_by_user?.name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">
                              {log.performed_by_user?.email || log.performed_by}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.entity_type}</TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[200px]">
                          {log.entity_id}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.details?.ipAddress || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <Button
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0}
                  variant="outline"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Page {Math.floor(pagination.offset / pagination.limit) + 1} of{" "}
                  {Math.ceil(pagination.total / pagination.limit)}
                </span>

                <Button
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore}
                  variant="outline"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedLog && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Log Details</CardTitle>
            <CardDescription>Full details for {selectedLog.action} on {selectedLog.entity_type}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-mono text-sm">{format(new Date(selectedLog.timestamp), "PPpp")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Performed By</Label>
                  <p className="font-medium">{selectedLog.performed_by_user?.name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.performed_by_user?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <p>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity</Label>
                  <p className="font-mono text-sm">{selectedLog.entity_type}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedLog.entity_id}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Request Context</Label>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">IP Address:</span>{" "}
                    <span className="font-mono">{selectedLog.details?.ipAddress || "N/A"}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">User Agent:</span>{" "}
                    <span className="font-mono text-xs">{selectedLog.details?.userAgent || "N/A"}</span>
                  </p>
                </div>
              </div>

              {selectedLog.details?.previousValues && (
                <div>
                  <Label className="text-muted-foreground">Previous Values</Label>
                  <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details.previousValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.details?.newValues && (
                <div>
                  <Label className="text-muted-foreground">New Values</Label>
                  <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.details && !selectedLog.details.previousValues && !selectedLog.details.newValues && (
                <div>
                  <Label className="text-muted-foreground">Full Details</Label>
                  <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              <Button onClick={() => setSelectedLog(null)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
