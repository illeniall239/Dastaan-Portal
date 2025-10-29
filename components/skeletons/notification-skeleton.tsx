import { Skeleton } from "@/components/ui/skeleton";

export function NotificationSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
