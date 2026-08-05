import { getExecutiveSummary, getDepartmentWorkload } from "@/lib/management/server";
import { ExportButton } from "@/components/management/export-button";
import { ExecutiveSummaryCards } from "./executive-summary-cards";

export async function ExecutiveSummarySection() {
  const [summary, workload] = await Promise.all([
    getExecutiveSummary(),
    getDepartmentWorkload()
  ]);

  return (
    <div id="executive-summary" className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
        <div className="no-print">
          <ExportButton
            elementId="executive-summary"
            filename="executive-summary"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>
      <ExecutiveSummaryCards summary={summary} pendingApprovals={workload.executives.pendingApprovals} />
    </div>
  );
}
