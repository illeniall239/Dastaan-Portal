"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { EventsList } from "./events-list";
import { ScoreCard } from "./score-card";
import { AutoCalculatedScore } from "./auto-calculated-score";
import { OverallAssessment } from "./overall-assessment";
import { useFormTimeTracking } from "@/lib/hooks/useFormTimeTracking";
import {
  episodicEvaluationSchema,
  calculatePagesScore,
  calculateScenesScore,
  calculateGrade,
  calculateOverallAverage,
  type EpisodicEvaluationFormData,
} from "@/lib/validations/episodic-evaluations";
import type { Episode, EpisodicEvaluation, EpisodicGrade } from "@/types";
import { toast } from "sonner";
import { Loader2, Save, FilePenLine, Download, FileText, Paperclip } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface DraftData {
  noOfPages: number;
  noOfScenes: number;
  events: any[];
  summaryAnalysis?: string;
  conflictScore: number;
  characterizationScore: number;
  progressionScore: number;
  freezesScore: number;
  whatsNextScore: number;
  remarks?: string;
  savedAt: string;
  episodeId: string;
}

interface EpisodicEvaluationFormProps {
  episode: Episode;
  existingEvaluation?: EpisodicEvaluation;
  onSubmit: (data: EpisodicEvaluationFormData) => Promise<void>;
  disabled?: boolean;
}

