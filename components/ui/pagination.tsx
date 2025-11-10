/**
 * Pagination Component
 *
 * UI component for navigating paginated data
 */

"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { PaginationMeta } from "@/types/pagination";

interface PaginationProps {
  /**
   * Pagination metadata from API response
   */
  pagination: PaginationMeta;

  /**
   * Callback when page changes
   */
  onPageChange: (page: number) => void;

  /**
   * Show first/last page buttons
   * @default true
   */
  showFirstLast?: boolean;

  /**
   * Show page info text (e.g., "Showing 1-20 of 100")
   * @default true
   */
  showInfo?: boolean;
}

export function Pagination({
  pagination,
  onPageChange,
  showFirstLast = true,
  showInfo = true,
}: PaginationProps) {
  const {
    currentPage,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
  } = pagination;

  // Don't render if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Calculate page numbers to show (max 5 pages)
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page with 2 pages on each side
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      // Adjust if we're near the start or end
      if (currentPage <= 3) {
        end = maxVisible;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      {/* Info text */}
      {showInfo && (
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex + 1, totalItems)} of{" "}
          {totalItems} results
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* First page */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={!hasPreviousPage}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {pageNumbers.map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={pageNumber === currentPage ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(pageNumber)}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === currentPage ? "page" : undefined}
          >
            {pageNumber}
          </Button>
        ))}

        {/* Next page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact pagination variant for mobile or tight spaces
 */
export function PaginationCompact({
  pagination,
  onPageChange,
}: Pick<PaginationProps, "pagination" | "onPageChange">) {
  const { currentPage, totalPages, hasNextPage, hasPreviousPage } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>

      <span className="text-sm text-muted-foreground px-2">
        Page {currentPage} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
