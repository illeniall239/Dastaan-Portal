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
import { Clock, Star, AlertTriangle } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { PendingApproval } from "@/lib/management/pending-approvals";
import { formatDate, formatDateTime } from "@/lib/utils/format-date";

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, urgentCount: 0, avgDaysPending: 0, avgEvaluationScore: 0 });
  const [filters, setFilters] = useState<Record<string, string>>({
    genre: "all",
    search: "",
    recommendation: "all",
  });

  // Fetch data
  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const url = `/api/management/approvals`;

        const response = await fetch(url);
        const data = await response.json();
        setApprovals(data.approvals || []);
        setStats(data.stats || { total: 0, urgentCount: 0, avgDaysPending: 0, avgEvaluationScore: 0 });
        setFilteredApprovals(data.approvals || []);
      } catch (error) {
        console.error("Error fetching pending approvals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...approvals];

    if (filters.genre && filters.genre !== "all") {
      filtered = filtered.filter(a => a.genre === filters.genre);
    }

    if (filters.recommendation && filters.recommendation !== "all") {
      filtered = filtered.filter(a => a.recommendation === filters.recommendation);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.title.toLowerCase().includes(search) ||
          a.story_id.toLowerCase().includes(search) ||
          a.creator_name.toLowerCase().includes(search)
      );
    }

    setFilteredApprovals(filtered);
  }, [filters, approvals]);

  const uniqueGenres = Array.from(new Set(approvals.map(a => a.genre)));

  const filterConfig: FilterConfig[] = [
    {
      id: "search",
      label: "Search",
      type: "text",
      placeholder: "Search by title, ID, creator...",
    },
    {
      id: "genre",
      label: "Genre",
      type: "select",
      options: uniqueGenres.map(genre => ({ label: genre, value: genre })),
    },
    {
      id: "recommendation",
      label: "Recommendation",
      type: "select",
      options: [
        { label: "Strong Yes", value: "strong_yes" },
        { label: "Yes", value: "yes" },
        { label: "Maybe", value: "maybe" },
        { label: "No", value: "no" },
        { label: "Strong No", value: "strong_no" },
      ],
    },
  ];

  const getRecommendationBadge = (recommendation: string) => {
    const colorMap: Record<string, string> = {
      'strong_yes': 'bg-green-100 text-green-700 border-green-300',
      'yes': 'bg-blue-100 text-blue-700 border-blue-300',
      'maybe': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'no': 'bg-orange-100 text-orange-700 border-orange-300',
      'strong_no': 'bg-red-100 text-red-700 border-red-300',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[recommendation] || 'bg-gray-100 text-gray-700'}`}>
        {recommendation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  const columns: ColumnDef<PendingApproval>[] = [
    {
      id: "story_id",
      header: "Story ID",
      accessorKey: "story_id",
      className: "font-medium",
    },
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      className: "max-w-[250px]",
    },
    {
      id: "genre",
      header: "Genre",
      accessorKey: "genre",
    },
    {
      id: "creator",
      header: "Creator",
      accessorKey: "creator_name",
    },
    {
      id: "evaluation_score",
      header: "Eval. Score",
      accessorKey: "evaluation_score",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span className="font-semibold">{row.evaluation_score.toFixed(1)}/10</span>
          <span className="text-xs text-muted-foreground">({row.evaluation_count} evals)</span>
        </div>
      ),
    },
    {
      id: "recommendation",
      header: "Recommendation",
      accessorKey: "recommendation",
      cell: (row) => getRecommendationBadge(row.recommendation),
    },
    {
      id: "days_pending",
      header: "Days Pending",
      accessorKey: "days_pending",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className={row.days_pending > 7 ? "font-bold text-orange-600" : ""}>
            {row.days_pending} days
          </span>
        </div>
      ),
    },
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ genre: "all", search: "", recommendation: "all" });
  };

  const handleRowClick = (row: PendingApproval) => {
    // Navigate to story detail with evaluation summary
    router.push(`/management/stories/${row.id}`);
  };

  // Prepare export data
  const exportData = filteredApprovals.map(a => ({
    "Story ID": a.story_id,
    "Title": a.title,
    "Genre": a.genre,
    "Creator": a.creator_name,
    "Evaluation Score": a.evaluation_score,
    "Evaluations": a.evaluation_count,
    "Recommendation": a.recommendation,
    "Days Pending": a.days_pending,
    "Submitted": formatDate(a.submitted_date),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading pending approvals...</div>
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
            <BreadcrumbPage>Pending Approvals</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/management" variant="ghost" size="sm" className="gap-1" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground">
            Stories awaiting executive approval decision
          </p>
        </div>
        <ExportButton
          data={exportData}
          filename="pending-approvals"
          disabled={filteredApprovals.length === 0}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredApprovals.length} after filters
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Urgent (7+ days)
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.urgentCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Days Pending
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDaysPending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Eval. Score
              </CardTitle>
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgEvaluationScore.toFixed(1)}/10</div>
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
          totalResults={filteredApprovals.length}
        />

        {/* Data Table */}
        <div>
          <DataTable
            data={filteredApprovals}
            columns={columns}
            onRowClick={handleRowClick}
            emptyMessage="No pending approvals found"
            pageSize={15}
          />
        </div>
      </div>
    </div>
  );
}
