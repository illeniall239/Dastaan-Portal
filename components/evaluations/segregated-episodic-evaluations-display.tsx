"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, User, Code2, Building2, Star, MessageSquare, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";
import type { SegregatedEpisodicEvaluations } from "@/types";

interface SegregatedEpisodicEvaluationsDisplayProps {
  evaluations: SegregatedEpisodicEvaluations;
}

export function SegregatedEpisodicEvaluationsDisplay({
  evaluations,
}: SegregatedEpisodicEvaluationsDisplayProps) {
  const { evaluatorEvaluations, managementEvaluations, programmerEvaluations, contentTeamEvaluations = [], total, evaluatorCount, managementCount, programmerCount } = evaluations;

  if (total === 0) {
    return null;
  }

  const EpisodicEvaluationCard = ({ evaluation, isManagement }: { evaluation: any; isManagement: boolean }) => {
    return (
      <div className="border rounded-lg p-4 hover:bg-accent/30 transition-colors">
        <div className="space-y-3">
          {/* Evaluator Info */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">{evaluation.evaluator_name}</p>
                {isManagement && (
                  <Badge variant="secondary" className="text-xs">
                    Management
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{evaluation.evaluator_email}</p>
              {evaluation.submitted_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(evaluation.submitted_at)}
                </p>
              )}
            </div>
            <div className="text-right">
              {evaluation.overall_average != null ? (
                <>
                  <div className="flex items-center gap-1 text-lg font-bold">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span>{evaluation.overall_average.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Overall Average</p>
                  {evaluation.overall_grade && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {evaluation.overall_grade}
                    </Badge>
                  )}
                </>
              ) : (
                <Badge variant="secondary" className="text-xs">Feedback Only</Badge>
              )}
            </div>
          </div>

          {/* Episode Details */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded p-2">
            <div>
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-muted-foreground">Pages</p>
                  <p className="font-semibold">{evaluation.no_of_pages}</p>
                </div>
                {evaluation.pages_score !== undefined && evaluation.pages_score !== 0 && (
                  <Badge variant={evaluation.pages_score > 0 ? "default" : "destructive"} className="text-xs">
                    {evaluation.pages_score > 0 ? '+' : ''}{evaluation.pages_score}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-muted-foreground">Scenes</p>
                  <p className="font-semibold">{evaluation.no_of_scenes}</p>
                </div>
                {evaluation.scenes_score !== undefined && evaluation.scenes_score !== 0 && (
                  <Badge variant={evaluation.scenes_score > 0 ? "default" : "destructive"} className="text-xs">
                    {evaluation.scenes_score > 0 ? '+' : ''}{evaluation.scenes_score}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Scoring Breakdown */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Conflict of Content</p>
              <p className="font-semibold">{evaluation.conflict_of_content_score != null ? `${evaluation.conflict_of_content_score}/10` : "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Characterization</p>
              <p className="font-semibold">{evaluation.characterization_score != null ? `${evaluation.characterization_score}/10` : "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Story Progression</p>
              <p className="font-semibold">{evaluation.story_progression_score != null ? `${evaluation.story_progression_score}/10` : "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Main Event</p>
              <p className="font-semibold">{evaluation.main_event_score != null ? `${evaluation.main_event_score}/10` : "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Small Event</p>
              <p className="font-semibold">{evaluation.small_event_score != null ? `${evaluation.small_event_score}/10` : "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Dragness</p>
              <p className="font-semibold">{evaluation.dragness_score != null ? `${evaluation.dragness_score}/10` : "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Freezes</p>
              <p className="font-semibold">{evaluation.freezes_score != null ? `${evaluation.freezes_score}/10` : "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">What's Next Element</p>
              <p className="font-semibold">{evaluation.whats_next_element_score != null ? `${evaluation.whats_next_element_score}/10` : "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Overall Assessment</p>
              <p className="font-semibold">{evaluation.overall_assessment_score != null ? `${evaluation.overall_assessment_score}/10` : "N/A"}</p>
            </div>
          </div>

          {/* Summary Analysis */}
          {evaluation.summary_analysis && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-900 mb-1">Summary & Analysis</p>
                  <p className="text-xs text-blue-800 line-clamp-3">{evaluation.summary_analysis}</p>
                </div>
              </div>
            </div>
          )}

          {/* Events */}
          {evaluation.events && evaluation.events.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-xs font-medium text-green-900 mb-2">
                Events ({evaluation.events.length})
              </p>
              <div className="space-y-1">
                {evaluation.events.slice(0, 3).map((event: any, idx: number) => {
                  const eventText = typeof event === "string" ? event : event.title || event.description;
                  return (
                    <p key={idx} className="text-xs text-green-800 line-clamp-1">
                      • {eventText}
                    </p>
                  );
                })}
                {evaluation.events.length > 3 && (
                  <p className="text-xs text-green-700 font-medium">
                    +{evaluation.events.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Episode Evaluations</h2>
        <Badge variant="outline" className="ml-auto">
          {total} Total
        </Badge>
      </div>

      {/* Internal Evaluators Section */}
      {evaluatorCount > 0 && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Internal Evaluators</CardTitle>
              </div>
              <Badge variant="secondary">{evaluatorCount}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {evaluatorEvaluations.map((evaluation) => (
                <EpisodicEvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  isManagement={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Programming Evaluations Section */}
      {programmerCount > 0 && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Code2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Programming Evaluations</CardTitle>
              </div>
              <Badge variant="secondary">{programmerCount}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {programmerEvaluations.map((evaluation) => (
                <EpisodicEvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  isManagement={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Team Evaluations Sections */}
      {contentTeamEvaluations.map((teamGroup) => (
        <Card key={teamGroup.teamName}>
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">{teamGroup.teamName} Evaluations</CardTitle>
              </div>
              <Badge variant="secondary">{teamGroup.count}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {teamGroup.evaluations.map((evaluation) => (
                <EpisodicEvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  isManagement={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Management Evaluations Section */}
      {managementCount > 0 && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Management Evaluations</CardTitle>
              </div>
              <Badge variant="secondary">{managementCount}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {managementEvaluations.map((evaluation) => (
                <EpisodicEvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  isManagement={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
