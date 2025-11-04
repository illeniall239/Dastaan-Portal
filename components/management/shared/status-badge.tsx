import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

/**
 * Reusable status badge component with predefined colors for common statuses
 */
export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  // Map common statuses to colors and variants
  const getStatusStyle = (status: string) => {
    const normalized = status.toLowerCase().replace(/_/g, " ");

    const statusMap: Record<string, { variant: typeof variant; className: string }> = {
      // Story statuses
      "draft": { variant: "secondary", className: "bg-gray-100 text-gray-700 border-gray-300" },
      "submitted": { variant: "default", className: "bg-blue-100 text-blue-700 border-blue-300" },
      "in evaluation": { variant: "default", className: "bg-purple-100 text-purple-700 border-purple-300" },
      "approved": { variant: "default", className: "bg-green-100 text-green-700 border-green-300" },
      "in negotiation": { variant: "default", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
      "contracted": { variant: "default", className: "bg-teal-100 text-teal-700 border-teal-300" },
      "in payment": { variant: "default", className: "bg-indigo-100 text-indigo-700 border-indigo-300" },
      "completed": { variant: "default", className: "bg-green-200 text-green-800 border-green-400" },
      "rejected": { variant: "destructive", className: "bg-red-100 text-red-700 border-red-300" },
      "archived": { variant: "secondary", className: "bg-gray-200 text-gray-600 border-gray-400" },

      // Payment statuses
      "pending": { variant: "default", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
      "paid": { variant: "default", className: "bg-green-100 text-green-700 border-green-300" },
      "overdue": { variant: "destructive", className: "bg-red-100 text-red-700 border-red-300" },
      "partial": { variant: "default", className: "bg-orange-100 text-orange-700 border-orange-300" },

      // Alert severities
      "critical": { variant: "destructive", className: "bg-red-100 text-red-700 border-red-300" },
      "warning": { variant: "default", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
      "info": { variant: "default", className: "bg-blue-100 text-blue-700 border-blue-300" },

      // Generic statuses
      "active": { variant: "default", className: "bg-green-100 text-green-700 border-green-300" },
      "inactive": { variant: "secondary", className: "bg-gray-100 text-gray-700 border-gray-300" },
      "processing": { variant: "default", className: "bg-blue-100 text-blue-700 border-blue-300" },
    };

    return statusMap[normalized] || { variant: "default", className: "bg-gray-100 text-gray-700" };
  };

  const style = getStatusStyle(status);
  const displayStatus = status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Badge
      variant={variant || style.variant}
      className={cn(
        "border font-medium",
        style.className,
        className
      )}
    >
      {displayStatus}
    </Badge>
  );
}
