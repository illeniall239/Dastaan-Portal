"use client";

import { useState } from "react";
import { useFreezeColumns } from "@/lib/hooks/useFreezeColumns";
import type { ContentDeliveryItem } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Clock, AlertCircle, FileText, Pin } from "lucide-react";

interface ContentDeliveryTableProps {
  items: ContentDeliveryItem[];
}

export function ContentDeliveryTable({ items }: ContentDeliveryTableProps) {
  const [sortField, setSortField] = useState<keyof ContentDeliveryItem | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [freezePanes, setFreezePanes] = useState(false);
  const freezeRef = useFreezeColumns(freezePanes);

  const handleSort = (field: keyof ContentDeliveryItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const getCompletionColor = (percentage: number) => {
    if (percentage === 100) return "text-green-600 bg-green-50";
    if (percentage >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getCompletionIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle2 className="h-4 w-4" />;
    if (percentage >= 50) return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No projects found in content delivery</p>
      </div>
    );
  }

  return (
    <>
    <div className="flex justify-end mb-2">
      <Button variant={freezePanes ? "default" : "outline"} size="sm" onClick={() => setFreezePanes(f => !f)} className="gap-1.5 h-7 text-xs px-2">
        <Pin className="h-3 w-3" />
        {freezePanes ? "Unfreeze" : "Freeze Panes"}
      </Button>
    </div>
    <div className="rounded-md border">
      <Table wrapperClassName="max-h-[70vh]" wrapperRef={freezeRef}>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 bg-background"
              onClick={() => handleSort("project_name")}
            >
              Project
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 bg-background"
              onClick={() => handleSort("writer_name")}
            >
              Writer
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 bg-background"
              onClick={() => handleSort("genre")}
            >
              Genre
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 bg-background"
              onClick={() => handleSort("agreed_price")}
            >
              Agreed Price
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 bg-background"
              onClick={() => handleSort("total_episodes")}
            >
              Episodes
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 bg-background"
              onClick={() => handleSort("completion_percentage")}
            >
              Progress
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 bg-background"
              onClick={() => handleSort("time_slot")}
            >
              Time Slot
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 bg-background"
              onClick={() => handleSort("contract_type")}
            >
              Contract Type
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="bg-white">
                <div>
                  <div className="font-medium">{item.project_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.story_id}
                  </div>
                </div>
              </TableCell>
              <TableCell>{item.writer_name}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.genre}</Badge>
              </TableCell>
              <TableCell>
                {item.agreed_price !== null ? (
                  <div className="font-semibold text-green-700">
                    {item.currency || 'PKR'} {item.agreed_price.toLocaleString('en-US')}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${getCompletionColor(
                      item.completion_percentage
                    )} px-2 py-1 rounded`}
                  >
                    {item.episodes_received}/{item.total_episodes}
                  </span>
                  {item.episodes_due > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({item.episodes_due} due)
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    item.completion_percentage === 100
                      ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-300"
                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-300"
                  }
                >
                  {item.completion_percentage}%
                </Badge>
              </TableCell>
              <TableCell>
                {item.time_slot || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.contract_type}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
