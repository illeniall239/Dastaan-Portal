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
import { DollarSign, Clock, TrendingUp } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { OverduePayment } from "@/lib/management/overdue-payments";

export default function OverduePaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<OverduePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<OverduePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalAmount: 0, avgDaysOverdue: 0, criticalCount: 0 });
  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    daysOverdue: "all",
  });

  // Fetch data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const url = `/api/management/payments/overdue`;

        const response = await fetch(url);
        const data = await response.json();
        setPayments(data.payments || []);
        setStats(data.stats || { total: 0, totalAmount: 0, avgDaysOverdue: 0, criticalCount: 0 });
        setFilteredPayments(data.payments || []);
      } catch (error) {
        console.error("Error fetching overdue payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...payments];

    // Days overdue filter
    if (filters.daysOverdue && filters.daysOverdue !== "all") {
      const threshold = parseInt(filters.daysOverdue);
      filtered = filtered.filter(p => p.days_overdue >= threshold);
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.story_title.toLowerCase().includes(search) ||
          p.story_id.toLowerCase().includes(search) ||
          p.payment_id.toLowerCase().includes(search) ||
          p.milestone.toLowerCase().includes(search)
      );
    }

    setFilteredPayments(filtered);
  }, [filters, payments]);

  const filterConfig: FilterConfig[] = [
    {
      id: "search",
      label: "Search",
      type: "text",
      placeholder: "Search by title, payment ID...",
    },
    {
      id: "daysOverdue",
      label: "Days Overdue",
      type: "select",
      options: [
        { label: "7+ days", value: "7" },
        { label: "30+ days (Critical)", value: "30" },
        { label: "60+ days", value: "60" },
        { label: "90+ days", value: "90" },
      ],
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const columns: ColumnDef<OverduePayment>[] = [
    {
      id: "payment_id",
      header: "Payment ID",
      accessorKey: "payment_id",
      className: "font-mono text-xs",
    },
    {
      id: "story",
      header: "Story",
      accessorKey: "story_title",
      className: "max-w-[250px]",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.story_title}</div>
          <div className="text-xs text-muted-foreground">{row.story_id}</div>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      accessorKey: "amount",
      cell: (row) => (
        <span className="font-semibold">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      id: "milestone",
      header: "Milestone",
      accessorKey: "milestone",
      className: "max-w-[150px] truncate",
    },
    {
      id: "due_date",
      header: "Due Date",
      accessorKey: "due_date",
      cell: (row) => new Date(row.due_date).toLocaleDateString(),
    },
    {
      id: "days_overdue",
      header: "Days Overdue",
      accessorKey: "days_overdue",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-red-500" />
          <span className={row.days_overdue > 30 ? "font-bold text-red-600" : "text-red-500"}>
            {row.days_overdue} days
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status="overdue" />,
    },
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: "", daysOverdue: "all" });
  };

  const handleRowClick = (row: OverduePayment) => {
    // Navigate to payment detail or contract page
    router.push(`/management/contracts/${row.contract_id}`);
  };

  // Prepare export data
  const exportData = filteredPayments.map(p => ({
    "Payment ID": p.payment_id,
    "Story": p.story_title,
    "Story ID": p.story_id,
    "Amount (PKR)": p.amount,
    "Milestone": p.milestone,
    "Due Date": new Date(p.due_date).toLocaleDateString(),
    "Days Overdue": p.days_overdue,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading overdue payments...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
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
            <BreadcrumbPage>Overdue Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/management" variant="ghost" size="sm" className="gap-1" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Overdue Payments</h1>
          <p className="text-muted-foreground">
            Payments past their due date requiring immediate attention
          </p>
        </div>
        <ExportButton
          data={exportData}
          filename="overdue-payments"
          disabled={filteredPayments.length === 0}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredPayments.length} after filters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Amount
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Days Overdue
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDaysOverdue}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical (30+ days)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.criticalCount}</div>
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
          totalResults={filteredPayments.length}
        />

        {/* Data Table */}
        <div>
          <DataTable
            data={filteredPayments}
            columns={columns}
            onRowClick={handleRowClick}
            emptyMessage="No overdue payments found"
            pageSize={15}
          />
        </div>
      </div>
    </div>
  );
}
