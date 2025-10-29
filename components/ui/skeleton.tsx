import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-slate-200", className)}
      {...props}
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

export { Skeleton };