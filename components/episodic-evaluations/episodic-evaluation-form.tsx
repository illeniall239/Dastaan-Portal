"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScoreCard } from "./score-card";
import { AutoCalculatedScore } from "./auto-calculated-score";
import { CallReportOverallAssessment } from "@/components/evaluations/call-report-overall-assessment";
import { useFormTimeTracking } from "@/lib/hooks/useFormTimeTracking";
import {
  episodicEvaluationSchema,
  calculatePagesScore,
  calculateScenesScore,
  calculateOverallAverage,
  type EpisodicEvaluationFormData,
} from "@/lib/validations/episodic-evaluations";
import {
  calculateOneLinerGrade,
  getOneLinerGradeColorClasses,
  oneLinerRatingScaleItems,
} from "@/lib/validations/evaluations";
import type { Episode, EpisodicEvaluation } from "@/types";
import { toast } from "sonner";
import { Loader2, Save, FilePenLine, Download, FileText, Paperclip } from "lucide-react";
import { DiscussionThread } from "@/components/call-reports/call-report-discussion";
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

interface EpisodicEvaluationFormProps {
  episode: Episode;
  existingEvaluation?: EpisodicEvaluation;
  onSubmit: (data: EpisodicEvaluationFormData) => Promise<void>;
  disabled?: boolean;
  showSubmit?: boolean;
  viewOnly?: boolean;
  currentUserId?: string;
  currentUserRole?: string;
}

