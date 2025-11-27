"use client";

import {
  LucideIcon,
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
  ClipboardList,
  FileTextIcon,
  CalendarIcon
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ActionColor = 'blue' | 'orange' | 'green' | 'purple' | 'red';

// Icon mapping to convert string names to components
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
  ClipboardList,
  FileTextIcon,
  CalendarIcon,
};

interface QuickAction {
  icon: LucideIcon | string; // Accept both icon component and string
  label: string;
  description: string;
  href: string;
  color: ActionColor;
  badge?: number; // Notification count
}

interface EnhancedQuickActionsProps {
  actions: QuickAction[];
  className?: string;
  luxuryMinimal?: boolean; // Enable luxury minimal design
}

const colorClasses: Record<ActionColor, {
  bg: string;
  hoverBg: string;
  iconBg: string;
  text: string;
  border: string;
}> = {
  blue: {
    bg: 'bg-blue-50/50',
    hoverBg: 'hover:bg-blue-50',
    iconBg: 'bg-[#224794]',
    text: 'text-[#224794]',
    border: 'border-blue-200'
  },
  orange: {
    bg: 'bg-orange-50/50',
    hoverBg: 'hover:bg-orange-50',
    iconBg: 'bg-[#f79224]',
    text: 'text-[#f79224]',
    border: 'border-orange-200'
  },
  green: {
    bg: 'bg-green-50/50',
    hoverBg: 'hover:bg-green-50',
    iconBg: 'bg-green-600',
    text: 'text-green-600',
    border: 'border-green-200'
  },
  purple: {
    bg: 'bg-purple-50/50',
    hoverBg: 'hover:bg-purple-50',
    iconBg: 'bg-purple-600',
    text: 'text-purple-600',
    border: 'border-purple-200'
  },
  red: {
    bg: 'bg-red-50/50',
    hoverBg: 'hover:bg-red-50',
    iconBg: 'bg-red-600',
    text: 'text-red-600',
    border: 'border-red-200'
  },
};

export function EnhancedQuickActions({
  actions,
  className,
  luxuryMinimal = false
}: EnhancedQuickActionsProps) {
  // Icon color mapping for luxury minimal mode (outline icons with color)
  const luxuryIconColors: Record<ActionColor, string> = {
    'blue': 'text-[#224794]',
    'orange': 'text-[#f79224]',
    'green': 'text-[#10b981]',
    'purple': 'text-purple-600',
    'red': 'text-red-600',
  };

  return (
    <div className={cn(luxuryMinimal ? "space-y-1" : "space-y-2", className)}>
      {actions.map((action, index) => {
        // Resolve icon - if it's a string, look it up in iconMap; otherwise use it directly
        const Icon = typeof action.icon === 'string' ? iconMap[action.icon] : action.icon;
        const colors = colorClasses[action.color];

        if (luxuryMinimal) {
          // Luxury Minimal Design
          return (
            <Link
              key={index}
              href={action.href}
              prefetch
              className={cn(
                "group flex items-center gap-6 p-6 rounded-2xl",
                "transition-all duration-300",
                "luxury-bg-tint-hover",
                "touch-target"
              )}
            >
              {/* Outline icon container */}
              <div className={cn(
                "luxury-icon-outline",
                "w-10 h-10"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  luxuryIconColors[action.color],
                  "group-hover:translate-x-1"
                )} />
              </div>

              {/* Text with proper spacing - NO TRUNCATION */}
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900 mb-1">
                  {action.label}
                </p>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {action.description}
                </p>
              </div>

              {/* Badge */}
              {action.badge !== undefined && action.badge > 0 && (
                <div className={cn(
                  "flex items-center justify-center",
                  "min-w-[24px] h-6 px-2 rounded-full",
                  "bg-neutral-900 text-white",
                  "text-xs font-bold"
                )}>
                  {action.badge > 9 ? '9+' : action.badge}
                </div>
              )}

              {/* Minimal arrow */}
              <svg
                className={cn(
                  "w-4 h-4 text-neutral-400",
                  "opacity-0 group-hover:opacity-100",
                  "transition-opacity duration-300"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          );
        }

        // Original Design (kept for backwards compatibility)
        return (
          <Link
            key={index}
            href={action.href}
            prefetch
            className={cn(
              "group flex items-center gap-4 p-4 rounded-xl",
              "border border-transparent transition-all duration-200",
              "hover:border-gray-200",
              "hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent",
              "hover:translate-x-1",
              "hover:shadow-sm",
              "touch-target"
            )}
          >
            {/* Icon */}
            <div className={cn(
              "flex items-center justify-center",
              "w-11 h-11 rounded-xl flex-shrink-0",
              colors.iconBg,
              "shadow-sm",
              "transition-all duration-200",
              "group-hover:scale-110 group-hover:shadow-md"
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-semibold text-gray-900",
                "transition-colors duration-200",
                `group-hover:${colors.text}`
              )}>
                {action.label}
              </p>
              {/* FIX: Removed line-clamp-1 to allow full text display */}
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {action.description}
              </p>
            </div>

            {/* Badge */}
            {action.badge !== undefined && action.badge > 0 && (
              <div className={cn(
                "flex items-center justify-center",
                "min-w-[24px] h-6 px-2 rounded-full",
                "bg-red-500 text-white",
                "text-xs font-bold",
                "shadow-sm"
              )}>
                {action.badge > 9 ? '9+' : action.badge}
              </div>
            )}

            {/* Arrow indicator */}
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center",
              "bg-gray-100 opacity-0 group-hover:opacity-100",
              "transition-all duration-200",
              "group-hover:bg-gray-200"
            )}>
              <svg
                className="w-3 h-3 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
