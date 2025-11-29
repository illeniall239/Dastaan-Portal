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
import { DollarSign, FileText, Handshake, TrendingUp } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { PipelineItem } from "@/lib/management/pipeline-value";

export default function PipelineValuePage() {
  const router = useRouter();
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalValue: 0,
    contractValue: 0,
    negotiationValue: 0,
    totalCount: 0,
    contractCount: 0,
    negotiationCount: 0,
    avgDealSize: 0,
  });
  const [filters, setFilters] = useState<Record<string, string>>({
    type: "all",
    status: "all",
    search: "",
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `/api/management/pipeline-value`;

        const response = await fetch(url);
        const data = await response.json();
        setItems(data.items || []);
        setStats(data.stats);
        setFilteredItems(data.items || []);
      } catch (error) {
        console.error("Error fetching pipeline value:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...items];

    if (filters.type && filters.type !== "all") {
      filtered = filtered.filter(i => i.type === filters.type);
    }

    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter(i => i.status === filters.status);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        i =>
          i.story_title.toLowerCase().includes(search) ||
          i.story_id.toLowerCase().includes(search)
      );
    }

    setFilteredItems(filtered);
  }, [filters, items]);

  const uniqueStatuses = Array.from(new Set(items.map(i => i.status)));

  const filterConfig: FilterConfig[] = [
    {
      id: "search",
      label: "Search",
      type: "text",
      placeholder: "Search by story title or ID...",
    },
    {
      id: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Contracts", value: "contract" },
        { label: "Contract Terms", value: "negotiation" },
      ],
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      options: uniqueStatuses.map(status => ({
        label: status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        value: status,
      })),
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns: ColumnDef<PipelineItem>[] = [
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.type === 'contract' ? (
            <FileText className="h-4 w-4 text-blue-600" />
          ) : (
            <Handshake className="h-4 w-4 text-purple-600" />
          )}
          <span className="font-medium capitalize">{row.type}</span>
        </div>
      ),
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
      id: "value",
      header: "Value",
      accessorKey: "value",
      cell: (row) => (
        <span className="font-bold text-green-700">{formatCurrency(row.value)}</span>
      ),
    },
    {
      id: "stage",
      header: "Stage",
      accessorKey: "stage",
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "last_update",
      header: "Last Update",
      accessorKey: "last_update",
      cell: (row) => new Date(row.last_update).toLocaleDateString(),
    },
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ type: "all", status: "all", search: "" });
  };

  const handleRowClick = (row: PipelineItem) => {
    if (row.type === 'contract') {
      router.push(`/management/contracts/${row.id}`);
    } else {
      router.push(`/management/contract-terms/${row.id}`);
    }
  };

  // Prepare export data
  const exportData = filteredItems.map(i => ({
    "Type": i.type,
    "Story": i.story_title,
    "Story ID": i.story_id,
    "Value (PKR)": i.value,
    "Stage": i.stage,
    "Status": i.status,
    "Last Update": new Date(i.last_update).toLocaleDateString(),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading pipeline value...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
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
            <BreadcrumbPage>Pipeline Value</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/management" variant="ghost" size="sm" className="gap-1" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Pipeline Value</h1>
          <p className="text-muted-foreground">
            Combined value of active contracts and ongoing negotiations
          </p>
        </div>
        <ExportButton
          data={exportData}
          filename="pipeline-value"
          disabled={filteredItems.length === 0}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pipeline Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCount} deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contract Value
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(stats.contractValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.contractCount} contracts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Negotiation Value
              </CardTitle>
              <Handshake className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(stats.negotiationValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.negotiationCount} negotiations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Deal Size
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgDealSize)}</div>
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
          totalResults={filteredItems.length}
        />

        {/* Data Table */}
        <div>
          <DataTable
            data={filteredItems}
            columns={columns}
            onRowClick={handleRowClick}
            emptyMessage="No pipeline items found"
            pageSize={15}
          />
        </div>
      </div>
    </div>
  );
}
