import { PipelineOverviewCards } from "@/components/management/cards/pipeline-overview-cards";
import { RecentActivityCard } from "@/components/management/cards/recent-activity-card";
import { ExportButton } from "@/components/management/export-button";
import { getPipelineOverview } from "@/lib/management/pipeline-analytics";

export async function PipelineSection() {
  const pipelineData = await getPipelineOverview();

  return (
    <div id="pipeline-section" className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Pipeline Flow</h2>
          <p className="text-muted-foreground mt-1">
            Story workflow from submission to completion
          </p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="pipeline-section"
            filename="content-pipeline-flow"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>

      {/* Overview Cards Row */}
      <div className="mb-6">
        <PipelineOverviewCards
          totalStories={pipelineData.totalStories}
          activePipeline={pipelineData.activePipeline}
          avgTimeToCompletion={pipelineData.avgTimeToCompletion}
        />
      </div>

      {/* Recent Activity */}
      <RecentActivityCard activities={[]} />
    </div>
  );
}
