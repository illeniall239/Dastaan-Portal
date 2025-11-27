import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-blue-50 text-blue-700 border border-blue-200",
        secondary:
          "bg-orange-50 text-orange-700 border border-orange-200",
        destructive:
          "bg-red-50 text-red-700 border border-red-200",
        success:
          "bg-green-50 text-green-700 border border-green-200",
        warning:
          "bg-yellow-50 text-yellow-700 border border-yellow-200",
        outline:
          "bg-white text-gray-700 border border-gray-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
