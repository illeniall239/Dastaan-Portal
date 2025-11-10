"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ContentDeliveryTable } from "@/components/content-delivery/content-delivery-table";
import { ChevronLeft, Download, X } from "lucide-react";
import type { ContentDeliveryItem, ContentDeliveryStats } from "@/types";

export default function ContentDeliveryPage() {
  const router = useRouter();
  const [items, setItems] = useState<ContentDeliveryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentDeliveryItem[]>([]);
  const [stats, setStats] = useState<ContentDeliveryStats>({
    total_projects: 0,
    total_episodes_expected: 0,
    total_episodes_received: 0,
    average_completion: 0,
    total_agreed_value: 0,
    average_agreed_price: 0,
  });
  // Note: Loading state is now handled by loading.tsx
  const [filters, setFilters] = useState({
    search: "",
    genre: "all",
    contract_type: "all",
    time_slot: "all",
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/content-delivery");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setItems(data.items || []);
        setStats(data.stats || { total_projects: 0, total_episodes_expected: 0, total_episodes_received: 0, average_completion: 0, total_agreed_value: 0, average_agreed_price: 0 });
        setFilteredItems(data.items || []);
      } catch (error) {
        console.error("Error fetching content delivery data:", error);
      } finally {
        // setLoading(false); // Handled by loading.tsx
      }
    };

    fetchData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...items];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.project_name.toLowerCase().includes(search) ||
          item.writer_name.toLowerCase().includes(search) ||
          item.negotiation_id.toLowerCase().includes(search) ||
          item.story_id.toLowerCase().includes(search)
      );
    }

    // Genre filter
    if (filters.genre && filters.genre !== "all") {
      filtered = filtered.filter((item) => item.genre.toLowerCase() === filters.genre.toLowerCase());
    }

    // Contract type filter
    if (filters.contract_type && filters.contract_type !== "all") {
      filtered = filtered.filter((item) => item.contract_type.toLowerCase() === filters.contract_type.toLowerCase());
    }

    // Time slot filter
    if (filters.time_slot && filters.time_slot !== "all") {
      filtered = filtered.filter((item) => item.time_slot?.toLowerCase() === filters.time_slot.toLowerCase());
    }

    setFilteredItems(filtered);
  }, [filters, items]);

  const handleClearFilters = () => {
    setFilters({
      search: "",
      genre: "all",
      contract_type: "all",
      time_slot: "all",
    });
  };

  const handleExport = () => {
    // Convert filtered items to CSV
    const headers = [
      "Project Name",
      "Story ID",
      "Writer",
      "Genre",
      "Contract Type",
      "Time Slot",
      "Total Episodes",
      "Episodes Received",
      "Episodes Due",
      "Completion %",
    ];

    const rows = filteredItems.map((item) => [
      item.project_name,
      item.story_id,
      item.writer_name,
      item.genre,
      item.contract_type,
      item.time_slot || "",
      item.total_episodes,
      item.episodes_received,
      item.episodes_due,
      item.completion_percentage,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-delivery-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Get unique values for filters
  const uniqueGenres = Array.from(new Set(items.map((item) => item.genre)));
  const uniqueContractTypes = Array.from(new Set(items.map((item) => item.contract_type)));
  const uniqueTimeSlots = Array.from(
    new Set(items.map((item) => item.time_slot).filter(Boolean))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/content-department">Content Department</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Content Delivery</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold mt-2">Content Delivery</h1>
          <p className="text-muted-foreground">
            Track episode delivery progress for all active projects
          </p>
        </div>
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Project, writer, ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Select
              value={filters.genre}
              onValueChange={(value) => setFilters({ ...filters, genre: value })}
            >
              <SelectTrigger id="genre">
                <SelectValue placeholder="All genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {uniqueGenres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contract Type */}
          <div className="space-y-2">
            <Label htmlFor="contract_type">Contract Type</Label>
            <Select
              value={filters.contract_type}
              onValueChange={(value) =>
                setFilters({ ...filters, contract_type: value })
              }
            >
              <SelectTrigger id="contract_type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueContractTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Slot */}
          <div className="space-y-2">
            <Label htmlFor="time_slot">Time Slot</Label>
            <Select
              value={filters.time_slot}
              onValueChange={(value) =>
                setFilters({ ...filters, time_slot: value })
              }
            >
              <SelectTrigger id="time_slot">
                <SelectValue placeholder="All slots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                {uniqueTimeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot!}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredItems.length} of {items.length} projects
        </div>
      </div>

      {/* Table */}
      <ContentDeliveryTable items={filteredItems} />
    </div>
  );
}
