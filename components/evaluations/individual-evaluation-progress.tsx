interface IndividualEvaluationProgressProps {
  progressPercentage: number;
}

export function IndividualEvaluationProgress({
  progressPercentage,
}: IndividualEvaluationProgressProps) {
  // Determine color based on progress
  const getProgressColor = () => {
    if (progressPercentage >= 100) return "bg-green-600";
    if (progressPercentage >= 75) return "bg-blue-600";
    if (progressPercentage >= 50) return "bg-blue-500";
    return "bg-blue-400";
  };

  const getBackgroundColor = () => {
    if (progressPercentage >= 100) return "bg-green-100";
    return "bg-blue-100";
  };

  return (
    <div className="w-full">
      <div className={`h-2 w-full ${getBackgroundColor()} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${getProgressColor()} transition-all duration-300 ease-in-out`}
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
