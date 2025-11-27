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
      "relative overflow-hidden transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 touch-target",
      href && "cursor-pointer active:scale-[0.99]",
      isPrimary
        ? "bg-[#224794] text-white border-[#224794]"
        : "bg-white border-gray-200"
    )}>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <h3 className={cn(
            "text-sm font-medium",
            isPrimary ? "text-white/80" : "text-gray-600"
          )}>
            {title}
          </h3>
          {Icon && (
            <div className={cn(
              "p-2 rounded-lg transition-colors duration-150 flex-shrink-0",
              isPrimary
                ? "bg-white/10"
                : "bg-blue-50"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                isPrimary ? "text-white" : "text-[#224794]"
              )} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className={cn(
            "text-3xl font-bold tracking-tight",
            isPrimary ? "text-white" : "text-gray-900"
          )}>
            {displayValue}
          </p>

          {trend && (
            <div className="flex items-center gap-1.5">
              {trend.isPositive ? (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                  isPrimary
                    ? "bg-white/10 text-white"
                    : "bg-green-50 text-green-700"
                )}>
                  <TrendingUp className="h-3 w-3" />
                  <span>{trend.value}</span>
                </div>
              ) : (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                  isPrimary
                    ? "bg-white/10 text-white"
                    : "bg-red-50 text-red-700"
                )}>
                  <TrendingDown className="h-3 w-3" />
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
