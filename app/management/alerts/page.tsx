"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnDef } from "@/components/management/shared/data-table";
import { FilterSidebar, FilterConfig } from "@/components/management/shared/filter-sidebar";
import { ExportButton } from "@/components/management/shared/export-button";
import { StatusBadge } from "@/components/management/shared/status-badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { CriticalAlert } from "@/lib/management/critical-alerts";

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<CriticalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({
    severity: "all",
    type: "all",
  });

  // Fetch data
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const url = `/api/management/alerts`;

        const response = await fetch(url);
        const data = await response.json();
        setAlerts(data.alerts || []);
        setFilteredAlerts(data.alerts || []);
      } catch (error) {
        console.error("Error fetching alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...alerts];

    if (filters.severity && filters.severity !== "all") {
      filtered = filtered.filter(a => a.severity === filters.severity);
    }

    if (filters.type && filters.type !== "all") {
      filtered = filtered.filter(a => a.type === filters.type);
    }

    setFilteredAlerts(filtered);
  }, [filters, alerts]);

  const filterConfig: FilterConfig[] = [
    {
      id: "severity",
      label: "Severity",
      type: "select",
      options: [
        { label: "Critical", value: "critical" },
        { label: "Warning", value: "warning" },
        { label: "Info", value: "info" },
      ],
    },
    {
      id: "type",
      label: "Alert Type",
      type: "select",
      options: [
        { label: "Bottleneck", value: "bottleneck" },
        { label: "Stuck Story", value: "stuck_story" },
        { label: "Evaluation Delay", value: "evaluation_delay" },
        { label: "Long Negotiation", value: "long_negotiation" },
        { label: "Payment Overdue", value: "payment_overdue" },
      ],
    },
  ];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const columns: ColumnDef<CriticalAlert>[] = [
    {
      id: "severity",
      header: "Severity",
      accessorKey: "severity",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getSeverityIcon(row.severity)}
          <StatusBadge status={row.severity} />
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      cell: (row) => (
        <span className="font-medium">
          {row.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      ),
    },
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      className: "max-w-[200px]",
    },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      className: "max-w-[300px]",
    },
    {
      id: "affected",
      header: "Affected Entity",
      accessorKey: "affectedEntity",
      className: "max-w-[200px] truncate",
    },
    {
      id: "days",
      header: "Days Delayed",
      accessorKey: "daysDelayed",
      cell: (row) => row.daysDelayed ? `${row.daysDelayed} days` : "N/A",
    },
    {
      id: "created",
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ severity: "all", type: "all" });
  };

  const handleRowClick = (row: CriticalAlert) => {
    // Navigate to the affected entity
    // This logic will depend on the alert type
    if (row.type === "stuck_story" || row.type === "long_negotiation") {
      router.push(`/management/stories/${row.entityId}`);
    } else if (row.type === "evaluation_delay") {
      router.push(`/content-department/call-reports/${row.entityId}`);
    }
    // Add more navigation logic as needed
  };

  // Prepare export data
  const exportData = filteredAlerts.map(a => ({
    "Severity": a.severity,
    "Type": a.type,
    "Title": a.title,
    "Description": a.description,
    "Affected Entity": a.affectedEntity,
    "Days Delayed": a.daysDelayed || "N/A",
    "Created": new Date(a.createdAt).toLocaleDateString(),
  }));

  // Calculate stats
  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === "critical").length,
    warning: alerts.filter(a => a.severity === "warning").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading critical alerts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <BackButton fallbackHref="/management" variant="outline" size="sm" />

      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/management">Management Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Critical Alerts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Critical Alerts</h1>
          <p className="text-muted-foreground">
            System-wide alerts requiring attention
          </p>
        </div>
        <ExportButton
          data={exportData}
          filename="critical-alerts"
          disabled={filteredAlerts.length === 0}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Alerts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Warning Alerts
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{stats.warning}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Alerts
              </CardTitle>
              <Info className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAlerts.length} after filters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* Filters Sidebar */}
        <FilterSidebar
          filters={filterConfig}
          values={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          totalResults={filteredAlerts.length}
        />

        {/* Data Table */}
        <div>
          {filteredAlerts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-green-100 p-3">
                  <AlertCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">All Systems Running Smoothly</h3>
                <p className="text-sm text-muted-foreground">
                  No critical alerts at this time
                </p>
              </div>
            </Card>
          ) : (
            <DataTable
              data={filteredAlerts}
              columns={columns}
              onRowClick={handleRowClick}
              emptyMessage="No alerts found"
              pageSize={15}
            />
          )}
        </div>
      </div>
    </div>
  );
}
