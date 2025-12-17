'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Film, CheckCircle2, Clock, XCircle, Info, BarChart3 } from 'lucide-react';
import {
  DummyDramaWithEpisodes,
  DummyEpisodeWithProgress,
  DummyEvaluatorDetail,
  DummyEventAnalysisData,
} from '../lib/dummy-data';
import { DemoDrillDownModal, DrillDownData } from './demo-drill-down-modal';
import { DemoEventAnalysisModal } from './demo-event-analysis-modal';
import { formatDate } from "@/lib/utils/format-date";

interface DemoEvaluatorPipelineEpisodesProps {
  dramas: DummyDramaWithEpisodes[];
  episodesByDrama: Record<string, DummyEpisodeWithProgress[]>;
  evaluatorsByEpisode: Record<string, { completed: DummyEvaluatorDetail[]; pending: DummyEvaluatorDetail[] }>;
  eventData: Record<string, DummyEventAnalysisData[]>;
}

export function DemoEvaluatorPipelineEpisodes({
  dramas,
  episodesByDrama,
  evaluatorsByEpisode,
  eventData,
}: DemoEvaluatorPipelineEpisodesProps) {
  const [expandedDrama, setExpandedDrama] = useState<string | null>(null);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventAnalysisModal, setEventAnalysisModal] = useState<{
    isOpen: boolean;
    callReportId: string;
    dramaTitle: string;
  }>({
    isOpen: false,
    callReportId: '',
    dramaTitle: '',
  });

  const toggleDrama = (dramaId: string) => {
    if (expandedDrama === dramaId) {
      setExpandedDrama(null);
    } else {
      setExpandedDrama(dramaId);
    }
  };

  const handleEventAnalysisClick = (callReportId: string, dramaTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventAnalysisModal({
      isOpen: true,
      callReportId,
      dramaTitle,
    });
  };

  const handleEpisodeClick = (episodeId: string, episodeNumber: number, dramaTitle: string) => {
    const evaluators = evaluatorsByEpisode[episodeId];
    if (!evaluators) return;

    const tableData = [
      ...evaluators.completed.map((ev) => ({
        evaluator: ev.evaluatorName,
        status: 'Completed',
        score: ev.overallScore?.toString() || '-',
        grade: ev.grade || '-',
        date: ev.evaluatedAt ? formatDate(ev.evaluatedAt) : '-',
      })),
      ...evaluators.pending.map((ev) => ({
        evaluator: ev.evaluatorName,
        status: 'Pending',
        score: '-',
        grade: '-',
        date: '-',
      })),
    ];

    setDrillDownData({
      title: `${dramaTitle} - Episode ${episodeNumber}`,
      subtitle: `Evaluator breakdown: ${evaluators.completed.length} completed, ${evaluators.pending.length} pending`,
      type: 'table',
      data: tableData,
      columns: [
        { key: 'evaluator', label: 'Evaluator' },
        { key: 'status', label: 'Status' },
        { key: 'score', label: 'Score' },
        { key: 'grade', label: 'Grade' },
        { key: 'date', label: 'Evaluated On' },
      ],
    });
    setIsModalOpen(true);
  };

  if (dramas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Episode Evaluation Pipeline</CardTitle>
              <CardDescription>Track episodic evaluation progress by drama</CardDescription>
            </div>
            <Film className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No episodes currently in evaluation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Episode Evaluation Pipeline</CardTitle>
              <CardDescription>Track episodic evaluation progress by drama</CardDescription>
            </div>
            <Film className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dramas.map((drama) => {
              const isExpanded = expandedDrama === drama.callReportId;
              const episodes = episodesByDrama[drama.callReportId] || [];

              return (
                <div key={drama.callReportId} className="border rounded-lg">
                  {/* Level 1: Drama Title */}
                  <div
                    onClick={() => toggleDrama(drama.callReportId)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      )}
                      <h4 className="font-semibold text-slate-900">{drama.workingTitle}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleEventAnalysisClick(drama.callReportId, drama.workingTitle, e)}
                        className="h-7 px-3 text-xs gap-1 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300"
                      >
                        <BarChart3 className="h-3 w-3" />
                        Event Analysis
                      </Button>
                      <Badge variant="outline" className="text-xs">
                        {drama.totalEpisodes} {drama.totalEpisodes === 1 ? 'episode' : 'episodes'}
                      </Badge>
                      <Badge className="bg-blue-500 text-white text-xs">
                        {drama.evaluatedEpisodes}/{drama.totalEpisodes} evaluated
                      </Badge>
                    </div>
                  </div>

                  {/* Level 2: Episodes List */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t bg-slate-50/50">
                      {episodes.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          No episodes found for this drama
                        </p>
                      ) : (
                        episodes.map((episode) => {
                          const evaluators = evaluatorsByEpisode[episode.episodeId];
                          const statusIcon =
                            episode.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : episode.status === 'in_progress' ? (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            );

                          return (
                            <div
                              key={episode.episodeId}
                              className="w-full p-3 bg-white border rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {statusIcon}
                                  <span className="font-medium text-sm">
                                    Episode {episode.episodeNumber}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-600">
                                    {episode.completedEvaluators}/{episode.totalEvaluators} evaluators
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEpisodeClick(episode.episodeId, episode.episodeNumber, drama.workingTitle)}
                                    className="h-7 px-2 text-xs gap-1 hover:bg-blue-50 hover:text-blue-600"
                                  >
                                    <Info className="h-3 w-3" />
                                    Details
                                  </Button>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                    episode.status === 'completed'
                                      ? 'bg-green-500'
                                      : episode.status === 'in_progress'
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${episode.progressPercentage}%` }}
                                ></div>
                              </div>

                              {/* Pending Evaluators */}
                              {evaluators && evaluators.pending.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Pending: {evaluators.pending.slice(0, 3).map((e) => e.evaluatorName).join(', ')}
                                  {evaluators.pending.length > 3 && ` +${evaluators.pending.length - 3} more`}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Level 3: Evaluator Details Modal */}
      <DemoDrillDownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={drillDownData}
      />

      {/* Event Analysis Modal */}
      <DemoEventAnalysisModal
        isOpen={eventAnalysisModal.isOpen}
        onClose={() => setEventAnalysisModal({ isOpen: false, callReportId: '', dramaTitle: '' })}
        callReportId={eventAnalysisModal.callReportId}
        dramaTitle={eventAnalysisModal.dramaTitle}
        eventData={eventData}
      />
    </>
  );
}
