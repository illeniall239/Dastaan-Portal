import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ExecutiveSummarySkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-32 bg-blue-200" />
            <Skeleton className="h-5 w-5 rounded-xl bg-blue-200" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-20 bg-blue-200 mb-2" />
            <Skeleton className="h-3 w-48 bg-blue-200" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PipelineSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white shadow-lg">
            <CardHeader>
              <Skeleton className="h-4 w-32 bg-slate-200" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-16 bg-slate-200 mb-2" />
              <Skeleton className="h-3 w-40 bg-slate-200" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-slate-200 mb-2" />
          <Skeleton className="h-4 w-64 bg-slate-200" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-4 w-full bg-slate-200 mb-2" />
                <Skeleton className="h-3 w-3/4 bg-slate-200" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EvaluatorPerformanceSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-56 bg-slate-200 mb-2" />
        <Skeleton className="h-4 w-96 bg-slate-200" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-12 w-12 rounded-full bg-slate-200" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-slate-200" />
                  <Skeleton className="h-3 w-48 bg-slate-200" />
                </div>
              </div>
              <Skeleton className="h-8 w-16 bg-slate-200" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScriptingPhaseSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64 bg-slate-200 mb-2" />
          <Skeleton className="h-4 w-96 bg-slate-200" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-5 w-48 bg-slate-200 mb-3" />
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-3 w-20 bg-slate-200" />
                      <Skeleton className="h-2 w-full bg-slate-200" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40 bg-slate-200" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full bg-slate-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FinancialMetricsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-slate-200 mb-2" />
            <Skeleton className="h-4 w-64 bg-slate-200" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="p-3 bg-blue-50 rounded-lg">
                <Skeleton className="h-3 w-32 bg-blue-200 mb-2" />
                <Skeleton className="h-8 w-24 bg-blue-200" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
