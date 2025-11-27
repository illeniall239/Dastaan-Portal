"use client";

import { useEffect, useState } from "react";
import {
  LucideIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  AlertTriangle,
  Activity,
  Users,
  Film,
  Shield,
  UserPlus,
  Settings,
  Database
} from "lucide-react";
import { BentoCard } from "./bento-card";
import { cn } from "@/lib/utils";

type BentoCardSize = '1x1' | '2x1' | '1x2' | '2x2' | '3x1' | '3x2' | '4x2';
type BentoGradient = 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'gray' | 'none';

// Icon mapping to convert string names or components to components
const iconMap: Record<string, LucideIcon> = {
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  AlertTriangle,
  Activity,
  Users,
  Film,
  Shield,
  UserPlus,
  Settings,
  Database,
};

interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon | string; // Accept both icon component and string
  trend?: {
    value: string;
    isPositive: boolean;
  };
  size?: BentoCardSize;
  variant?: 'metric' | 'hero';
  gradient?: BentoGradient;
  borderAccent?: 'left' | 'top' | 'none';
  accentColor?: 'blue' | 'orange' | 'green' | 'red';
  href?: string;
  className?: string;
  // Luxury minimal enhancements
  luxuryMinimal?: boolean;  // Enable luxury minimal monochrome design
}

export function EnhancedStatCard({
  title,
  value,
  icon,
  trend,
  size = '1x1',
  variant = 'metric',
  gradient = 'none',
  borderAccent = 'none',
  accentColor = 'blue',
  href,
  className,
  luxuryMinimal = false,
}: EnhancedStatCardProps) {
  // Resolve icon - if it's a string, look it up in iconMap; otherwise use it directly
  const Icon = typeof icon === 'string' ? iconMap[icon] : icon;
  const isNumber = typeof value === 'number';
  const [displayValue, setDisplayValue] = useState(isNumber ? 0 : value);
  const isHero = variant === 'hero';

  // Icon color mapping for luxury minimal mode
  const iconColorMap: Record<string, string> = {
    'blue': 'text-[#224794]',
    'orange': 'text-[#f79224]',
    'green': 'text-[#10b981]',
    'red': 'text-red-600',
  };

  // Animated number counter - luxury version is slower (1.5s instead of 1s)
  useEffect(() => {
    if (!isNumber) {
      setDisplayValue(value);
      return;
    }

    const targetValue = value as number;
    const duration = luxuryMinimal ? 1500 : 1000; // Slower for luxury feel
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
  }, [value, isNumber, luxuryMinimal]);

  return (
    <BentoCard
      size={size}
      variant={variant}
      gradient={luxuryMinimal ? 'none' : gradient}
      borderAccent={luxuryMinimal ? 'none' : borderAccent}
      accentColor={accentColor}
      interactive={!!href}
      href={href}
      className={className}
      minimalist={luxuryMinimal}
    >
      <div className={cn(
        "flex flex-col h-full stat-card",
        luxuryMinimal ? "gap-6 sm:gap-8" : "gap-0" // Larger spacing for luxury (32px)
      )}>
        {/* Header with title and icon */}
        <div className="flex items-start justify-between">
          <h3 className={cn(
            "stat-card-label", // Use new professional stat card label
            luxuryMinimal && "luxury-text-label"
          )}>
            {title}
          </h3>
          {Icon && (
            <div className={cn(
              "flex-shrink-0 transition-all",
              luxuryMinimal
                ? cn(
                    // Outline icon container for luxury minimal
                    "luxury-icon-outline",
                    isHero ? "w-12 h-12" : "w-10 h-10"
                  )
                : cn(
                    "stat-card-icon", // Use new professional stat card icon
                    "p-2 sm:p-2.5 rounded-lg",
                    gradient === 'none' ? "bg-gray-50" : "bg-white/40"
                  )
            )}>
              <Icon className={cn(
                "transition-all",
                isHero ? "h-6 w-6 sm:h-7 sm:w-7" : "h-5 w-5",
                luxuryMinimal
                  ? iconColorMap[accentColor] // Color accent on icon only
                  : gradient !== 'none' ? "text-gray-700" : "text-gray-600"
              )} />
            </div>
          )}
        </div>

        {/* Value and trend */}
        <div className="mt-auto space-y-1">
          <p className={cn(
            "stat-card-number", // Use new professional stat card number
            luxuryMinimal && (isHero ? "luxury-text-hero" : "luxury-text-stat")
          )}>
            {displayValue}
          </p>

          {trend && (
            luxuryMinimal ? (
              // Luxury minimal: subtle micro-text instead of pill badges
              <p className="luxury-text-micro">
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </p>
            ) : (
              // Original: colorful pill badges with icons
              <div className="flex items-center gap-1.5">
                {trend.isPositive ? (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                    "bg-green-50 text-green-700"
                  )}>
                    <TrendingUp className="h-3 w-3" />
                    <span>{trend.value}</span>
                  </div>
                ) : (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                    "bg-red-50 text-red-700"
                  )}>
                    <TrendingDown className="h-3 w-3" />
                    <span>{trend.value}</span>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </BentoCard>
  );
}
