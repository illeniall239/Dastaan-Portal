import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EvaluationFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Project Details Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Criteria Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 8 Criteria Skeletons */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <Skeleton key={score} className="h-10 w-10" />
                ))}
              </div>
            </div>
          ))}

          {/* Overall Recommendation */}
          <div className="pt-4 border-t space-y-2">
            <Skeleton className="h-5 w-56" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>

          {/* Submit Button */}
          <Skeleton className="h-10 w-48" />
        </CardContent>
      </Card>
    </div>
  );
}
