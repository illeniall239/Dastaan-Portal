import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className={i === 1 ? "bg-[#224794] text-white shadow-xl" : "bg-white shadow-lg"}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className={`h-4 w-32 ${i === 1 ? "bg-white/20" : "bg-slate-200"}`} />
            <Skeleton className={`h-5 w-5 rounded-xl ${i === 1 ? "bg-white/20" : "bg-slate-200"}`} />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className={`h-12 w-16 ${i === 1 ? "bg-white/20" : "bg-slate-200"}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
