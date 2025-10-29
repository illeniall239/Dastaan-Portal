import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="flex h-screen bg-muted/10">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar - Static */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled>
                Today
              </Button>
            </div>

            {/* Date Range Display */}
            <Skeleton className="h-7 w-64" />
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Calendar View Area - Loading State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#224794] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
