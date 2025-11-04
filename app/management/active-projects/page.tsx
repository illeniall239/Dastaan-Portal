"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, ColumnDef } from "@/components/management/shared/data-table";
import { ExportButton } from "@/components/management/shared/export-button";
import { StatusBadge } from "@/components/management/shared/status-badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ChevronLeft, Clock, X } from "lucide-react";
import type { ActiveProject } from "@/lib/management/active-projects";

export default function ActiveProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ActiveProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgDaysActive: 0 });
  const [filters, setFilters] = useState<Record<string, string>>({
    status: "all",
    genre: "all",
    search: "",
  });

  // Fetch data
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Check if we should use sample data from URL params
        const searchParams = new URLSearchParams(window.location.search);
        const useSampleData = searchParams.get('sample') === 'true';
        const url = `/api/management/active-projects${useSampleData ? '?sample=true' : ''}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProjects(data.projects || []);
        setStats(data.stats || { total: 0, avgDaysActive: 0 });
        setFilteredProjects(data.projects || []);
      } catch (error) {
        console.error("Error fetching active projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...projects];

    // Status filter
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    // Genre filter
    if (filters.genre && filters.genre !== "all") {
      filtered = filtered.filter(p => p.genre === filters.genre);
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.title.toLowerCase().includes(search) ||
          p.story_id.toLowerCase().includes(search) ||
          p.creator_name.toLowerCase().includes(search)
      );
    }

    setFilteredProjects(filtered);
  }, [filters, projects]);

  // Get unique values for filter dropdowns
  const uniqueStatuses = Array.from(new Set(projects.map(p => p.status)));
  const uniqueGenres = Array.from(new Set(projects.map(p => p.genre)));

  const columns: ColumnDef<ActiveProject>[] = [
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
      className: "max-w-[300px]",
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} />,
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
      id: "days_active",
      header: "Days Active",
      accessorKey: "days_active",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {row.days_active} days
        </div>
      ),
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
    setFilters({ status: "all", genre: "all", search: "" });
  };

  const handleRowClick = (row: ActiveProject) => {
    // Navigate to story detail page (you may need to create this route)
    router.push(`/management/stories/${row.id}`);
  };

  // Prepare export data
  const exportData = filteredProjects.map(p => ({
    "Story ID": p.story_id,
    "Title": p.title,
    "Status": p.status,
    "Genre": p.genre,
    "Creator": p.creator_name,
    "Days Active": p.days_active,
    "Last Update": new Date(p.last_update).toLocaleDateString(),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading active projects...</div>
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
            <BreadcrumbPage>Active Projects</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/management")}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Active Projects</h1>
          <p className="text-muted-foreground">
            All stories currently in development
          </p>
        </div>
        <ExportButton
          data={exportData}
          filename="active-projects"
          disabled={filteredProjects.length === 0}
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="search" className="text-sm font-medium mb-1.5 block">
            Search
          </Label>
          <Input
            id="search"
            placeholder="Search by title, ID, creator..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="w-[180px]">
          <Label htmlFor="status" className="text-sm font-medium mb-1.5 block">
            Status
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger id="status" className="h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Label htmlFor="genre" className="text-sm font-medium mb-1.5 block">
            Genre
          </Label>
          <Select
            value={filters.genre}
            onValueChange={(value) => handleFilterChange("genre", value)}
          >
            <SelectTrigger id="genre" className="h-9">
              <SelectValue placeholder="All Genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {uniqueGenres.map(genre => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="h-9"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>

        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {stats.total} projects
        </div>
      </div>

      {/* Data Table */}
      <div>
        <DataTable
          data={filteredProjects}
          columns={columns}
          onRowClick={handleRowClick}
          emptyMessage="No active projects found"
          pageSize={15}
        />
      </div>
    </div>
  );
}
