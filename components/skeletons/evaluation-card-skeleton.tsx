import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function EvaluationCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-7 w-64" />
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Evaluation Progress */}
        <div className="bg-slate-50 rounded-lg p-3 border mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-32" />
              <Badge variant="outline" className="text-xs">
                <Skeleton className="h-3 w-8" />
              </Badge>
            </div>
          </div>
          <Skeleton className="h-4 w-full rounded-full" />
        </div>

        <div className="space-y-2 mb-4">
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div>
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Skeleton className="h-10 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EvaluationCardsGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <EvaluationCardSkeleton key={i} />
      ))}
    </div>
  );
}
