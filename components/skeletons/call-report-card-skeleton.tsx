import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CallReportCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Evaluation progress section */}
          <div className="bg-slate-50 rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>

          {/* Notes section */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Button section */}
          <div className="mt-4 pt-4 border-t flex justify-end">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CallReportCardsGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CallReportCardSkeleton key={i} />
      ))}
    </div>
  );
}
