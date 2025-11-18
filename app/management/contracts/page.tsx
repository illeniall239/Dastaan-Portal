"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DataTable, ColumnDef } from "@/components/management/shared/data-table";
import { FilterSidebar, FilterConfig } from "@/components/management/shared/filter-sidebar";
import { ExportButton } from "@/components/management/shared/export-button";
import { StatusBadge } from "@/components/management/shared/status-badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FileText, DollarSign, CheckCircle2, TrendingUp } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { ActiveContract } from "@/lib/management/active-contracts";

export default function ActiveContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<ActiveContract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ActiveContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    totalValue: 0,
    totalPaid: 0,
    totalRemaining: 0,
    avgProgress: 0,
  });
  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
  });

  // Fetch data
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const url = `/api/management/contracts`;

        const response = await fetch(url);
        const data = await response.json();
        setContracts(data.contracts || []);
        setStats(data.stats || { total: 0, totalValue: 0, totalPaid: 0, totalRemaining: 0, avgProgress: 0 });
        setFilteredContracts(data.contracts || []);
      } catch (error) {
        console.error("Error fetching active contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...contracts];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.story_title.toLowerCase().includes(search) ||
          c.story_id.toLowerCase().includes(search) ||
          c.contract_id.toLowerCase().includes(search)
      );
    }

    setFilteredContracts(filtered);
  }, [filters, contracts]);

  const filterConfig: FilterConfig[] = [
    {
      id: "search",
      label: "Search",
      type: "text",
      placeholder: "Search by story, contract ID...",
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const columns: ColumnDef<ActiveContract>[] = [
    {
      id: "contract_id",
      header: "Contract ID",
      accessorKey: "contract_id",
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
      id: "total_amount",
      header: "Contract Value",
      accessorKey: "total_amount",
      cell: (row) => (
        <span className="font-semibold">{formatCurrency(row.total_amount)}</span>
      ),
    },
    {
      id: "milestone_progress",
      header: "Milestone Progress",
      accessorKey: "milestone_progress",
      cell: (row) => (
        <div className="space-y-1 min-w-[150px]">
          <div className="flex items-center justify-between text-xs">
            <span>{row.milestones_completed} / {row.milestones_total} milestones</span>
            <span className="font-medium">{row.milestone_progress}%</span>
          </div>
          <Progress value={row.milestone_progress} className="h-2" />
        </div>
      ),
    },
    {
      id: "paid_amount",
      header: "Paid Amount",
      accessorKey: "paid_amount",
      cell: (row) => (
        <div>
          <div className="font-semibold text-green-700">{formatCurrency(row.paid_amount)}</div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(row.remaining_amount)} remaining
          </div>
        </div>
      ),
    },
    {
      id: "signed_date",
      header: "Signed Date",
      accessorKey: "signed_date",
      cell: (row) => new Date(row.signed_date).toLocaleDateString(),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: "" });
  };

  const handleRowClick = (row: ActiveContract) => {
    // Navigate to contract detail page
    router.push(`/management/contracts/${row.id}`);
  };

  // Prepare export data
  const exportData = filteredContracts.map(c => ({
    "Contract ID": c.contract_id,
    "Story": c.story_title,
    "Story ID": c.story_id,
    "Total Value (PKR)": c.total_amount,
    "Paid Amount (PKR)": c.paid_amount,
    "Remaining (PKR)": c.remaining_amount,
    "Milestones Completed": c.milestones_completed,
    "Total Milestones": c.milestones_total,
    "Progress %": c.milestone_progress,
    "Signed Date": new Date(c.signed_date).toLocaleDateString(),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading active contracts...</div>
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
            <BreadcrumbPage>Active Contracts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/management" variant="ghost" size="sm" className="gap-1" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Active Contracts</h1>
          <p className="text-muted-foreground">
            All contracts currently in progress with payment tracking
          </p>
        </div>
        <ExportButton
          data={exportData}
          filename="active-contracts"
          disabled={filteredContracts.length === 0}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Contracts
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredContracts.length} after filters
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(stats.totalValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Amount Paid
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats.totalRemaining)} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Progress
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProgress}%</div>
            <Progress value={stats.avgProgress} className="h-2 mt-2" />
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
          totalResults={filteredContracts.length}
        />

        {/* Data Table */}
        <div>
          <DataTable
            data={filteredContracts}
            columns={columns}
            onRowClick={handleRowClick}
            emptyMessage="No active contracts found"
            pageSize={15}
          />
        </div>
      </div>
    </div>
  );
}
