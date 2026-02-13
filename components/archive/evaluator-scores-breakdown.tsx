import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvaluationSnapshot } from "@/types";
import { User, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EvaluatorScoresBreakdownProps {
  evaluations: EvaluationSnapshot[];
}

export function EvaluatorScoresBreakdown({
  evaluations,
}: EvaluatorScoresBreakdownProps) {
  // Calculate overall average
  const overallAverage =
    evaluations.reduce((sum, e) => sum + e.average_score, 0) /
    evaluations.length;

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 7.0) return "text-green-700 bg-green-50 border-green-200";
    if (score >= 5.0) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  // Get score icon
  const getScoreIcon = (score: number) => {
    if (score >= 7.0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 5.0) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  // Get score label
  const getScoreLabel = (score: number) => {
    if (score >= 7.0) return "Acceptable";
    if (score >= 5.0) return "Needs Improvement";
    return "Below Threshold";
  };

  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overall Average Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`text-3xl font-bold px-4 py-2 rounded-lg border ${getScoreColor(
                  overallAverage
                )}`}
              >
                {overallAverage.toFixed(1)}
              </div>
              <div>
                <Badge
                  variant={
                    overallAverage >= 7.0
                      ? "default"
                      : overallAverage >= 5.0
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {getScoreLabel(overallAverage)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {evaluations.length} evaluation
                  {evaluations.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Evaluator Scores */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Individual Evaluator Scores
        </h3>

        {evaluations.map((evaluation, index) => (
          <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Evaluator Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {evaluation.evaluator_name?.charAt(0) || "E"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {evaluation.evaluator_name || "Anonymous Evaluator"}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Evaluator #{index + 1}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {evaluation.evaluator_email || "No email"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted:{" "}
                        {new Date(evaluation.submitted_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Average Score */}
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-lg ${getScoreColor(
                        evaluation.average_score
                      )}`}
                    >
                      {getScoreIcon(evaluation.average_score)}
                      {evaluation.average_score.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average Score
                    </p>
                  </div>
                </div>

                {/* Individual Criteria Scores */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
                  <ScoreItem
                    label="Conflict of Content"
                    score={evaluation.conflict_of_content_score}
                  />
                  <ScoreItem
                    label="Characterization"
                    score={evaluation.characterization_score}
                  />
                  <ScoreItem
                    label="Story Progression"
                    score={evaluation.story_progression_score}
                  />
                  <ScoreItem
                    label="What's Next Element"
                    score={evaluation.whats_next_element_score}
                  />
                  {/* Dialogues removed */}
                  <ScoreItem
                    label="Overall Oneliner Grade"
                    score={evaluation.overall_oneliner_grade_score}
                  />
                </div>

                {/* Comments */}
                {evaluation.comments && (
                  <div className="bg-slate-50 rounded-lg p-3 mt-3">
                    <p className="text-xs font-semibold text-slate-900 mb-1">
                      Evaluator Comments
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {evaluation.comments}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Helper component for individual score items
function ScoreItem({ label, score }: { label: string; score: number }) {
  const getScoreBgColor = (score: number) => {
    if (score >= 7) return "bg-green-100 text-green-800";
    if (score >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="flex items-center justify-between p-2 bg-white rounded border">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <span
        className={`text-sm font-bold px-2 py-0.5 rounded ${getScoreBgColor(
          score
        )}`}
      >
        {score}
      </span>
    </div>
  );
}
