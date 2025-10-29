import { EvaluationFormSkeleton } from "@/components/skeletons/evaluation-form-skeleton";

export default function EvaluateLoading() {
  return (
    <div className="p-6 space-y-6">
      <EvaluationFormSkeleton />
    </div>
  );
}
