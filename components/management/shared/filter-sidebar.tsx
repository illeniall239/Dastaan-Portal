"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Filter } from "lucide-react";

export type FilterConfig = {
  id: string;
  label: string;
  type: "select" | "text" | "number" | "date";
  options?: { label: string; value: string }[];
  placeholder?: string;
};

interface FilterSidebarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onFilterChange: (filterId: string, value: string) => void;
  onClearFilters: () => void;
  totalResults?: number;
}

/**
 * Reusable filter sidebar component for data filtering
 */
export function FilterSidebar({
  filters,
  values,
  onFilterChange,
  onClearFilters,
  totalResults,
}: FilterSidebarProps) {
  const hasActiveFilters = Object.values(values).some(v => v !== "" && v !== "all");

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Filters</CardTitle>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        {totalResults !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {totalResults} result{totalResults !== 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {filters.map((filter) => (
          <div key={filter.id} className="space-y-2">
            <Label htmlFor={filter.id} className="text-sm font-medium">
              {filter.label}
            </Label>

            {filter.type === "select" && filter.options && (
              <Select
                value={values[filter.id] || "all"}
                onValueChange={(value) => onFilterChange(filter.id, value)}
              >
                <SelectTrigger id={filter.id} className="h-9">
                  <SelectValue placeholder={filter.placeholder || "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {filter.type === "text" && (
              <Input
                id={filter.id}
                type="text"
                placeholder={filter.placeholder || "Search..."}
                value={values[filter.id] || ""}
                onChange={(e) => onFilterChange(filter.id, e.target.value)}
                className="h-9"
              />
            )}

            {filter.type === "number" && (
              <Input
                id={filter.id}
                type="number"
                placeholder={filter.placeholder || "Enter number..."}
                value={values[filter.id] || ""}
                onChange={(e) => onFilterChange(filter.id, e.target.value)}
                className="h-9"
              />
            )}

            {filter.type === "date" && (
              <Input
                id={filter.id}
                type="date"
                value={values[filter.id] || ""}
                onChange={(e) => onFilterChange(filter.id, e.target.value)}
                className="h-9"
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
