import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Page Header Skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Single Column Layout Skeletons */}
      <div className="space-y-4">
        {/* Meeting Details Card Skeleton */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Story Details Card Skeleton */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Cards Skeletons */}
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="pt-4">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
