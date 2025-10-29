import { EvaluatorLeaderboard } from "@/components/management/evaluator-leaderboard";
import { ExportButton } from "@/components/management/export-button";
import { getAllEvaluatorStats } from "@/lib/management/evaluator-performance";

export async function EvaluatorPerformanceSection() {
  const evaluatorStats = await getAllEvaluatorStats();

  return (
    <div id="evaluator-performance" className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Evaluator Performance</h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive tracking of evaluator activity and performance metrics
          </p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="evaluator-performance"
            filename="evaluator-performance"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>

      <div className="grid gap-6">
        <EvaluatorLeaderboard evaluators={evaluatorStats} />
      </div>
    </div>
  );
}
