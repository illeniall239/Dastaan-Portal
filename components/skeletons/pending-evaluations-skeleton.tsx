import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PendingEvaluationsSkeleton() {
  return (
    <Card className="h-full shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Pending Evaluations</CardTitle>
        <CardDescription className="text-slate-600">
          Call reports assigned to you for evaluation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
