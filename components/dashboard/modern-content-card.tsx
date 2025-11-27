"use client";

import { cn } from "@/lib/utils";

interface ModernContentCardProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  className?: string;
}

export function ModernContentCard({
  title,
  subtitle,
  action,
  children,
  className,
}: ModernContentCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-200 shadow-md p-6",
        "hover:shadow-lg transition-shadow duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-[#224794] hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}
