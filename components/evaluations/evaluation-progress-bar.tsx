import { cn } from "@/lib/utils";

interface EvaluationProgressBarProps {
  completed: number;
  total: number;
  internalCompleted: number;
  externalCompleted: number;
  internalRequired?: number; // Default 5
  externalRequired?: number; // Default 0, optional
  className?: string;
  showLabels?: boolean;
}

export function EvaluationProgressBar({
  completed,
  total,
  internalCompleted,
  externalCompleted,
  internalRequired = 5,
  externalRequired = 0,
  className,
  showLabels = true,
}: EvaluationProgressBarProps) {
  // Calculate percentages based on internal required (5)
  // External is optional and shown separately
  const internalPercentage = internalRequired > 0 ? (internalCompleted / internalRequired) * 100 : 0;
  const externalPercentage = externalRequired > 0 ? (externalCompleted / externalRequired) * 100 : 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress Bar - Only shows internal progress */}
      <div className="relative h-4 w-full bg-gray-200 rounded-full overflow-hidden">
        {/* Internal evaluations (blue) - main progress */}
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${Math.min(internalPercentage, 100)}%` }}
        />
        {/* Progress text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">
            {internalCompleted}/{internalRequired}
          </span>
        </div>
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>
                Internal: {internalCompleted}/{internalRequired}
              </span>
            </div>
            {externalRequired > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span>
                  External: {externalCompleted}/{externalRequired} (Optional)
                </span>
              </div>
            )}
          </div>
          <span className="font-medium">{Math.min(internalPercentage, 100).toFixed(0)}% Complete</span>
        </div>
      )}
    </div>
  );
}
