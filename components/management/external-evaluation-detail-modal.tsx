"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils/format-date";
import { calculateGrade, getGradeColorClasses } from "@/lib/validations/episodic-evaluations";
import {
  User,
  Mail,
  Building,
  Calendar,
  Award,
  Clock,
  FileText,
} from "lucide-react";

interface ExternalEvaluationDetailModalProps {
  evaluation: any;
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to normalize evaluation data from both flat and nested structures
function normalizeEvaluationData(data: any, contentType: string) {
  // If data already has nested structure with scores object, return as-is
  if (data.scores) {
    return data;
  }

  // Otherwise, transform flat structure to nested structure
  if (contentType === "episode") {
    const scores = {
      conflict: data.conflict_of_content_score || 0,
      characterization: data.characterization_score || 0,
      story_progression: data.story_progression_score || 0,
      freezes: data.freezes_score || 0,
      whats_next: data.whats_next_element_score || 0,
      overall_assessment: data.overall_assessment_score || 0,
    };

    // Calculate average from flat scores
    const scoreValues = Object.values(scores).filter(v => typeof v === 'number') as number[];
    const average = scoreValues.length > 0
      ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
      : 0;

    return {
      scores,
      average_score: average,
      grade: calculateGrade(average),
      summary_analysis: data.summary_analysis,
    };
  }

  if (contentType === "call_report") {
    const scores = {
      premise_conflict: data.premise_conflict_score || 0,
      storyline_plot: data.storyline_plot_score || 0,
      episodic_progression: data.episodic_progression_score || 0,
      characters: data.characters_score || 0,
      overall_assessment: data.overall_assessment_score || 0,
    };

    // Calculate average from flat scores
    const scoreValues = Object.values(scores).filter(v => typeof v === 'number') as number[];
    const average = scoreValues.length > 0
      ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
      : 0;

    return {
      scores,
      average_score: average,
      slot: data.slot,
      comments: data.comments,
    };
  }

  // One-liner - just return as-is
  return data;
}

// ScoreDisplay component matching the form's design
function ScoreDisplay({ label, description, score }: { label: string; description?: string; score: number }) {
  const grade = calculateGrade(score);
  const gradeColorClasses = getGradeColorClasses(grade);

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Label className="font-semibold">{label}</Label>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>

        {/* Desktop: horizontal layout */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex-1">
            <div className="text-lg font-semibold text-center w-16 h-10 flex items-center justify-center border rounded-md">
              {score}
            </div>
          </div>

          {/* Visual scale indicator */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <div
                key={value}
                className={`
                  w-8 h-8 text-xs font-medium rounded flex items-center justify-center
                  ${score === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                  }
                `}
                title={`Score: ${value}`}
              >
                {value}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical layout with 5x2 grid */}
        <div className="flex sm:hidden flex-col items-center gap-3">
          <div className="w-auto">
            <div className="text-lg font-semibold text-center w-16 h-10 flex items-center justify-center border rounded-md">
              {score}
            </div>
          </div>

          {/* Visual scale indicator */}
          <div className="grid grid-cols-5 gap-2 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <div
                key={value}
                className={`
                  w-8 h-10 text-sm font-medium rounded flex items-center justify-center
                  ${score === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                  }
                `}
                title={`Score: ${value}`}
              >
                {value}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Score: {score}/10</span>
          </div>
          <div className={`text-sm ${gradeColorClasses} p-2 bg-gray-50 rounded-md border border-gray-200`}>
            {grade}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Rating Scale Guide component
function RatingScaleGuide() {
  return (
    <Card className="p-4 border-2 border-blue-100 bg-blue-50/30">
      <h3 className="text-base font-semibold mb-3">Rating Scale</h3>
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="font-semibold text-gray-600 min-w-[80px]">9.0 - 10.0:</span>
          <span className="font-medium text-green-700">High rating potential</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-semibold text-gray-600 min-w-[80px]">7.0 - 8.9:</span>
          <span className="font-medium text-blue-700">Rating potential audience appeal</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-semibold text-gray-600 min-w-[80px]">5.0 - 6.9:</span>
          <span className="font-medium text-amber-700">Need improvement - Required editing or continuous supervision</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-semibold text-gray-600 min-w-[80px]">&lt; 5.0:</span>
          <span className="font-medium text-red-700">Either unacceptable or need major re-writing and editing</span>
        </div>
      </div>
    </Card>
  );
}

// Overall Assessment Card component
function OverallAssessmentCard({ average, grade }: { average: number; grade?: string }) {
  const gradeColorClasses = grade ? getGradeColorClasses(grade as any) : "";

  // Get rating description based on score
  const getRatingDescription = (score: number) => {
    if (score >= 9.0) {
      return { text: "High rating potential", color: "text-green-700" };
    } else if (score >= 7.0) {
      return { text: "Rating potential audience appeal", color: "text-blue-700" };
    } else if (score >= 5.0) {
      return { text: "Need improvement - Required editing or continuous supervision", color: "text-amber-700" };
    } else {
      return { text: "Either unacceptable or need major re-writing and editing", color: "text-red-700" };
    }
  };

  const ratingDesc = getRatingDescription(average);

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-6 w-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">Overall Assessment</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Average Score */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border-2 border-gray-200">
          <span className="text-sm font-medium text-muted-foreground mb-2">
            Average Score
          </span>
          <span className="text-6xl font-bold text-gray-900">
            {average.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground mt-2">
            out of 10.00
          </span>
          <div className="w-full mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${(average / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rating Assessment - Show grade if available, otherwise show rating description */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border-2 border-gray-200">
          <span className="text-sm font-medium text-muted-foreground mb-4">
            Overall Rating
          </span>
          {grade ? (
            <div className={`text-center ${gradeColorClasses} text-lg px-6 py-4 bg-gray-50 rounded-lg border-2 border-gray-300`}>
              {grade}
            </div>
          ) : (
            <div className={`text-center ${ratingDesc.color} font-semibold text-base px-6 py-4 bg-gray-50 rounded-lg border-2 border-gray-300`}>
              {ratingDesc.text}
            </div>
          )}
        </div>
      </div>

      {/* Rating Scale Reference */}
      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-semibold text-sm text-gray-700 mb-3">Rating Scale</h4>
        <div className="space-y-2">
          {[
            { range: "9.0 - 10.0", description: "High rating potential", color: "text-green-700" },
            { range: "7.0 - 8.9", description: "Rating potential audience appeal", color: "text-blue-700" },
            { range: "5.0 - 6.9", description: "Need improvement - Required editing or continuous supervision", color: "text-amber-700" },
            { range: "< 5.0", description: "Either unacceptable or need major re-writing and editing", color: "text-red-700" },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 text-sm"
            >
              <span className="font-semibold text-gray-600 min-w-[80px]">{item.range}:</span>
              <span className={`${item.color} font-medium`}>{item.description}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ExternalEvaluationDetailModal({
  evaluation,
  isOpen,
  onClose,
}: ExternalEvaluationDetailModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!evaluation) return null;

  // Support both grouped submissions and single evaluations (backwards compatibility)
  const evaluations = evaluation.evaluations || [evaluation];
  const currentEvaluation = evaluations[selectedIndex];

  // Reset selected index when modal opens with new evaluation
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen, evaluation?.id]);

  // Normalize the data to handle both flat and nested structures
  const rawData = currentEvaluation.evaluation_data || {};
  const data = normalizeEvaluationData(rawData, currentEvaluation.content_type);

  const renderEvaluatorInfo = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Your Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Name</Label>
          <div className="flex items-center gap-2 mt-1">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{currentEvaluation.evaluator_name || "Anonymous"}</span>
          </div>
        </div>
        {currentEvaluation.evaluator_email && (
          <div>
            <Label>Email</Label>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{currentEvaluation.evaluator_email}</span>
            </div>
          </div>
        )}
        {currentEvaluation.evaluator_organization && (
          <div>
            <Label>Organization</Label>
            <div className="flex items-center gap-2 mt-1">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{currentEvaluation.evaluator_organization}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderEpisodeEvaluation = () => {
    const scores = data.scores || {};
    const average = data.average_score || 0;
    const grade = data.grade;

    return (
      <>
        {/* Rating Scale Guide */}
        <RatingScaleGuide />

        {/* Evaluation Scores */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Evaluation Scores</CardTitle>
            <p className="text-sm text-muted-foreground">Rate each criterion from 1 (poor) to 10 (excellent)</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScoreDisplay
              label="Conflict of Content"
              description="How engaging and well-developed is the central conflict?"
              score={scores.conflict || 0}
            />
            <ScoreDisplay
              label="Characterization"
              description="How compelling and relatable are the characters?"
              score={scores.characterization || 0}
            />
            <ScoreDisplay
              label="Story Progression"
              description="How effectively does the narrative move the story forward?"
              score={scores.story_progression || 0}
            />
            <ScoreDisplay
              label="Freezes (Cliffhangers)"
              description="How effective are the cliffhangers in creating suspense?"
              score={scores.freezes || 0}
            />
            <ScoreDisplay
              label="What's Next Element"
              description="How strong is the anticipation for the next episode?"
              score={scores.whats_next || 0}
            />
            <ScoreDisplay
              label="Final Impression"
              description="What is your overall impression of this episode?"
              score={scores.overall_assessment || 0}
            />
          </CardContent>
        </Card>

        {/* Overall Assessment */}
        <OverallAssessmentCard average={average} grade={grade} />

        {/* Summary and Feedback */}
        {data.summary_analysis && (
          <Card className="mt-8 mb-6">
            <CardHeader>
              <CardTitle>Summary and Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Your Feedback</Label>
              <div className="mt-2 p-3 bg-muted rounded-md min-h-[100px]">
                <p className="text-sm whitespace-pre-wrap">{data.summary_analysis}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  const renderCallReportEvaluation = () => {
    const scores = data.scores || {};
    const average = data.average_score || 0;

    return (
      <>
        {/* Rating Scale Guide */}
        <RatingScaleGuide />

        {/* Project Evaluation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Evaluation</CardTitle>
            <p className="text-sm text-muted-foreground">Rate each criterion on a scale of 1-10</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScoreDisplay
              label="Premise / Conflict"
              description="How interesting and engaging is the core premise and conflict?"
              score={scores.premise_conflict || 0}
            />
            <ScoreDisplay
              label="Storyline / Plot"
              description="How compelling and coherent is the overall plot structure?"
              score={scores.storyline_plot || 0}
            />
            <ScoreDisplay
              label="Episodic Progression"
              description="How well does the story flow across multiple episodes?"
              score={scores.episodic_progression || 0}
            />
            <ScoreDisplay
              label="Characters"
              description="How well-developed and relatable are the main characters?"
              score={scores.characters || 0}
            />
            <ScoreDisplay
              label="Final Impression"
              description="What is your overall impression of this project's potential?"
              score={scores.overall_assessment || 0}
            />
          </CardContent>
        </Card>

        {/* Overall Assessment */}
        <OverallAssessmentCard average={average} />

        {/* Additional Details */}
        <Card className="mt-8 mb-6">
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Suggested Slot */}
            {data.slot && (
              <div>
                <Label>Suggested Slot *</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {data.slot}
                  </Badge>
                </div>
              </div>
            )}

            {/* Additional Comments */}
            {data.comments && (
              <div>
                <Label>Additional Comments</Label>
                <div className="mt-2 p-3 bg-muted rounded-md min-h-[60px]">
                  <p className="text-sm whitespace-pre-wrap">{data.comments}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  const renderOneLinerEvaluation = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Additional Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Additional Comments</Label>
          <div className="mt-2 p-3 bg-muted rounded-md min-h-[100px]">
            <p className="text-sm whitespace-pre-wrap">
              {data.comments || "No feedback provided"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {currentEvaluation.content_type === "episode" && "Episode"}
                {currentEvaluation.content_type === "call_report" && "One-Liner"}
                {currentEvaluation.content_type === "one_liner" && "One-Liner"}
              </Badge>
              {evaluations.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {selectedIndex + 1} of {evaluations.length}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateTime(currentEvaluation.submitted_at)}
              </span>
            </div>
          </div>
          <DialogTitle className="text-2xl">External Evaluation</DialogTitle>
          <DialogDescription>
            You've been invited to provide feedback on this {currentEvaluation.content_type === "episode" ? "episode" : "One-Liner"}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        {evaluations.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b mb-4">
            {evaluations.map((item: any, index: number) => {
              const isActive = index === selectedIndex;

              // Generate label
              let label = "";
              if (item.content_type === "call_report" || item.content_type === "one_liner") {
                label = "One Liner";
              } else if (item.content_type === "episode") {
                // Simple sequential numbering
                label = `Ep ${index}`;
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedIndex(index)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-6 mt-6">
          {/* Evaluator Information */}
          {renderEvaluatorInfo()}

          {/* Content-type specific rendering */}
          {currentEvaluation.content_type === "episode" && renderEpisodeEvaluation()}
          {currentEvaluation.content_type === "call_report" && renderCallReportEvaluation()}
          {currentEvaluation.content_type === "one_liner" && renderOneLinerEvaluation()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
