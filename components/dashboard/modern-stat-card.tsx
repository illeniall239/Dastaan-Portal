import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ModernStatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  href?: string;
  accent?: boolean; // Brand blue background
}

export function ModernStatCard({
  title,
  value,
  trend,
  icon: Icon,
  href,
  accent = false,
}: ModernStatCardProps) {
  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4 min-h-[3rem]">
        <h3
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            accent ? "text-white/80" : "text-gray-500"
          )}
        >
          {title}
        </h3>
        {Icon && (
          <Icon
            className={cn(
              "h-5 w-5 flex-shrink-0 ml-2",
              accent ? "text-white/60" : "text-gray-400"
            )}
          />
        )}
      </div>

      <div className="mt-auto">
        <p
          className={cn(
            "text-5xl font-bold mb-2",
            accent ? "text-white" : "text-gray-900"
          )}
        >
          {value}
        </p>

        {trend && (
          <p
            className={cn(
              "text-xs font-medium flex items-center gap-1",
              accent ? "text-white/70" : "text-gray-500"
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block p-6 rounded-2xl transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-1",
          accent
            ? "bg-[#224794] text-white shadow-md"
            : "bg-white border border-gray-200 shadow-md"
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "p-6 rounded-2xl",
        accent
          ? "bg-[#224794] text-white shadow-md"
          : "bg-white border border-gray-200 shadow-md"
      )}
    >
      {content}
    </div>
  );
}
