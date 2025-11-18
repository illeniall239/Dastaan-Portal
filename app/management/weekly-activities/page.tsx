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
import { TrendingUp, TrendingDown, Activity, Calendar, User, Award } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import {
  FileText,
  ClipboardCheck,
  CheckCircle,
  FileSignature,
  DollarSign,
  Handshake
} from "lucide-react";
import type { WeeklyActivity, ActivityStats, ActivityType } from "@/lib/management/weekly-activities";

// Icon mapping for activity types
const activityIcons: Record<ActivityType, React.ElementType> = {
  story: FileText,
  evaluation: ClipboardCheck,
  approval: CheckCircle,
  contract: FileSignature,
  payment: DollarSign,
  contractTerm: Handshake,
};

// Color mapping for activity type badges
const activityColors: Record<ActivityType, string> = {
  story: "bg-blue-100 text-blue-700 border-blue-300",
  evaluation: "bg-purple-100 text-purple-700 border-purple-300",
  approval: "bg-green-100 text-green-700 border-green-300",
  contract: "bg-indigo-100 text-indigo-700 border-indigo-300",
  payment: "bg-emerald-100 text-emerald-700 border-emerald-300",
  contractTerm: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

export default function WeeklyActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<WeeklyActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<WeeklyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    byType: { story: 0, evaluation: 0, approval: 0, contract: 0, payment: 0, contractTerm: 0 },
    byDay: {},
    topPerformers: [],
    mostActiveDay: 'N/A',
    topActivityType: 'story',
    comparisonToPreviousWeek: 0,
  });
  const [filters, setFilters] = useState<Record<string, string>>({
    activityType: "all",
    performer: "all",
    dayOfWeek: "all",
    search: "",
  });

  // Fetch data
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const url = `/api/management/weekly-activities`;

        const response = await fetch(url);
        const data = await response.json();
        setActivities(data.activities || []);
        setStats(data.stats || {
          total: 0,
          byType: { story: 0, evaluation: 0, approval: 0, contract: 0, payment: 0, contractTerm: 0 },
          byDay: {},
          topPerformers: [],
          mostActiveDay: 'N/A',
          topActivityType: 'story',
          comparisonToPreviousWeek: 0,
        });
        setFilteredActivities(data.activities || []);
      } catch (error) {
        console.error("Error fetching weekly activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...activities];

    // Activity type filter
    if (filters.activityType && filters.activityType !== "all") {
      filtered = filtered.filter(a => a.entityType === filters.activityType);
    }

    // Performer filter
    if (filters.performer && filters.performer !== "all") {
      filtered = filtered.filter(a => a.performedBy === filters.performer);
    }

    // Day of week filter
    if (filters.dayOfWeek && filters.dayOfWeek !== "all") {
      filtered = filtered.filter(a => a.dayOfWeek === filters.dayOfWeek);
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.entityName.toLowerCase().includes(search) ||
          a.action.toLowerCase().includes(search) ||
          a.performedBy.toLowerCase().includes(search)
      );
    }

    setFilteredActivities(filtered);
  }, [filters, activities]);

  // Get unique values for filter dropdowns
  const uniqueActivityTypes: ActivityType[] = ['story', 'evaluation', 'approval', 'contract', 'payment', 'contractTerm'];
  const uniquePerformers = Array.from(new Set(activities.map(a => a.performedBy))).filter(p => p !== 'System');
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const filterConfig: FilterConfig[] = [
    {
      id: "search",
      label: "Search",
      type: "text",
      placeholder: "Search activities...",
    },
    {
      id: "activityType",
      label: "Activity Type",
      type: "select",
      options: uniqueActivityTypes.map(type => ({
        label: type.charAt(0).toUpperCase() + type.slice(1),
        value: type,
      })),
    },
    {
      id: "performer",
      label: "Performed By",
      type: "select",
      options: uniquePerformers.map(performer => ({
        label: performer,
        value: performer,
      })),
    },
    {
      id: "dayOfWeek",
      label: "Day of Week",
      type: "select",
      options: daysOfWeek.map(day => ({
        label: day,
        value: day,
      })),
    },
  ];

  const columns: ColumnDef<WeeklyActivity>[] = [
    {
      id: "timestamp",
      header: "When",
      accessorKey: "timestamp",
      cell: (row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {new Date(row.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="text-xs text-muted-foreground">{row.timeAgo}</div>
        </div>
      ),
      className: "w-[120px]",
    },
    {
      id: "activityType",
      header: "Type",
      accessorKey: "entityType",
      cell: (row) => {
        const Icon = activityIcons[row.entityType];
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${activityColors[row.entityType]}`}>
              {row.entityType.charAt(0).toUpperCase() + row.entityType.slice(1)}
            </span>
          </div>
        );
      },
      className: "w-[150px]",
    },
    {
      id: "action",
      header: "Action",
      accessorKey: "action",
      cell: (row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
          <div className="text-sm text-muted-foreground">{row.entityName}</div>
        </div>
      ),
    },
    {
      id: "performer",
      header: "Performed By",
      accessorKey: "performedBy",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span>{row.performedBy}</span>
        </div>
      ),
      className: "w-[180px]",
    },
    {
      id: "day",
      header: "Day",
      accessorKey: "dayOfWeek",
      className: "w-[120px]",
    },
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ activityType: "all", performer: "all", dayOfWeek: "all", search: "" });
  };

  // Group activities by date for display
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const group = activity.dateGroup;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(activity);
    return groups;
  }, {} as Record<string, WeeklyActivity[]>);

  // Prepare export data
  const exportData = filteredActivities.map(a => ({
    "Timestamp": new Date(a.timestamp).toLocaleString(),
    "Type": a.entityType,
    "Action": a.action.replace(/_/g, ' '),
    "Entity": a.entityName,
    "Performed By": a.performedBy,
    "Day": a.dayOfWeek,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading weekly activities...</div>
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
            <BreadcrumbPage>Weekly Activities</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/management" variant="ghost" size="sm" className="gap-1" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Activities</h1>
          <p className="text-muted-foreground">
            All system activities from the past 7 days
          </p>
        </div>
        <ExportButton
          data={exportData}
          filename="weekly-activities"
          disabled={filteredActivities.length === 0}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center gap-1 mt-1">
              {stats.comparisonToPreviousWeek >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <p className="text-xs text-green-600">
                    +{stats.comparisonToPreviousWeek}% vs last week
                  </p>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <p className="text-xs text-red-600">
                    {stats.comparisonToPreviousWeek}% vs last week
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Active Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{stats.mostActiveDay}</div>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.byDay[stats.mostActiveDay] || 0} activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Activity Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold capitalize">{stats.topActivityType}</div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.byType[stats.topActivityType]} activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Active User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {stats.topPerformers[0]?.name.split(' ')[0] || 'N/A'}
              </div>
              <Award className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.topPerformers[0]?.count || 0} activities
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
          totalResults={filteredActivities.length}
        />

        {/* Data Table with Grouping */}
        <div className="space-y-6">
          {['Today', 'Yesterday', 'Earlier This Week'].map(group => {
            const groupActivities = groupedActivities[group] || [];
            if (groupActivities.length === 0) return null;

            return (
              <div key={group}>
                <h3 className="text-lg font-semibold mb-3 text-muted-foreground">{group}</h3>
                <DataTable
                  data={groupActivities}
                  columns={columns}
                  emptyMessage="No activities found"
                  pageSize={15}
                />
              </div>
            );
          })}

          {filteredActivities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No activities found matching your filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
