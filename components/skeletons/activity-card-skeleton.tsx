import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ActivityCardSkeleton() {
  return (
    <Card className="h-full shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
            <CardDescription className="text-slate-600">
              Latest updates in the content pipeline
            </CardDescription>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start justify-between p-4 rounded-xl">
              <div className="flex items-start space-x-4 flex-1">
                <Skeleton className="h-5 w-5 rounded-xl flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="text-right ml-4 flex-shrink-0 space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