export function EpisodicEvaluationForm({
  episode,
  existingEvaluation,
  onSubmit,
  disabled = false,
}: EpisodicEvaluationFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraftData, setPendingDraftData] = useState<any>(null);
  const [initialTimeFromDraft, setInitialTimeFromDraft] = useState(0);
  const isReadOnly = disabled || !!existingEvaluation;

  // Track time spent on form
  const timeSpentMinutes = useFormTimeTracking({
    enabled: !isReadOnly,
    initialTime: initialTimeFromDraft,
  });

  // Form state
  const [noOfPages, setNoOfPages] = useState(existingEvaluation?.no_of_pages || 45);
  const [noOfScenes, setNoOfScenes] = useState(existingEvaluation?.no_of_scenes || 22);
  const [events, setEvents] = useState<any[]>(
    existingEvaluation?.events || []
  );
  const [summaryAnalysis, setSummaryAnalysis] = useState(
    existingEvaluation?.summary_analysis || ""
  );
  const [remarks, setRemarks] = useState(
    existingEvaluation?.remarks || ""
  );

  // Score state
  const [conflictScore, setConflictScore] = useState(
    existingEvaluation?.conflict_of_content_score || 5
  );
  const [characterizationScore, setCharacterizationScore] = useState(
    existingEvaluation?.characterization_score || 5
  );
  const [progressionScore, setProgressionScore] = useState(
    existingEvaluation?.story_progression_score || 5
  );
  const [freezesScore, setFreezesScore] = useState(
    existingEvaluation?.freezes_score || 5
  );
  const [whatsNextScore, setWhatsNextScore] = useState(
    existingEvaluation?.whats_next_element_score || 5
  );
  const [overallAssessmentScore, setOverallAssessmentScore] = useState(
    existingEvaluation?.overall_assessment_score || 5
  );

  // Calculated values
  const pagesScore = calculatePagesScore(noOfPages);
  const scenesScore = calculateScenesScore(noOfScenes);
  const overallAverage = calculateOverallAverage({
    conflict: conflictScore,
    characterization: characterizationScore,
    progression: progressionScore,
    freezes: freezesScore,
    whatsNext: whatsNextScore,
    overallAssessment: overallAssessmentScore,
  });
  const overallGrade = calculateGrade(overallAverage) as EpisodicGrade;

  // Check for existing draft on component mount
  useEffect(() => {
    if (!isReadOnly) {
      const fetchDraft = async () => {
        try {
          const response = await fetch(`/api/episodic-evaluations/draft/${episode.id}`);
          if (response.ok) {
            const { draft } = await response.json();
            if (draft && draft.draft_data) {
              // Store draft data and show custom dialog
              setPendingDraftData(draft.draft_data);
              setShowDraftDialog(true);
            }
          } else {
            console.error("Failed to fetch draft:", response);
          }
        } catch (error) {
          console.error("Error fetching draft:", error);
        }
      };

      fetchDraft();
    }
  }, [episode.id, isReadOnly]);

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const draftData = {
        noOfPages,
        noOfScenes,
        events,
        summaryAnalysis,
        conflictScore,
        characterizationScore,
        progressionScore,
        freezesScore,
        whatsNextScore,
        overallAssessmentScore,
        remarks,
        accumulatedTimeMinutes: timeSpentMinutes,
      };

      const response = await fetch(`/api/episodic-evaluations/draft/${episode.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData),
      });

      if (response.ok) {
        toast.success("Draft saved successfully!");
      } else {
        const errorData = await response.json();
        console.error("Failed to save draft:", errorData);
        toast.error("Failed to save draft: " + (errorData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleLoadDraft = () => {
    if (pendingDraftData) {
      setNoOfPages(pendingDraftData.noOfPages);
      setNoOfScenes(pendingDraftData.noOfScenes);
      setEvents(pendingDraftData.events);
      setSummaryAnalysis(pendingDraftData.summaryAnalysis || "");
      setConflictScore(pendingDraftData.conflictScore);
      setCharacterizationScore(pendingDraftData.characterizationScore);
      setProgressionScore(pendingDraftData.progressionScore);
      setFreezesScore(pendingDraftData.freezesScore);
      setWhatsNextScore(pendingDraftData.whatsNextScore);
      setOverallAssessmentScore(pendingDraftData.overallAssessmentScore || 5);
      setRemarks(pendingDraftData.remarks || "");

      // Load accumulated time from draft
      setInitialTimeFromDraft(pendingDraftData.accumulatedTimeMinutes || 0);

      toast.success("Draft loaded successfully!");
      setShowDraftDialog(false);
      setPendingDraftData(null);
    }
  };

  const handleStartFresh = () => {
    setShowDraftDialog(false);
    setPendingDraftData(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      toast.error("Cannot modify submitted evaluation");
      return;
    }

    // Validate form data
    // Check if at least one event exists
    if (events.length === 0) {
      toast.error("At least one event is required");
      return;
    }

    // Filter out empty events (those with no title)
    const filteredEvents = events.filter((e) => {
      if (typeof e === 'string') {
        return e.trim().length > 0;
      }
      return e.title && e.title.trim().length > 0;
    });

    // Check if at least one valid event with a title exists
    if (filteredEvents.length === 0) {
      toast.error("At least one valid event with a title is required");
      return;
    }

    const formData = {
      episode_id: episode.id,
      no_of_pages: noOfPages,
      no_of_scenes: noOfScenes,
      events: filteredEvents,
      summary_analysis: summaryAnalysis,
      conflict_of_content_score: conflictScore,
      characterization_score: characterizationScore,
      story_progression_score: progressionScore,
      freezes_score: freezesScore,
      whats_next_element_score: whatsNextScore,
      overall_assessment_score: overallAssessmentScore,
      remarks: remarks,
      time_spent_minutes: timeSpentMinutes,
      started_at: new Date().toISOString(),
    };

    const validation = episodicEvaluationSchema.safeParse(formData);

    if (!validation.success) {
      const errors = validation.error.format();
      console.error("Validation errors:", errors);
      toast.error("Please check all required fields");
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(validation.data);
      // Delete draft after successful submission
      try {
        await fetch(`/api/episodic-evaluations/draft/${episode.id}`, {
          method: 'DELETE',
        });
      } catch (deleteError) {
        console.error("Error deleting draft after submission:", deleteError);
        // Don't show error to user, as main submission was successful
      }
    } catch (error: any) {
      console.error("Form submission error:", error);
      toast.error(error.message || "Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8 px-4 sm:px-0">
      {/* Episode Details Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <h2 className="text-2xl font-bold mb-4">Episode Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-muted-foreground">Episode Number</span>
            <p className="text-lg font-semibold">Episode {episode.episode_number}</p>
          </div>
          {episode.title && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Title</span>
              <p className="text-lg font-semibold">{episode.title}</p>
            </div>
          )}
        </div>

        {/* Episode Attachment */}
        {episode.attachment_url ? (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
              <Paperclip className="h-3.5 w-3.5" />
              Attachment
            </span>
            <button
              type="button"
              onClick={() => window.open(`/api/episodes/download/${episode.id}`, "_blank")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm font-medium text-blue-700 shadow-sm"
            >
              <FileText className="h-4 w-4" />
              <span className="truncate max-w-[300px]">{episode.attachment_name || "Download File"}</span>
              <Download className="h-4 w-4 ml-1 opacity-60" />
            </button>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              No attachment uploaded for this episode
            </span>
          </div>
        )}
      </Card>

      {/* Section 1: Episode Metrics */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Section 1: Episode Metrics</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Pages Input */}
          <div className="space-y-2">
            <Label htmlFor="no_of_pages">
              Number of Pages <span className="text-red-500">*</span>
            </Label>
            <Input
              id="no_of_pages"
              type="number"
              value={noOfPages || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setNoOfPages(0);
                } else {
                  const num = parseInt(value);
                  if (!isNaN(num) && num > 0) {
                    setNoOfPages(num);
                  }
                }
              }}
              onBlur={(e) => {
                if (noOfPages === 0 || !noOfPages) {
                  setNoOfPages(1);
                }
              }}
              disabled={isReadOnly}
              required
              className="text-lg font-semibold"
              placeholder="Enter number of pages"
            />
            <p className="text-xs text-muted-foreground">
              Standard: 45 pages
            </p>
          </div>

          {/* Scenes Input */}
          <div className="space-y-2">
            <Label htmlFor="no_of_scenes">
              Number of Scenes <span className="text-red-500">*</span>
            </Label>
            <Input
              id="no_of_scenes"
              type="number"
              value={noOfScenes || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setNoOfScenes(0);
                } else {
                  const num = parseInt(value);
                  if (!isNaN(num) && num > 0) {
                    setNoOfScenes(num);
                  }
                }
              }}
              onBlur={(e) => {
                if (noOfScenes === 0 || !noOfScenes) {
                  setNoOfScenes(1);
                }
              }}
              disabled={isReadOnly}
              required
              className="text-lg font-semibold"
              placeholder="Enter number of scenes"
            />
            <p className="text-xs text-muted-foreground">
              Standard: 22 scenes
            </p>
          </div>
        </div>

        {/* Auto-calculated Scores */}
        <div className="grid md:grid-cols-2 gap-6">
          <AutoCalculatedScore type="pages" value={noOfPages} score={pagesScore} />
          <AutoCalculatedScore type="scenes" value={noOfScenes} score={scenesScore} />
        </div>
      </div>

      {/* Section 2: Events */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Section 2: Events</h3>
        <EventsList events={events} onChange={setEvents} disabled={isReadOnly} />
      </div>

      {/* Rating Scale - placed below Events section */}
      <Card className="p-4 border-2 border-blue-100 bg-blue-50/30">
        <div className="text-base font-semibold mb-2">Rating Scale</div>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-3">
            <span className="font-semibold text-gray-600 min-w-[80px]">9.0 - 10.0:</span>
            <span className="text-green-700 font-medium">High rating potential</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-semibold text-gray-600 min-w-[80px]">7.0 - 8.9:</span>
            <span className="text-blue-700 font-medium">Rating potential audience appeal</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-semibold text-gray-600 min-w-[80px]">5.0 - 6.9:</span>
            <span className="text-amber-700 font-medium">Need improvement - Required editing or continuous supervision</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-semibold text-gray-600 min-w-[80px]">&lt; 5.0:</span>
            <span className="text-red-700 font-medium">Either unacceptable or need major re-writing and editing</span>
          </div>
        </div>
      </Card>

      {/* Section 3: Summary/Analysis */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Section 3: Summary/Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Provide a written summary and analysis of the episode before rating.
        </p>
        <div className="space-y-2">
          <Label htmlFor="summaryAnalysis">Your Analysis</Label>
          <Textarea
            id="summaryAnalysis"
            placeholder="Write your summary and analysis of this episode..."
            rows={8}
            value={summaryAnalysis}
            onChange={(e) => setSummaryAnalysis(e.target.value)}
            disabled={isReadOnly}
            className="min-h-[200px]"
          />
        </div>
      </div>

      {/* Section 4: Evaluation Scores */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Section 4: Evaluation Scores</h3>
        <p className="text-sm text-muted-foreground">
          Rate each criterion on a scale of 1-10. The grade for each criterion will be calculated automatically.
        </p>

        <div className="space-y-4">
          <ScoreCard
            label="Conflict of Content"
            description="How engaging and well-developed is the central conflict?"
            score={conflictScore}
            onChange={setConflictScore}
            disabled={isReadOnly}
          />

          <ScoreCard
            label="Characterization"
            description="How compelling and relatable are the characters?"
            score={characterizationScore}
            onChange={setCharacterizationScore}
            disabled={isReadOnly}
          />

          <ScoreCard
            label="Story Progression"
            description="How effectively does the narrative move the story forward?"
            score={progressionScore}
            onChange={setProgressionScore}
            disabled={isReadOnly}
          />

          <ScoreCard
            label="Freezes"
            description="How effective are the cliffhangers in creating suspense?"
            score={freezesScore}
            onChange={setFreezesScore}
            disabled={isReadOnly}
          />

          <ScoreCard
            label="What's Next Element"
            description="How strong is the anticipation for the next episode?"
            score={whatsNextScore}
            onChange={setWhatsNextScore}
            disabled={isReadOnly}
          />

          <ScoreCard
            label="Final Impression"
            description="What is your overall impression of this episode?"
            score={overallAssessmentScore}
            onChange={setOverallAssessmentScore}
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Section 5: Remarks */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Section 5: Comments/Remarks</h3>
        <p className="text-sm text-muted-foreground">
          Any additional comments or remarks about the episode?
        </p>
        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks (Optional)</Label>
          <Textarea
            id="remarks"
            placeholder="Enter any additional remarks..."
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Section 6: Overall Assessment */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Section 6: Overall Assessment</h3>
        <OverallAssessment average={overallAverage} grade={overallGrade} />
      </div>

      {/* Submit and Save Draft Buttons */}
      {!isReadOnly && (
        <div className="flex justify-end gap-4 pt-6 border-t sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-3 sm:p-0 sm:static sm:bg-transparent sm:backdrop-blur-0 sm:border-0">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={saveDraft}
            disabled={submitting || savingDraft}
            className="min-w-[150px]"
          >
            {savingDraft ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FilePenLine className="mr-2 h-4 w-4" />
                Save Draft
              </>
            )}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="min-w-[200px]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Submit Evaluation
              </>
            )}
          </Button>
        </div>
      )}

      {isReadOnly && existingEvaluation && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-center text-blue-800 font-medium">
            This evaluation was submitted on{" "}
            {new Date(existingEvaluation.submitted_at).toLocaleString()}
            {" "}and cannot be modified.
          </p>
        </Card>
      )}

      {/* Draft Found Dialog */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 rounded-full">
                <FilePenLine className="h-6 w-6 text-[#224794]" />
              </div>
              <AlertDialogTitle className="text-xl">Draft Found</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              A draft was found for this evaluation. Would you like to load it and continue where you left off, or start fresh?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel onClick={handleStartFresh} className="sm:w-auto">
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLoadDraft}
              className="bg-[#224794] hover:bg-[#1a3670] sm:w-auto"
            >
              <FilePenLine className="mr-2 h-4 w-4" />
              Load Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
