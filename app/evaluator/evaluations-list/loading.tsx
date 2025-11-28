import Link from "next/link";
import { EvaluationCardsGridSkeleton } from "@/components/skeletons/evaluation-card-skeleton";
import { BackButton } from "@/components/ui/back-button";

export default function EvaluationsListLoading() {
  return (
    <div className="p-6 space-y-6">
      <BackButton fallbackHref="/evaluator" variant="outline" size="sm" />

      {/* Page Header - Static, shows immediately */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Evaluation List</h1>
          <p className="text-muted-foreground mt-1">
            Select a One-Liner to evaluate and score
          </p>
        </div>
      </div>

      {/* View Toggle - Static, shows immediately */}
      <div className="flex gap-2 justify-end">
        <Link
          href="/evaluator/evaluations-list?view=pending"
          className="py-2 px-4 rounded-md text-sm font-medium border bg-[#224794] text-white border-[#224794]"
        >
          Pending Evaluations
        </Link>
        <Link
          href="/evaluator/evaluations-list?view=completed"
          className="py-2 px-4 rounded-md text-sm font-medium border bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
        >
          Completed Evaluations
        </Link>
      </div>

      {/* Call Reports List - Show skeletons while fetching */}
      <EvaluationCardsGridSkeleton count={3} />
    </div>
  );
}