export function EpisodicEvaluationForm({
  episode,
  existingEvaluation,
  onSubmit,
  disabled = false,
  showSubmit = true,
  viewOnly = false,
  currentUserId,
  currentUserRole,
}: EpisodicEvaluationFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraftData, setPendingDraftData] = useState<any>(null);
  const [initialTimeFromDraft, setInitialTimeFromDraft] = useState(0);
  const isReadOnly = disabled;

  // Track time spent on form
  const timeSpentMinutes = useFormTimeTracking({
    enabled: !isReadOnly,
    initialTime: initialTimeFromDraft,
  });

  // Form state - Episode metrics
  const [noOfPages, setNoOfPages] = useState(existingEvaluation?.no_of_pages || 45);
  const [noOfScenes, setNoOfScenes] = useState(existingEvaluation?.no_of_scenes || 22);
  const [freezeEndingScene, setFreezeEndingScene] = useState(
    existingEvaluation?.freeze_ending_scene || ""
  );
  const [summaryAnalysis, setSummaryAnalysis] = useState(
    existingEvaluation?.summary_analysis || ""
  );
  const [remarks, setRemarks] = useState(
    existingEvaluation?.remarks || ""
  );

  // Episode Evaluation qualitative remarks
  const [scenesRemarks, setScenesRemarks] = useState(
    existingEvaluation?.scenes_remarks || ""
  );
  const [characterizationRemarks, setCharacterizationRemarks] = useState(
    existingEvaluation?.characterization_remarks || ""
  );

  // Score state - 9 criteria
  const [conflictScore, setConflictScore] = useState(
    existingEvaluation?.conflict_of_content_score || 5
  );
  const [characterizationScore, setCharacterizationScore] = useState(
    existingEvaluation?.characterization_score || 5
  );
  const [progressionScore, setProgressionScore] = useState(
    existingEvaluation?.story_progression_score || 5
  );
  const [mainEventScore, setMainEventScore] = useState(
    existingEvaluation?.main_event_score || 5
  );
  const [smallEventScore, setSmallEventScore] = useState(
    existingEvaluation?.small_event_score || 5
  );
  const [dragnessScore, setDragnessScore] = useState(
    existingEvaluation?.dragness_score || 5
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

  // Feedback communication state
  const [feedbackText, setFeedbackText] = useState((existingEvaluation as any)?.feedback_text || "");
  const [feedbackAttachments, setFeedbackAttachments] = useState<Array<{ url: string; name: string }>>(
    (existingEvaluation as any)?.feedback_attachments || []
  );
  const [feedbackUploading, setFeedbackUploading] = useState(false);

  // Feedback-only toggle
  const [isFeedbackOnly, setIsFeedbackOnly] = useState(
    (existingEvaluation as any)?.is_feedback_only || false
  );

  // Final decision state
  const [decision, setDecision] = useState<"approve" | "reject" | "needs_revision" | "">(
    (existingEvaluation?.decision as "approve" | "reject" | "needs_revision") || ""
  );
  const [decisionNotes, setDecisionNotes] = useState(
    existingEvaluation?.decision_notes || ""
  );

  // Per-criterion comment state
  const [conflictComment, setConflictComment] = useState(
    existingEvaluation?.conflict_of_content_comment || ""
  );
  const [characterizationComment, setCharacterizationComment] = useState(
    existingEvaluation?.characterization_comment || ""
  );
  const [progressionComment, setProgressionComment] = useState(
    existingEvaluation?.story_progression_comment || ""
  );
  const [mainEventComment, setMainEventComment] = useState(
    existingEvaluation?.main_event_comment || ""
  );
  const [smallEventComment, setSmallEventComment] = useState(
    existingEvaluation?.small_event_comment || ""
  );
  const [dragnessComment, setDragnessComment] = useState(
    existingEvaluation?.dragness_comment || ""
  );
  const [freezesComment, setFreezesComment] = useState(
    existingEvaluation?.freezes_comment || ""
  );
  const [whatsNextComment, setWhatsNextComment] = useState(
    existingEvaluation?.whats_next_element_comment || ""
  );
  const [overallAssessmentComment, setOverallAssessmentComment] = useState(
    existingEvaluation?.overall_assessment_comment || ""
  );

  // Calculated values
  const pagesScore = calculatePagesScore(noOfPages);
  const scenesScore = calculateScenesScore(noOfScenes);
  const overallAverage = calculateOverallAverage({
    conflict: conflictScore,
    characterization: characterizationScore,
    progression: progressionScore,
    mainEvent: mainEventScore,
    smallEvent: smallEventScore,
    dragness: dragnessScore,
    freezes: freezesScore,
    whatsNext: whatsNextScore,
    overallAssessment: overallAssessmentScore,
  });

  // Check for existing draft on component mount
  useEffect(() => {
    if (!isReadOnly) {
      const fetchDraft = async () => {
        try {
          const response = await fetch(`/api/episodic-evaluations/draft/${episode.id}`);
          if (response.ok) {
            const { draft } = await response.json();
            if (draft && draft.draft_data) {
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
        freezeEndingScene,
        summaryAnalysis,
        remarks,
        scenesRemarks,
        characterizationRemarks,
        conflictScore,
        characterizationScore,
        progressionScore,
        mainEventScore,
        smallEventScore,
        dragnessScore,
        freezesScore,
        whatsNextScore,
        overallAssessmentScore,
        conflictComment,
        characterizationComment,
        progressionComment,
        mainEventComment,
        smallEventComment,
        dragnessComment,
        freezesComment,
        whatsNextComment,
        overallAssessmentComment,
        decision,
        decisionNotes,
        feedbackText,
        feedbackAttachments,
        isFeedbackOnly,
        accumulatedTimeMinutes: timeSpentMinutes,
      };

      const response = await fetch(`/api/episodic-evaluations/draft/${episode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setNoOfPages(pendingDraftData.noOfPages ?? 45);
      setNoOfScenes(pendingDraftData.noOfScenes ?? 22);
      setFreezeEndingScene(pendingDraftData.freezeEndingScene || "");
      setSummaryAnalysis(pendingDraftData.summaryAnalysis || "");
      setRemarks(pendingDraftData.remarks || "");
      setScenesRemarks(pendingDraftData.scenesRemarks || "");
      setCharacterizationRemarks(pendingDraftData.characterizationRemarks || "");
      setConflictScore(pendingDraftData.conflictScore ?? 5);
      setCharacterizationScore(pendingDraftData.characterizationScore ?? 5);
      setProgressionScore(pendingDraftData.progressionScore ?? 5);
      setMainEventScore(pendingDraftData.mainEventScore ?? 5);
      setSmallEventScore(pendingDraftData.smallEventScore ?? 5);
      setDragnessScore(pendingDraftData.dragnessScore ?? 5);
      setFreezesScore(pendingDraftData.freezesScore ?? 5);
      setWhatsNextScore(pendingDraftData.whatsNextScore ?? 5);
      setOverallAssessmentScore(pendingDraftData.overallAssessmentScore ?? 5);
      setConflictComment(pendingDraftData.conflictComment || "");
      setCharacterizationComment(pendingDraftData.characterizationComment || "");
      setProgressionComment(pendingDraftData.progressionComment || "");
      setMainEventComment(pendingDraftData.mainEventComment || "");
      setSmallEventComment(pendingDraftData.smallEventComment || "");
      setDragnessComment(pendingDraftData.dragnessComment || "");
      setFreezesComment(pendingDraftData.freezesComment || "");
      setWhatsNextComment(pendingDraftData.whatsNextComment || "");
      setOverallAssessmentComment(pendingDraftData.overallAssessmentComment || "");
      setDecision(pendingDraftData.decision || "");
      setDecisionNotes(pendingDraftData.decisionNotes || "");
      setFeedbackText(pendingDraftData.feedbackText || "");
      setFeedbackAttachments(pendingDraftData.feedbackAttachments || []);
      setIsFeedbackOnly(pendingDraftData.isFeedbackOnly || false);

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

  const handleFeedbackFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFeedbackUploading(true);
    try {
      const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserClient();
      const uploaded: Array<{ url: string; name: string }> = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `feedback-communications/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        uploaded.push({ url: path, name: file.name });
      }
      setFeedbackAttachments(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      toast.error("Failed to upload attachment: " + (err?.message || "Unknown error"));
    } finally {
      setFeedbackUploading(false);
      e.target.value = "";
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      toast.error("Cannot modify submitted evaluation");
      return;
    }

    if (!decision) {
      toast.error("Please select a decision before submitting");
      return;
    }
    if ((decision === "reject" || decision === "needs_revision") && !decisionNotes.trim()) {
      toast.error("Please provide notes for your decision");
      return;
    }

    const formData = {
      episode_id: episode.id,
      is_feedback_only: isFeedbackOnly,
      no_of_pages: noOfPages,
      no_of_scenes: noOfScenes,
      freeze_ending_scene: freezeEndingScene || undefined,
      summary_analysis: summaryAnalysis || undefined,
      remarks: remarks || undefined,
      scenes_remarks: scenesRemarks || undefined,
      characterization_remarks: characterizationRemarks || undefined,
      // 9 scoring criteria
      conflict_of_content_score: conflictScore,
      characterization_score: characterizationScore,
      story_progression_score: progressionScore,
      main_event_score: mainEventScore,
      small_event_score: smallEventScore,
      dragness_score: dragnessScore,
      freezes_score: freezesScore,
      whats_next_element_score: whatsNextScore,
      overall_assessment_score: overallAssessmentScore,
      // Per-criterion comments
      conflict_of_content_comment: conflictComment || undefined,
      characterization_comment: characterizationComment || undefined,
      story_progression_comment: progressionComment || undefined,
      main_event_comment: mainEventComment || undefined,
      small_event_comment: smallEventComment || undefined,
      dragness_comment: dragnessComment || undefined,
      freezes_comment: freezesComment || undefined,
      whats_next_element_comment: whatsNextComment || undefined,
      overall_assessment_comment: overallAssessmentComment || undefined,
      time_spent_minutes: timeSpentMinutes,
      started_at: new Date().toISOString(),
      decision: decision as "approve" | "reject" | "needs_revision",
      decision_notes: (decision === "reject" || decision === "needs_revision")
        ? decisionNotes
        : undefined,
      feedback_text: feedbackText || undefined,
      feedback_attachments: feedbackAttachments,
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
      }
    } catch (error: any) {
      console.error("Form submission error:", error);
      toast.error(error.message || "Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  // Score criteria definitions with comments
  const scoreCriteria = [
    {
      label: "Conflict of Content",
      description: "How engaging and well-developed is the central conflict?",
      score: conflictScore,
      setScore: setConflictScore,
      comment: conflictComment,
      setComment: setConflictComment,
    },
    {
      label: "Characterization",
      description: "How compelling and relatable are the characters?",
      score: characterizationScore,
      setScore: setCharacterizationScore,
      comment: characterizationComment,
      setComment: setCharacterizationComment,
    },
    {
      label: "Story Progression",
      description: "How effectively does the narrative move the story forward?",
      score: progressionScore,
      setScore: setProgressionScore,
      comment: progressionComment,
      setComment: setProgressionComment,
    },
    {
      label: "Main Event",
      description: "How impactful and well-executed is the main event of the episode?",
      score: mainEventScore,
      setScore: setMainEventScore,
      comment: mainEventComment,
      setComment: setMainEventComment,
    },
    {
      label: "Small Event",
      description: "How effective are the supporting events in building the narrative?",
      score: smallEventScore,
      setScore: setSmallEventScore,
      comment: smallEventComment,
      setComment: setSmallEventComment,
    },
    {
      label: "Dragness",
      description: "How draggy is the episode? (1 = no drag, 10 = very draggy) — lower score is better.",
      score: dragnessScore,
      setScore: setDragnessScore,
      comment: dragnessComment,
      setComment: setDragnessComment,
      reversed: true,
    },
    {
      label: "Freeze",
      description: "How effective are the cliffhangers/freeze moments in creating suspense?",
      score: freezesScore,
      setScore: setFreezesScore,
      comment: freezesComment,
      setComment: setFreezesComment,
    },
    {
      label: "What Next Element",
      description: "How strong is the anticipation for the next episode?",
      score: whatsNextScore,
      setScore: setWhatsNextScore,
      comment: whatsNextComment,
      setComment: setWhatsNextComment,
    },
    {
      label: "Overall Episode Grade",
      description: "What is your overall impression of this episode?",
      score: overallAssessmentScore,
      setScore: setOverallAssessmentScore,
      comment: overallAssessmentComment,
      setComment: setOverallAssessmentComment,
    },
  ];

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

      {/* Feedback-only toggle */}
      {!isReadOnly && (
        <Card className="p-4 border-2 border-amber-200 bg-amber-50/50">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeedbackOnly}
              onChange={(e) => setIsFeedbackOnly(e.target.checked)}
              className="h-5 w-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
            />
            <div>
              <span className="font-semibold text-amber-800">Feedback Only</span>
              <p className="text-xs text-amber-700 mt-0.5">
                Email/document feedback only — no scoring. Scores will not count towards content aging or reports.
              </p>
            </div>
          </label>
        </Card>
      )}

      {/* Editable sections wrapper — pointer-events-none when view-only (no graying) */}
      <div className={viewOnly ? "pointer-events-none" : ""}>

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
              onBlur={() => {
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
              onBlur={() => {
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

        {/* FREEZE (Ending Scene) */}
        <div className="space-y-2">
          <Label htmlFor="freeze_ending_scene">
            FREEZE (Ending Scene)
          </Label>
          <Textarea
            id="freeze_ending_scene"
            placeholder="Describe the ending scene / cliffhanger of this episode..."
            rows={3}
            value={freezeEndingScene}
            onChange={(e) => setFreezeEndingScene(e.target.value)}
            disabled={isReadOnly}
          />
          <p className="text-xs text-muted-foreground">
            Describe the freeze/cliffhanger moment at the end of the episode
          </p>
        </div>
      </div>

      {/* Section 2: Episode Evaluation (Qualitative) */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Section 2: Episode Evaluation</h3>
        <p className="text-sm text-muted-foreground">
          Evaluate the following aspects of the episode. Review the guidance and provide your remarks.
        </p>

        {/* Scenes evaluation */}
        <Card className="p-5 space-y-3">
          <div>
            <Label className="text-base font-semibold">Scenes</Label>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 font-medium">What to Check:</p>
              <p className="text-sm text-blue-700 mt-1">
                Are there enough well-connected scenes and enough main lead scenes that maintain story flow?
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="scenes_remarks" className="text-sm">Remarks / Notes</Label>
            <Textarea
              id="scenes_remarks"
              placeholder="Enter your remarks about scenes..."
              rows={3}
              value={scenesRemarks}
              onChange={(e) => setScenesRemarks(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </Card>

        {/* Characterization evaluation */}
        <Card className="p-5 space-y-3">
          <div>
            <Label className="text-base font-semibold">Characterization</Label>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 font-medium">What to Check:</p>
              <p className="text-sm text-blue-700 mt-1">
                Are main leads prominent and consistent, and side characters&apos; arcs balanced?
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="characterization_remarks" className="text-sm">Remarks / Notes</Label>
            <Textarea
              id="characterization_remarks"
              placeholder="Enter your remarks about characterization..."
              rows={3}
              value={characterizationRemarks}
              onChange={(e) => setCharacterizationRemarks(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </Card>
      </div>

      {/* Rating Scale Reference */}
      <Card className="p-4 border-2 border-blue-100 bg-blue-50/30">
        <div className="text-base font-semibold mb-2">Rating Scale</div>
        <div className="space-y-2 text-sm">
          {oneLinerRatingScaleItems.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="font-semibold text-gray-600 min-w-[60px]">{item.range}:</span>
              <span className={`${item.color} font-medium`}>{item.description}</span>
            </div>
          ))}
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

      {/* Sections 4-6: Scoring — hidden for feedback-only evaluations */}
      {!isFeedbackOnly && (<>
      {/* Section 4: Evaluation Scores (9 criteria with comments) */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Section 4: Evaluation Scores</h3>
        <p className="text-sm text-muted-foreground">
          Rate each criterion on a scale of 1-10. The grade for each criterion will be calculated automatically.
        </p>

        <div className="space-y-4">
          {scoreCriteria.map((criterion) => (
            <div key={criterion.label} className="space-y-2">
              <ScoreCard
                label={criterion.label}
                description={criterion.description}
                score={criterion.score}
                onChange={criterion.setScore}
                disabled={isReadOnly}
                gradeFn={criterion.reversed ? (s) => calculateOneLinerGrade(11 - s) : calculateOneLinerGrade}
                gradeColorFn={getOneLinerGradeColorClasses}
              />
              <div className="ml-4">
                <Textarea
                  placeholder={`Comments for ${criterion.label} (optional)...`}
                  rows={2}
                  value={criterion.comment}
                  onChange={(e) => criterion.setComment(e.target.value)}
                  disabled={isReadOnly}
                  className="text-sm"
                />
              </div>
            </div>
          ))}
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
        <CallReportOverallAssessment
          average={overallAverage}
          gradeFn={calculateOneLinerGrade}
          gradeColorFn={getOneLinerGradeColorClasses}
          ratingScaleItems={oneLinerRatingScaleItems}
        />
      </div>
      </>)}

      {/* Final Decision */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Final Decision *</h3>
        <p className="text-sm text-muted-foreground">
          Based on your evaluation, select your recommendation for this episode.
        </p>

        <Card className="p-4 border-2 border-slate-200">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Your Decision *</Label>
              <div className="space-y-3">
                {/* Approve */}
                <label
                  className={`flex items-start p-4 rounded-lg border-2 transition-all ${
                    isReadOnly ? "cursor-default" : "cursor-pointer"
                  } ${
                    decision === "approve"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="approve"
                    checked={decision === "approve"}
                    onChange={() => { setDecision("approve"); setDecisionNotes(""); }}
                    disabled={isReadOnly}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500"
                  />
                  <div className="ml-3">
                    <div className="font-semibold text-green-700">Approve</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommend this episode for approval
                    </p>
                  </div>
                </label>

                {/* Needs Revision */}
                <label
                  className={`flex items-start p-4 rounded-lg border-2 transition-all ${
                    isReadOnly ? "cursor-default" : "cursor-pointer"
                  } ${
                    decision === "needs_revision"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-gray-200 hover:border-yellow-300 hover:bg-yellow-50/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="needs_revision"
                    checked={decision === "needs_revision"}
                    onChange={() => setDecision("needs_revision")}
                    disabled={isReadOnly}
                    className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                  />
                  <div className="ml-3">
                    <div className="font-semibold text-yellow-700">Needs Revision</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Episode has potential but requires revisions
                    </p>
                  </div>
                </label>

                {/* Reject */}
                <label
                  className={`flex items-start p-4 rounded-lg border-2 transition-all ${
                    isReadOnly ? "cursor-default" : "cursor-pointer"
                  } ${
                    decision === "reject"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-red-300 hover:bg-red-50/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="reject"
                    checked={decision === "reject"}
                    onChange={() => setDecision("reject")}
                    disabled={isReadOnly}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <div className="ml-3">
                    <div className="font-semibold text-red-700">Reject</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Do not recommend this episode
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Decision Notes */}
            {(decision === "reject" || decision === "needs_revision") && (
              <div
                className={`space-y-2 p-3 rounded-lg border ${
                  decision === "reject"
                    ? "bg-red-50 border-red-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <Label
                  htmlFor="decisionNotes"
                  className={`text-base font-semibold ${
                    decision === "reject" ? "text-red-900" : "text-yellow-900"
                  }`}
                >
                  {decision === "reject"
                    ? "Justification for Rejection *"
                    : "What Revisions Are Needed? *"}
                </Label>
                <Textarea
                  id="decisionNotes"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder={
                    decision === "reject"
                      ? "Please explain your reasons for rejecting this episode..."
                      : "Please explain what revisions are needed for this episode..."
                  }
                  rows={4}
                  className="bg-white"
                  disabled={isReadOnly}
                  required
                />
                <p
                  className={`text-xs ${
                    decision === "reject" ? "text-red-700" : "text-yellow-700"
                  }`}
                >
                  Providing detailed justification helps improve future episodes
                </p>
              </div>
            )}

            {/* Score vs decision warnings */}
            {decision === "approve" && overallAverage < 5.0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  Warning: You cannot approve an episode with an average score below 5.0 (current: {overallAverage.toFixed(1)})
                </p>
              </div>
            )}

            {decision === "reject" && overallAverage >= 7.0 && (
              <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
                <p className="text-sm text-blue-800">
                  Note: You selected Reject but the score is {overallAverage.toFixed(1)}/10 (high). Please confirm your decision is correct.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      </div>{/* end viewOnly wrapper */}

      {/* Feedback Communication */}
      {(!isReadOnly || feedbackText || feedbackAttachments.length > 0) && (
        <Card className="p-4 border border-gray-200">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Feedback Communication {!isReadOnly && <span className="text-sm font-normal text-gray-500">(optional)</span>}</h3>
              {!isReadOnly && <p className="text-xs text-gray-500 mt-0.5">Attach email or written feedback evidence submitted alongside this evaluation.</p>}
            </div>
            {isReadOnly ? (
              <>
                {feedbackText && (
                  <div className="space-y-2">
                    <Label>Email / Communication Text</Label>
                    <div className="bg-gray-50 border rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">{feedbackText}</div>
                  </div>
                )}
                {feedbackAttachments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Supporting Attachments</Label>
                    <div className="space-y-1.5">
                      {feedbackAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 border rounded-md px-3 py-2 bg-gray-50">
                          <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                          <a href={`/api/storage/download?url=${encodeURIComponent(att.url)}&bucket=attachments`} target="_blank" rel="noopener noreferrer" className="truncate flex-1 hover:underline text-blue-600">{att.name}</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="feedbackText">Email / Communication Text</Label>
                  <Textarea
                    id="feedbackText"
                    placeholder="Paste email or communication content here..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Supporting Attachments</Label>
                  {feedbackAttachments.length > 0 && (
                    <div className="space-y-1.5">
                      {feedbackAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 border rounded-md px-3 py-2 bg-gray-50">
                          <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                          <a href={`/api/storage/download?url=${encodeURIComponent(att.url)}&bucket=attachments`} target="_blank" rel="noopener noreferrer" className="truncate flex-1 hover:underline text-blue-600">{att.name}</a>
                          <button
                            type="button"
                            onClick={() => setFeedbackAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 shrink-0"
                            aria-label="Remove attachment"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 cursor-pointer border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                    {feedbackUploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Paperclip className="h-4 w-4" /> Add Files</>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      className="sr-only"
                      onChange={handleFeedbackFileUpload}
                      disabled={feedbackUploading}
                    />
                  </label>
                  <p className="text-xs text-gray-400">PDF, DOC, DOCX, JPG, PNG — max 10MB each</p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Discussion Thread */}
      {currentUserId && (
        <DiscussionThread
          entityId={episode.id}
          apiBasePath="/api/episodes"
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          compact={true}
          defaultExpanded={true}
          title="Episode Feedback"
        />
      )}

      {/* Submit and Save Draft Buttons */}
      {showSubmit && (
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
