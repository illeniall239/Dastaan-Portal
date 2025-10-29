"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  AlertTriangle,
  Activity,
  LucideIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Icon mapping to convert string names to components
const iconMap: Record<string, LucideIcon> = {
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  AlertTriangle,
  Activity,
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string; // Changed to string instead of LucideIcon
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "primary" | "default";
  href?: string; // Optional navigation link
}

export function StatCard({ title, value, icon: iconName, trend, variant = "default", href }: StatCardProps) {
  const isPrimary = variant === "primary";
  const isNumber = typeof value === "number";
  const [displayValue, setDisplayValue] = useState(isNumber ? 0 : value);

  // Resolve icon name to component
  const Icon = iconName ? iconMap[iconName] : undefined;

  useEffect(() => {
    if (!isNumber) {
      setDisplayValue(value);
      return;
    }

    const targetValue = value as number;
    const duration = 1000; // 1 second animation
    const steps = 30;
    const stepValue = targetValue / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(targetValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(stepValue * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, isNumber]);

  const cardContent = (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 touch-target",
      href && "cursor-pointer active:scale-[0.98]",
      isPrimary
        ? "bg-[#224794] text-white shadow-xl hover:shadow-blue-500/30"
        : "bg-white shadow-lg hover:shadow-blue-100"
    )}>
      <CardContent className="p-4 sm:p-6 md:p-7 relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 md:mb-5">
          <h3 className={cn(
            "text-xs sm:text-sm font-semibold uppercase tracking-wider",
            isPrimary ? "text-white/90" : "text-slate-500"
          )}>
            {title}
          </h3>
          {Icon && (
            <div className={cn(
              "p-2 sm:p-2.5 rounded-xl shadow-lg transition-all duration-300 flex-shrink-0",
              isPrimary
                ? "bg-white/20"
                : "bg-slate-100"
            )}>
              <Icon className={cn(
                "h-4 w-4 sm:h-5 sm:w-5",
                isPrimary ? "text-white" : "text-slate-700"
              )} />
            </div>
          )}
        </div>

        <div className="space-y-2 sm:space-y-3">
          <p className={cn(
            "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight animate-count-up",
            isPrimary ? "text-white" : "text-slate-900"
          )}>
            {displayValue}
          </p>

          {trend && (
            <div className="flex items-center gap-1.5">
              {trend.isPositive ? (
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                  isPrimary
                    ? "bg-white/20 text-white"
                    : "bg-green-50 text-green-700"
                )}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{trend.value}</span>
                </div>
              ) : (
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                  isPrimary
                    ? "bg-white/20 text-white"
                    : "bg-red-50 text-red-700"
                )}>
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>{trend.value}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Wrap in Link if href is provided
  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
