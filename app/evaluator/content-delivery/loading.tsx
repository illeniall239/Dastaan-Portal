import { Button } from "@/components/ui/button";
import { ContentDeliveryStatsSkeleton } from "@/components/skeletons/content-delivery-stats-skeleton";
import { ContentDeliveryTableSkeleton } from "@/components/skeletons/content-delivery-table-skeleton";

export default function EvaluatorContentDeliveryLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Evaluator</span>
            <span className="text-sm">/</span>
            <span className="text-sm text-muted-foreground">Content Delivery</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <div className="text-3xl font-bold">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="text-muted-foreground mt-2">
                <div className="h-4 w-80 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled>
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
        </Button>
      </div>

      {/* Filters - Skeleton */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            </Button>
            <Button variant="outline" size="sm" disabled>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Stats - Skeleton */}
      <ContentDeliveryStatsSkeleton />

      {/* Table - Skeleton */}
      <ContentDeliveryTableSkeleton />
    </div>
  );
}