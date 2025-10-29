import { ScriptingPhase } from "@/components/management/scripting-phase";
import { EvaluatorPipelineEpisodes } from "@/components/management/evaluator-pipeline-episodes";
import { ArchiveGenreChart } from "@/components/management/charts/archive-genre-chart";
import { IdeasByGenreChart } from "@/components/management/charts/ideas-by-genre-chart";
import { ExportButton } from "@/components/management/export-button";
import { getScriptingPhaseData } from "@/lib/management/scripting-analytics";
import { getDramasWithEpisodes, getAllEpisodesAndEvaluatorsBatch } from "@/lib/management/episode-pipeline";
import { getArchiveByGenre } from "@/lib/management/archive-analytics";
import { getIdeasByGenre } from "@/lib/management/ideas-analytics";

export async function ScriptingEpisodeSection() {
  const [scriptingPhaseData, dramasWithEpisodes, archiveByGenre, ideasByGenre] = await Promise.all([
    getScriptingPhaseData(),
    getDramasWithEpisodes(),
    getArchiveByGenre(),
    getIdeasByGenre()
  ]);

  // Fetch all episodes and evaluators in batch (optimized)
  const dramaIds = dramasWithEpisodes.map(d => d.callReportId);
  const { episodesByDrama, evaluatorsByEpisode } = await getAllEpisodesAndEvaluatorsBatch(dramaIds);

  return (
    <div id="scripting-episode-section" className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scripting Phase & Episode Evaluation Pipeline</h2>
          <p className="text-muted-foreground mt-1">
            Track episodic evaluation progress by drama
          </p>
        </div>
        <div className="no-print">
          <ExportButton
            elementId="scripting-episode-section"
            filename="scripting-episode-pipeline"
            formats={["png", "pdf"]}
            compact
          />
        </div>
      </div>

      <div className="space-y-6">
        <ScriptingPhase data={scriptingPhaseData} />
        <EvaluatorPipelineEpisodes
          dramas={dramasWithEpisodes}
          episodesByDrama={episodesByDrama}
          evaluatorsByEpisode={evaluatorsByEpisode}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IdeasByGenreChart data={ideasByGenre} />
          <ArchiveGenreChart data={archiveByGenre} />
        </div>
      </div>
    </div>
  );
}
