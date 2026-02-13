"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, User, Code2, Star, MessageSquare, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils/format-date";
import type { EvaluationWithType, SegregatedEvaluations } from "@/types";

interface SegregatedEvaluationsDisplayProps {
  evaluations: SegregatedEvaluations;
}

export function SegregatedEvaluationsDisplay({
  evaluations,
}: SegregatedEvaluationsDisplayProps) {
  const { evaluatorEvaluations, managementEvaluations, programmerEvaluations, total, evaluatorCount, managementCount, programmerCount } = evaluations;

  if (total === 0) {
    return null;
  }

  const EvaluationCard = ({
    evaluation,
    isManagement,
  }: {
    evaluation: EvaluationWithType;
    isManagement: boolean;
  }) => {
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
              <div className="flex items-center gap-1 text-lg font-bold">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span>{evaluation.average_score?.toFixed(1) || "N/A"}</span>
              </div>
              <p className="text-xs text-muted-foreground">Average Score</p>
            </div>
          </div>

          {/* Scoring Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Conflict of Content</p>
              <p className="font-semibold">{evaluation.conflict_of_content_score}/10</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Characterization</p>
              <p className="font-semibold">{evaluation.characterization_score}/10</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Story Progression</p>
              <p className="font-semibold">{evaluation.story_progression_score}/10</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">What's Next Element</p>
              <p className="font-semibold">{evaluation.whats_next_element_score}/10</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-muted-foreground mb-1">Overall Oneliner Grade</p>
              <p className="font-semibold">
                {evaluation.overall_oneliner_grade_score ?? "N/A"}
                {evaluation.overall_oneliner_grade_score !== undefined && evaluation.overall_oneliner_grade_score !== null ? "/10" : ""}
              </p>
            </div>
          </div>

          {/* Decision Badge */}
          {evaluation.decision && (
            <div>
              <Badge
                variant={
                  evaluation.decision === "approve"
                    ? "default"
                    : evaluation.decision === "reject"
                      ? "destructive"
                      : "secondary"
                }
                className="text-xs"
              >
                {evaluation.decision === "approve"
                  ? "Approved"
                  : evaluation.decision === "reject"
                    ? "Rejected"
                    : "Needs Improvement"}
              </Badge>
            </div>
          )}

          {/* Final Impression */}
          {evaluation.comments && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-900 mb-1">Comments</p>
                  <p className="text-xs text-blue-800 line-clamp-3">{evaluation.comments}</p>
                </div>
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
        <h2 className="text-xl font-semibold">Evaluations</h2>
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
                <EvaluationCard
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
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  isManagement={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                <EvaluationCard
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
