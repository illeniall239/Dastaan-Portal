"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { createEvaluationClient, updateEvaluationClient } from "@/lib/evaluations/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, PaperclipIcon, Loader2, FilePenLine, AlertTriangle, Share2 as Share2Icon } from "lucide-react";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import { CallReportOverallAssessment } from "@/components/evaluations/call-report-overall-assessment";
import { DetailedOneLinerDisplay } from "@/components/evaluations/detailed-one-liner-display";
import { calculateOneLinerGrade, getOneLinerGradeColorClasses, oneLinerRatingScaleItems } from "@/lib/validations/evaluations";
import { useFormTimeTracking } from "@/lib/hooks/useFormTimeTracking";
import { BackButton } from "@/components/ui/back-button";
import { TagInput } from "@/components/ui/tag-input";
import { ContentRevisions } from "@/components/ui/content-revisions";
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
import { WriterSelect } from "@/components/writers/writer-select";
import type { Writer } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format-date";
import { CallReportDiscussion } from "@/components/call-reports/call-report-discussion";

interface CallReportWriter {
  writer_id: string;
  writer_name: string;
  writer_email?: string;
  writer_phone?: string;
  display_order: number;
}

interface CallReport {
  id: string;
  call_report_id: string;
  working_title: string;
  writer_name: string;
  contact_email: string;
  logline: string;
  short_synopsis?: string;
  episodic_synopsis?: string;
  category: string;
  content_type?: string;
  overall_rating?: number;
  writers?: CallReportWriter[];
  created_at?: string;
}

export function EvaluatorEvaluationForm({
  callReport,
  userId,
  userName,
  attachments = [],
  progress = null,
  detailedOneLiner = null,
  isManagementEvaluation = false,
  existingEvaluation: propExistingEvaluation = null,
  portalPrefix = "evaluator",
  crossTeamShareId,
  crossTeamFromTeamName,
  revisionId,
  canEdit = true,
  viewOnly = false,
}: {
  callReport: CallReport;
  userId: string;
  userName: string;
  attachments?: any[];
  progress?: any;
  detailedOneLiner?: any;
  isManagementEvaluation?: boolean;
  existingEvaluation?: any;
  portalPrefix?: string;
  crossTeamShareId?: string;
  crossTeamFromTeamName?: string;
  revisionId?: string;
  canEdit?: boolean;
  viewOnly?: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWriter, setSelectedWriter] = useState<Writer | undefined>();
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraftData, setPendingDraftData] = useState<any>(null);
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const isReadOnly = (!!existingEvaluation && !isEditing) || viewOnly;
  const [initialTimeFromDraft, setInitialTimeFromDraft] = useState(0);

  // Feedback communication state
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackAttachments, setFeedbackAttachments] = useState<Array<{ url: string; name: string }>>([]);
  const [feedbackUploading, setFeedbackUploading] = useState(false);

  // Track time spent on form
  const timeSpentMinutes = useFormTimeTracking({
    enabled: !existingEvaluation || isEditing,
    initialTime: initialTimeFromDraft,
  });

  // Enable edit mode when ?edit=1 is present and an existing evaluation exists
  const searchParams = useSearchParams();
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (editParam === "1" && existingEvaluation) {
      setIsEditing(true);
    }
  }, [searchParams, existingEvaluation]);

  // Form state
  const [formData, setFormData] = useState({
    // New criteria scores
    conflictOfContentScore: 5,
    characterizationScore: 5,
    storyProgressionScore: 5,
    whatsNextElementScore: 5,
    overallOnelinerGradeScore: 5,
    // Per-criterion comments
    conflictOfContentComment: "",
    characterizationComment: "",
    storyProgressionComment: "",
    whatsNextElementComment: "",
    overallOnelinerGradeComment: "",
    // Descriptive evaluation
    themesOfDrama: [] as string[],
    correspondingDramas: [] as string[],
    themeCategory: "" as "" | "commercial" | "non_commercial" | "commercial_edge",
    audienceFocus: "" as "" | "male_centric" | "female_centric" | "both",
    noOfTracks: "" as string,
    closingRemarks: "",
    // Additional project info
    targetWriterId: "",
    perEpPriceRange: "",
    slot: "",
    first2EpsRequired: false,
    // Decision
    decision: "" as "approve" | "reject" | "needs_improvement" | "",
    decisionNotes: "",
    delayReason: "",
  });

  // Check if evaluation is late (> 3 days since call report was created)
  const isEvaluationLate = useMemo(() => {
    if (!callReport?.created_at) return false;
    const createdDate = new Date(callReport.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 3;
  }, [callReport?.created_at]);

  // Calculate days since call report was created
  const daysSinceCreation = useMemo(() => {
    if (!callReport?.created_at) return 0;
    const createdDate = new Date(callReport.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [callReport?.created_at]);

  // Calculate average score from new 5 criteria
  const [averageScore, setAverageScore] = useState(5);

  useEffect(() => {
    const scores = [
      formData.conflictOfContentScore,
      formData.characterizationScore,
      formData.storyProgressionScore,
      formData.whatsNextElementScore,
      formData.overallOnelinerGradeScore,
    ];
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    setAverageScore(Math.round(avg * 10) / 10);
  }, [
    formData.conflictOfContentScore,
    formData.characterizationScore,
    formData.storyProgressionScore,
    formData.whatsNextElementScore,
    formData.overallOnelinerGradeScore,
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    setFormData((prev) => ({ ...prev, [id]: checked }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate decision field
    if (!formData.decision) {
      toast.error("Please select a decision (Approve, Reject, or Needs Improvement)");
      return;
    }

    // Cannot approve with score < 5.0
    if (formData.decision === "approve" && averageScore < 5.0) {
      toast.error(`Cannot approve with average score below 5.0 (current: ${averageScore.toFixed(1)})`);
      return;
    }

    // Warn if reject with high score
    if (formData.decision === "reject" && averageScore >= 7.0) {
      const confirmReject = window.confirm(
        `Score is ${averageScore.toFixed(1)}/10 but you selected Reject. Are you sure you want to continue?`
      );
      if (!confirmReject) return;
    }

    // Validate decision notes for reject or needs_improvement
    if ((formData.decision === "reject" || formData.decision === "needs_improvement") &&
      (!formData.decisionNotes || formData.decisionNotes.trim().length === 0)) {
      toast.error(
        formData.decision === "reject"
          ? "Please provide justification for your rejection"
          : "Please explain what improvements are needed"
      );
      return;
    }

    // Validate delay reason is provided when evaluation is late
    if (isEvaluationLate && (!formData.delayReason || formData.delayReason.trim().length === 0)) {
      toast.error("Please provide a reason for the late evaluation");
      return;
    }

    setIsLoading(true);

    try {
      const noOfTracks = formData.noOfTracks ? parseInt(formData.noOfTracks) : undefined;

      if (existingEvaluation && isEditing) {
        await updateEvaluationClient({
          id: existingEvaluation.id,
          target_writer: selectedWriter?.name || null,
          per_ep_price_range: formData.perEpPriceRange || null,
          slot: formData.slot || null,
          conflict_of_content_score: formData.conflictOfContentScore,
          characterization_score: formData.characterizationScore,
          story_progression_score: formData.storyProgressionScore,
          whats_next_element_score: formData.whatsNextElementScore,
          overall_oneliner_grade_score: formData.overallOnelinerGradeScore,
          conflict_of_content_comment: formData.conflictOfContentComment || null,
          characterization_comment: formData.characterizationComment || null,
          story_progression_comment: formData.storyProgressionComment || null,
          whats_next_element_comment: formData.whatsNextElementComment || null,
          overall_oneliner_grade_comment: formData.overallOnelinerGradeComment || null,
          themes_of_drama: formData.themesOfDrama,
          corresponding_dramas: formData.correspondingDramas,
          theme_category: formData.themeCategory || null,
          audience_focus: formData.audienceFocus || null,
          no_of_tracks: noOfTracks ?? null,
          closing_remarks: formData.closingRemarks || null,
          first_2_eps_required: formData.first2EpsRequired,
          decision: formData.decision,
          decision_notes: (formData.decision === "reject" || formData.decision === "needs_improvement") ? formData.decisionNotes : null,
          time_spent_minutes: timeSpentMinutes,
          started_at: new Date().toISOString(),
          is_late: isEvaluationLate,
          delay_reason: isEvaluationLate ? formData.delayReason : null,
          feedback_text: feedbackText || null,
          feedback_attachments: feedbackAttachments,
        });
      } else {
        await createEvaluationClient({
          call_report_id: callReport.id,
          evaluator_id: userId,
          cross_team_share_id: crossTeamShareId || undefined,
          revision_id: revisionId || undefined,
          target_writer: selectedWriter?.name || undefined,
          per_ep_price_range: formData.perEpPriceRange || undefined,
          slot: formData.slot || undefined,
          conflict_of_content_score: formData.conflictOfContentScore,
          characterization_score: formData.characterizationScore,
          story_progression_score: formData.storyProgressionScore,
          whats_next_element_score: formData.whatsNextElementScore,
          overall_oneliner_grade_score: formData.overallOnelinerGradeScore,
          conflict_of_content_comment: formData.conflictOfContentComment || undefined,
          characterization_comment: formData.characterizationComment || undefined,
          story_progression_comment: formData.storyProgressionComment || undefined,
          whats_next_element_comment: formData.whatsNextElementComment || undefined,
          overall_oneliner_grade_comment: formData.overallOnelinerGradeComment || undefined,
          themes_of_drama: formData.themesOfDrama,
          corresponding_dramas: formData.correspondingDramas,
          theme_category: formData.themeCategory || undefined,
          audience_focus: formData.audienceFocus || undefined,
          no_of_tracks: noOfTracks,
          closing_remarks: formData.closingRemarks || undefined,
          first_2_eps_required: formData.first2EpsRequired,
          decision: formData.decision,
          decision_notes: (formData.decision === "reject" || formData.decision === "needs_improvement") ? formData.decisionNotes : undefined,
          time_spent_minutes: timeSpentMinutes,
          started_at: new Date().toISOString(),
          is_late: isEvaluationLate,
          delay_reason: isEvaluationLate ? formData.delayReason : undefined,
          feedback_text: feedbackText || undefined,
          feedback_attachments: feedbackAttachments,
        });
      }

      // Sync management decision to story approvals pipeline
      if (isManagementEvaluation) {
        try {
          const approvalDecision = formData.decision === "approve" ? "approved" : "rejected";
          const approvalRes = await fetch("/api/story-approvals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              call_report_id: callReport.id,
              decision: approvalDecision,
              notes: formData.decisionNotes || null,
            }),
          });
          if (!approvalRes.ok) {
            const approvalData = await approvalRes.json();
            console.error("Approval pipeline sync failed:", approvalData.error);
          }
        } catch (approvalError) {
          console.error("Error syncing to approval pipeline:", approvalError);
          // Non-fatal — evaluation was saved successfully
        }
      }

      toast.success("Evaluation submitted successfully!");

      // Delete the draft after successful submission
      try {
        await fetch(`/api/evaluator/forms/draft/${callReport.id}`, {
          method: 'DELETE',
        });
      } catch (draftError) {
        console.error("Error deleting draft:", draftError);
      }

      router.push(crossTeamShareId ? `/${portalPrefix}/cross-team-shares` : `/${portalPrefix}/evaluations-list`);
    } catch (error: any) {
      console.error("Error submitting evaluation:", error);
      toast.error(`Failed to submit evaluation: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const draftData = {
        ...formData,
        feedbackAttachments,
        accumulatedTimeMinutes: timeSpentMinutes,
      };

      const response = await fetch(`/api/evaluator/forms/draft/${callReport.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
      });

      if (response.ok) {
        toast.success("Draft saved successfully!");
      } else {
        const errorData = await response.json();
        toast.error("Failed to save draft: " + (errorData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  const loadDraft = async () => {
    setLoadingDraft(true);
    try {
      const response = await fetch(`/api/evaluator/forms/draft/${callReport.id}`);
      const data = await response.json();

      if (data.draft && data.draft.draft_data) {
        setPendingDraftData(data.draft.draft_data);
        setShowDraftDialog(true);
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleLoadDraft = () => {
    if (pendingDraftData) {
      setFormData({
        conflictOfContentScore: pendingDraftData.conflictOfContentScore ?? pendingDraftData.premiseConflictScore ?? 5,
        characterizationScore: pendingDraftData.characterizationScore ?? pendingDraftData.charactersScore ?? 5,
        storyProgressionScore: pendingDraftData.storyProgressionScore ?? pendingDraftData.storylinePlotScore ?? 5,
        whatsNextElementScore: pendingDraftData.whatsNextElementScore ?? 5,
        overallOnelinerGradeScore: pendingDraftData.overallOnelinerGradeScore ?? pendingDraftData.overallAssessmentScore ?? 5,
        conflictOfContentComment: pendingDraftData.conflictOfContentComment || "",
        characterizationComment: pendingDraftData.characterizationComment || "",
        storyProgressionComment: pendingDraftData.storyProgressionComment || "",
        whatsNextElementComment: pendingDraftData.whatsNextElementComment || "",
        overallOnelinerGradeComment: pendingDraftData.overallOnelinerGradeComment || "",
        themesOfDrama: pendingDraftData.themesOfDrama || [],
        correspondingDramas: pendingDraftData.correspondingDramas || [],
        themeCategory: pendingDraftData.themeCategory || "",
        audienceFocus: pendingDraftData.audienceFocus || "",
        noOfTracks: pendingDraftData.noOfTracks?.toString() || "",
        closingRemarks: pendingDraftData.closingRemarks || "",
        targetWriterId: pendingDraftData.targetWriterId || "",
        perEpPriceRange: pendingDraftData.perEpPriceRange || "",
        slot: pendingDraftData.slot || "",
        first2EpsRequired: pendingDraftData.first2EpsRequired || false,
        decision: "",
        decisionNotes: "",
        delayReason: "",
      });

      setFeedbackAttachments(pendingDraftData.feedbackAttachments || []);
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

  // Load draft on component mount
  useEffect(() => {
    if (propExistingEvaluation) {
      setExistingEvaluation(propExistingEvaluation);
      setFormData((prev) => ({
        ...prev,
        conflictOfContentScore: propExistingEvaluation.conflict_of_content_score ?? propExistingEvaluation.premise_conflict_score ?? 5,
        characterizationScore: propExistingEvaluation.characterization_score ?? propExistingEvaluation.characters_score ?? 5,
        storyProgressionScore: propExistingEvaluation.story_progression_score ?? propExistingEvaluation.storyline_plot_score ?? 5,
        whatsNextElementScore: propExistingEvaluation.whats_next_element_score ?? 5,
        overallOnelinerGradeScore: propExistingEvaluation.overall_oneliner_grade_score ?? propExistingEvaluation.overall_assessment_score ?? 5,
        conflictOfContentComment: propExistingEvaluation.conflict_of_content_comment || "",
        characterizationComment: propExistingEvaluation.characterization_comment || "",
        storyProgressionComment: propExistingEvaluation.story_progression_comment || "",
        whatsNextElementComment: propExistingEvaluation.whats_next_element_comment || "",
        overallOnelinerGradeComment: propExistingEvaluation.overall_oneliner_grade_comment || "",
        themesOfDrama: propExistingEvaluation.themes_of_drama || [],
        correspondingDramas: propExistingEvaluation.corresponding_dramas || [],
        themeCategory: propExistingEvaluation.theme_category || "",
        audienceFocus: propExistingEvaluation.audience_focus || "",
        noOfTracks: propExistingEvaluation.no_of_tracks?.toString() || "",
        closingRemarks: propExistingEvaluation.closing_remarks || "",
        perEpPriceRange: propExistingEvaluation.per_ep_price_range || "",
        slot: propExistingEvaluation.slot || "",
        first2EpsRequired: !!propExistingEvaluation.first_2_eps_required,
        decision: propExistingEvaluation.decision || "",
        decisionNotes: propExistingEvaluation.decision_notes || "",
      }));
      return;
    }

    const fetchExisting = async () => {
      try {
        const evalParams = new URLSearchParams();
        if (revisionId) evalParams.set("revision_id", revisionId);
        const evalQuery = evalParams.toString() ? `?${evalParams}` : "";
        const res = await fetch(`/api/evaluator/forms/by-call-report/${callReport.id}${evalQuery}`);
        if (res.ok) {
          const json = await res.json();
          if (json.evaluation) {
            setExistingEvaluation(json.evaluation);
            setFormData((prev) => ({
              ...prev,
              conflictOfContentScore: json.evaluation.conflict_of_content_score ?? json.evaluation.premise_conflict_score ?? 5,
              characterizationScore: json.evaluation.characterization_score ?? json.evaluation.characters_score ?? 5,
              storyProgressionScore: json.evaluation.story_progression_score ?? json.evaluation.storyline_plot_score ?? 5,
              whatsNextElementScore: json.evaluation.whats_next_element_score ?? 5,
              overallOnelinerGradeScore: json.evaluation.overall_oneliner_grade_score ?? json.evaluation.overall_assessment_score ?? 5,
              conflictOfContentComment: json.evaluation.conflict_of_content_comment || "",
              characterizationComment: json.evaluation.characterization_comment || "",
              storyProgressionComment: json.evaluation.story_progression_comment || "",
              whatsNextElementComment: json.evaluation.whats_next_element_comment || "",
              overallOnelinerGradeComment: json.evaluation.overall_oneliner_grade_comment || "",
              themesOfDrama: json.evaluation.themes_of_drama || [],
              correspondingDramas: json.evaluation.corresponding_dramas || [],
              themeCategory: json.evaluation.theme_category || "",
              audienceFocus: json.evaluation.audience_focus || "",
              noOfTracks: json.evaluation.no_of_tracks?.toString() || "",
              closingRemarks: json.evaluation.closing_remarks || "",
              perEpPriceRange: json.evaluation.per_ep_price_range || "",
              slot: json.evaluation.slot || "",
              first2EpsRequired: !!json.evaluation.first_2_eps_required,
              decision: json.evaluation.decision || "",
              decisionNotes: json.evaluation.decision_notes || "",
            }));
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchExisting();
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propExistingEvaluation]);

  return (
    <form onSubmit={handleSubmit}>
      {/* Header — always interactive, never dimmed */}
      <div className="flex flex-col gap-4 sm:gap-6 mb-8 max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref={`/${portalPrefix}/evaluations-list`} variant="outline" size="sm" className="w-fit" />
          {isReadOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isReadOnly ? "Evaluation Details" : "Evaluate Project"}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm sm:text-base">
              Assessment for &ldquo;{callReport.working_title}&rdquo;
            </p>
            {isManagementEvaluation && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4">
                Management
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Call Report Revisions — always visible, never dimmed */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ContentRevisions
          entityId={callReport.id}
          apiBasePath="/api/call-reports"
          storageBucket="attachments"
          canEdit={false}
          entityType="call-report"
        />
      </div>

      {/* Form body — dimmed + non-interactive when read-only */}
      <div className={isReadOnly ? "pointer-events-none select-none opacity-60" : ""}>
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6">
        {/* Revision evaluation banner */}
        {revisionId && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <FilePenLine className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Evaluating a <span className="font-semibold">specific revision</span> of this one-liner
            </p>
          </div>
        )}

        {/* Cross-team share banner */}
        {crossTeamShareId && crossTeamFromTeamName && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
            <Share2Icon className="h-4 w-4 text-purple-600 shrink-0" />
            <p className="text-sm text-purple-800">
              Evaluation requested by <span className="font-semibold">{crossTeamFromTeamName}</span>
            </p>
          </div>
        )}

        {/* Call Report Information (Read-only) */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold">Writer Engagement Report Information</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Writer Engagement Report ID:</span>
                  <p className="text-sm text-muted-foreground">{callReport.call_report_id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Category:</span>
                  <p className="text-sm text-muted-foreground capitalize">
                    {callReport.category?.replace("_", " ") || "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Project Title:</span>
                <p className="text-sm text-muted-foreground">{callReport.working_title}</p>
              </div>
              <div>
                <span className="text-sm font-medium">
                  {callReport.writers && callReport.writers.length > 1 ? "Writers:" : "Writer:"}
                </span>
                {callReport.writers && callReport.writers.length > 0 ? (
                  <div className="text-sm text-muted-foreground space-y-1">
                    {callReport.writers.map((writer) => (
                      <p key={writer.writer_id}>
                        {writer.writer_name}
                        {writer.writer_email && ` (${writer.writer_email})`}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {callReport.writer_name || "N/A"}
                    {callReport.contact_email && ` (${callReport.contact_email})`}
                  </p>
                )}
              </div>
              <div>
                <span className="text-sm font-medium">Logline:</span>
                <p className="text-sm text-muted-foreground">{callReport.logline}</p>
              </div>
              {callReport.content_type && (
                <div>
                  <span className="text-sm font-medium">Content Type:</span>
                  <p className="text-sm text-muted-foreground">{callReport.content_type}</p>
                </div>
              )}
              {callReport.short_synopsis && (
                <div>
                  <span className="text-sm font-medium">Short Synopsis:</span>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{callReport.short_synopsis}</p>
                </div>
              )}
              {callReport.episodic_synopsis && (
                <div>
                  <span className="text-sm font-medium">Episodic Synopsis:</span>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{callReport.episodic_synopsis}</p>
                </div>
              )}

              {callReport.overall_rating && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <span className="text-sm font-medium">Initial Assessment:</span>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-3xl font-bold text-blue-600">{callReport.overall_rating}/10</span>
                    <div className={`text-sm px-3 py-1 rounded-md border ${callReport.overall_rating >= 9 ? 'text-green-700 bg-green-50 border-green-300' :
                      callReport.overall_rating >= 7 ? 'text-blue-700 bg-blue-50 border-blue-300' :
                        callReport.overall_rating >= 5 ? 'text-amber-700 bg-amber-50 border-amber-300' :
                          'text-red-700 bg-red-50 border-red-300'
                      }`}>
                      {callReport.overall_rating >= 9 ? 'High rating potential' :
                        callReport.overall_rating >= 7 ? 'Rating potential audience appeal' :
                          callReport.overall_rating >= 5 ? 'Need improvement' :
                            'Need major re-writing'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PaperclipIcon className="h-5 w-5" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PaperclipIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(attachment.file_size / 1024 / 1024).toFixed(2)} MB uploaded by {attachment.users?.name || 'Unknown'} on {formatDate(attachment.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/api/attachments/${attachment.id}`} target="_blank" rel="noopener noreferrer">
                        Download
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed One-Liner Analysis */}
        <DetailedOneLinerDisplay detailedOneLiner={detailedOneLiner} />

        {/* Rating Scale Reference */}
        <Card className="p-4 border-2 border-blue-100 bg-blue-50/30">
          <CardHeader className="py-2">
            <CardTitle className="text-base">Rating Scale</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-600 min-w-[50px]">10:</span>
                <span className="text-green-700 font-medium">Outstanding - perfect flow, strong events, emotional impact</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-600 min-w-[50px]">8 - 9:</span>
                <span className="text-emerald-700 font-medium">Excellent - engaging and well-structured, minor issues only</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-600 min-w-[50px]">7:</span>
                <span className="text-blue-700 font-medium">Good - holds attention but needs some improvement</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-600 min-w-[50px]">5 - 6:</span>
                <span className="text-amber-700 font-medium">Average - lacks impact or has pacing/logic issues</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-600 min-w-[50px]">3 - 4:</span>
                <span className="text-orange-700 font-medium">Weak - poor structure, flat events, inconsistent characters</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-600 min-w-[50px]">1 - 2:</span>
                <span className="text-red-700 font-medium">Very Poor - confusing, dull, or disconnected from story</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Evaluation Scores with Comments */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 1: Evaluation Scores</h3>
          <p className="text-sm text-muted-foreground">
            Rate each criterion on a scale of 1-10 and provide comments.
          </p>

          <div className="space-y-4">
            {/* 1. Conflict of Content */}
            <div className="space-y-2">
              <ScoreCard
                label="Conflict of Content"
                description="How compelling and engaging is the core conflict driving the content?"
                score={formData.conflictOfContentScore}
                onChange={(value) => setFormData((prev) => ({ ...prev, conflictOfContentScore: value }))}
                gradeFn={calculateOneLinerGrade}
                gradeColorFn={getOneLinerGradeColorClasses}
              />
              <div className="ml-4">
                <Textarea
                  id="conflictOfContentComment"
                  placeholder="Comments on Conflict of Content (optional)..."
                  rows={2}
                  value={formData.conflictOfContentComment}
                  onChange={handleInputChange}
                  className="text-sm"
                />
              </div>
            </div>

            {/* 2. Characterization */}
            <div className="space-y-2">
              <ScoreCard
                label="Characterization"
                description="How well-developed, relatable, and distinct are the characters?"
                score={formData.characterizationScore}
                onChange={(value) => setFormData((prev) => ({ ...prev, characterizationScore: value }))}
                gradeFn={calculateOneLinerGrade}
                gradeColorFn={getOneLinerGradeColorClasses}
              />
              <div className="ml-4">
                <Textarea
                  id="characterizationComment"
                  placeholder="Comments on Characterization (optional)..."
                  rows={2}
                  value={formData.characterizationComment}
                  onChange={handleInputChange}
                  className="text-sm"
                />
              </div>
            </div>

            {/* 3. Story Progression */}
            <div className="space-y-2">
              <ScoreCard
                label="Story Progression"
                description="How well does the story flow and progress across the narrative?"
                score={formData.storyProgressionScore}
                onChange={(value) => setFormData((prev) => ({ ...prev, storyProgressionScore: value }))}
                gradeFn={calculateOneLinerGrade}
                gradeColorFn={getOneLinerGradeColorClasses}
              />
              <div className="ml-4">
                <Textarea
                  id="storyProgressionComment"
                  placeholder="Comments on Story Progression (optional)..."
                  rows={2}
                  value={formData.storyProgressionComment}
                  onChange={handleInputChange}
                  className="text-sm"
                />
              </div>
            </div>

            {/* 4. What Next Element */}
            <div className="space-y-2">
              <ScoreCard
                label="What Next Element"
                description="How effectively does the story create curiosity about what happens next?"
                score={formData.whatsNextElementScore}
                onChange={(value) => setFormData((prev) => ({ ...prev, whatsNextElementScore: value }))}
                gradeFn={calculateOneLinerGrade}
                gradeColorFn={getOneLinerGradeColorClasses}
              />
              <div className="ml-4">
                <Textarea
                  id="whatsNextElementComment"
                  placeholder="Comments on What Next Element (optional)..."
                  rows={2}
                  value={formData.whatsNextElementComment}
                  onChange={handleInputChange}
                  className="text-sm"
                />
              </div>
            </div>

            {/* 5. Overall Oneliner Grade */}
            <div className="space-y-2">
              <ScoreCard
                label="Overall Oneliner Grade"
                description="What is your overall grade for this oneliner as a complete package?"
                score={formData.overallOnelinerGradeScore}
                onChange={(value) => setFormData((prev) => ({ ...prev, overallOnelinerGradeScore: value }))}
                gradeFn={calculateOneLinerGrade}
                gradeColorFn={getOneLinerGradeColorClasses}
              />
              <div className="ml-4">
                <Textarea
                  id="overallOnelinerGradeComment"
                  placeholder="Comments on Overall Oneliner Grade (optional)..."
                  rows={2}
                  value={formData.overallOnelinerGradeComment}
                  onChange={handleInputChange}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Overall Assessment */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 2: Overall Assessment</h3>
          <CallReportOverallAssessment
            average={averageScore}
            gradeFn={calculateOneLinerGrade}
            gradeColorFn={getOneLinerGradeColorClasses}
            ratingScaleItems={oneLinerRatingScaleItems}
          />

          {/* First 2 Episodes Required Checkbox */}
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="first2EpsRequired"
                checked={formData.first2EpsRequired}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-[#224794] focus:ring-[#224794] border-gray-300 rounded"
              />
              <Label
                htmlFor="first2EpsRequired"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                First 2 episodes required
              </Label>
            </div>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Check this if the first 2 episodes are required by the writer to finalize
            </p>
          </Card>
        </div>

        {/* Section 3: Descriptive Evaluation */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 3: Descriptive Evaluation</h3>
          <Card className="p-4 space-y-5">
            {/* Themes of Drama */}
            <div className="space-y-2">
              <Label className="font-semibold">Themes of Drama</Label>
              <p className="text-xs text-muted-foreground">Add themes that describe this drama</p>
              <TagInput
                tags={formData.themesOfDrama}
                onChange={(tags) => setFormData((prev) => ({ ...prev, themesOfDrama: tags }))}
                placeholder="e.g., Family, Revenge, Love triangle..."
              />
            </div>

            {/* Corresponding Previously Aired Dramas */}
            <div className="space-y-2">
              <Label className="font-semibold">Corresponding Previously Aired Dramas</Label>
              <p className="text-xs text-muted-foreground">Add names of similar previously aired dramas</p>
              <TagInput
                tags={formData.correspondingDramas}
                onChange={(tags) => setFormData((prev) => ({ ...prev, correspondingDramas: tags }))}
                placeholder="e.g., Humsafar, Zindagi Gulzar Hai..."
              />
            </div>

            {/* Category of Theme/Subject */}
            <div className="space-y-2">
              <Label className="font-semibold">Category of Theme/Subject</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { value: "commercial", label: "Commercial" },
                  { value: "non_commercial", label: "Non Commercial" },
                  { value: "commercial_edge", label: "Commercial Edge" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all flex-1 ${
                      formData.themeCategory === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="themeCategory"
                      value={option.value}
                      checked={formData.themeCategory === option.value}
                      onChange={(e) => setFormData((prev) => ({ ...prev, themeCategory: e.target.value as any }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Audience Focus */}
            <div className="space-y-2">
              <Label className="font-semibold">Audience Focus</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { value: "male_centric", label: "Male Centric" },
                  { value: "female_centric", label: "Female Centric" },
                  { value: "both", label: "Both" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all flex-1 ${
                      formData.audienceFocus === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="audienceFocus"
                      value={option.value}
                      checked={formData.audienceFocus === option.value}
                      onChange={(e) => setFormData((prev) => ({ ...prev, audienceFocus: e.target.value as any }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* No. of Tracks Mentioned */}
            <div className="space-y-2">
              <Label htmlFor="noOfTracks" className="font-semibold">No. of Tracks Mentioned</Label>
              <Input
                id="noOfTracks"
                type="number"
                min="0"
                value={formData.noOfTracks}
                onChange={handleInputChange}
                placeholder="Enter number of tracks"
                className="w-full sm:w-48"
              />
            </div>

            {/* Closing Remarks */}
            <div className="space-y-2">
              <Label htmlFor="closingRemarks" className="font-semibold">Closing Remarks</Label>
              <Textarea
                id="closingRemarks"
                placeholder="Final thoughts and remarks about this project..."
                rows={4}
                value={formData.closingRemarks}
                onChange={handleInputChange}
              />
            </div>
          </Card>
        </div>

        {/* Section 4: Additional Project Information */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 4: Additional Project Information</h3>
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetWriter">Target Writer</Label>
                <WriterSelect
                  value={formData.targetWriterId}
                  onChange={(writerId, writer) => {
                    setFormData(prev => ({ ...prev, targetWriterId: writerId }));
                    setSelectedWriter(writer);
                  }}
                  disabled={isLoading}
                  placeholder="Select a writer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="perEpPriceRange">Per EP Price Range (Rs)</Label>
                <select
                  id="perEpPriceRange"
                  value={formData.perEpPriceRange}
                  onChange={handleSelectChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select price range</option>
                  <option value="25000-50000">Rs 25,000 - 50,000</option>
                  <option value="50000-75000">Rs 50,000 - 75,000</option>
                  <option value="75000-100000">Rs 75,000 - 100,000</option>
                  <option value="100000-125000">Rs 100,000 - 125,000</option>
                  <option value="125000-150000">Rs 125,000 - 150,000</option>
                  <option value="150000-175000">Rs 150,000 - 175,000</option>
                  <option value="175000-200000">Rs 175,000 - 200,000</option>
                  <option value="200000-225000">Rs 200,000 - 225,000</option>
                  <option value="225000-250000">Rs 225,000 - 250,000</option>
                  <option value="250000-275000">Rs 250,000 - 275,000</option>
                  <option value="275000-300000">Rs 275,000 - 300,000</option>
                  <option value="300000+">Rs 300,000+</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot">Slot</Label>
                <select
                  id="slot"
                  value={formData.slot}
                  onChange={handleSelectChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select slot</option>
                  <option value="6:00 PM">6:00 PM</option>
                  <option value="7:00 PM">7:00 PM</option>
                  <option value="8:00 PM">8:00 PM</option>
                  <option value="9:00 PM">9:00 PM</option>
                  <option value="10:00 PM">10:00 PM</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 5: Final Decision */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 5: Final Decision *</h3>
          <p className="text-sm text-muted-foreground">
            Based on your evaluation, select your recommendation for this project.
          </p>

          <Card className="p-4 border-2 border-slate-200">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Your Decision *</Label>
                <div className="space-y-3">
                  {/* Approve */}
                  <label
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.decision === "approve"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50/30"
                      }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="approve"
                      checked={formData.decision === "approve"}
                      onChange={() => setFormData({ ...formData, decision: "approve", decisionNotes: "" })}
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-green-700">Approve</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Recommend this project for production
                      </p>
                    </div>
                  </label>

                  {/* Reject */}
                  <label
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.decision === "reject"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-red-300 hover:bg-red-50/30"
                      }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="reject"
                      checked={formData.decision === "reject"}
                      onChange={() => setFormData({ ...formData, decision: "reject" })}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-red-700">Reject</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Do not recommend this project
                      </p>
                    </div>
                  </label>

                  {/* Needs Improvement */}
                  <label
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.decision === "needs_improvement"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-gray-200 hover:border-yellow-300 hover:bg-yellow-50/30"
                      }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="needs_improvement"
                      checked={formData.decision === "needs_improvement"}
                      onChange={() => setFormData({ ...formData, decision: "needs_improvement" })}
                      className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-yellow-700">Needs Improvement</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Project has potential but requires revisions
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Decision Notes */}
              {(formData.decision === "reject" || formData.decision === "needs_improvement") && (
                <div className={`space-y-2 p-3 rounded-lg border ${formData.decision === "reject"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
                  }`}>
                  <Label htmlFor="decisionNotes" className={`text-base font-semibold ${formData.decision === "reject" ? "text-red-900" : "text-yellow-900"
                    }`}>
                    {formData.decision === "reject"
                      ? "Justification for Rejection *"
                      : "What Improvements Are Needed? *"}
                  </Label>
                  <Textarea
                    id="decisionNotes"
                    value={formData.decisionNotes}
                    onChange={(e) => setFormData({ ...formData, decisionNotes: e.target.value })}
                    placeholder={
                      formData.decision === "reject"
                        ? "Please explain your reasons for rejecting this project..."
                        : "Please explain what improvements are needed for this project..."
                    }
                    rows={4}
                    className="bg-white"
                    required
                  />
                  <p className={`text-xs ${formData.decision === "reject" ? "text-red-700" : "text-yellow-700"
                    }`}>
                    Providing detailed justification helps improve future projects
                  </p>
                </div>
              )}

              {/* Score vs Decision warnings */}
              {formData.decision === "approve" && averageScore < 5.0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">
                    Warning: You cannot approve a project with an average score below 5.0 (current: {averageScore.toFixed(1)})
                  </p>
                </div>
              )}

              {formData.decision === "reject" && averageScore >= 7.0 && (
                <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Note: You selected Reject but the score is {averageScore.toFixed(1)}/10 (high). Please confirm your decision is correct.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Late Evaluation Warning & Delay Reason */}
        {isEvaluationLate && (
          <Card className="p-4 border-2 border-amber-300 bg-amber-50">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">Late Evaluation</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    This one-liner was logged {daysSinceCreation} days ago (more than 3 days).
                    Please provide a reason for the delay in submitting your evaluation.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delayReason" className="text-amber-900 font-semibold">
                  Reason for Delay *
                </Label>
                <Textarea
                  id="delayReason"
                  placeholder="Please explain why this evaluation is being submitted late..."
                  value={formData.delayReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, delayReason: e.target.value }))}
                  rows={3}
                  className="bg-white border-amber-300 focus:border-amber-500"
                  required
                />
                <p className="text-xs text-amber-700">
                  This information helps track evaluation timelines and improve processes.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Feedback Communication */}
        {!isReadOnly && (
          <Card className="p-4 border border-gray-200">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Feedback Communication <span className="text-sm font-normal text-gray-500">(optional)</span></h3>
                <p className="text-xs text-gray-500 mt-0.5">Attach email or written feedback evidence submitted alongside this evaluation.</p>
              </div>
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
                        <PaperclipIcon className="h-4 w-4 text-gray-400 shrink-0" />
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
                    <><PaperclipIcon className="h-4 w-4" /> Add Files</>
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
            </div>
          </Card>
        )}

        {/* Discussion Thread */}
        <CallReportDiscussion
          callReportId={callReport.id}
          currentUserId={userId}
          currentUserRole={isManagementEvaluation ? "management" : "evaluator"}
          compact={true}
          defaultExpanded={true}
        />

        {/* Form Actions */}
        {!isReadOnly && (
        <div className="sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-3 border-t md:static md:p-0 md:border-0 safe-bottom">
            <>
              {/* Mobile: Stacked buttons */}
              <div className="flex flex-col gap-2 sm:hidden">
                <div className="flex gap-2">
                  <Button asChild variant="outline" type="button" className="flex-1 text-xs px-2">
                    <Link href={`/${portalPrefix}/evaluations-list`}>Cancel</Link>
                  </Button>
                  {!existingEvaluation || isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveDraft}
                      disabled={isLoading || savingDraft || loadingDraft}
                      className="flex-1 border-[#224794] text-[#224794] hover:bg-[#224794] hover:text-white text-xs px-2"
                    >
                      {savingDraft ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          <span className="truncate">Saving...</span>
                        </>
                      ) : (
                        <>
                          <FilePenLine className="mr-1 h-3 w-3" />
                          <span className="truncate">Save Draft</span>
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || savingDraft || loadingDraft}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-sm"
                >
                  {isLoading
                    ? "Saving..."
                    : existingEvaluation && isEditing
                      ? "Update Evaluation"
                      : isManagementEvaluation
                        ? "Submit Management Evaluation"
                        : "Submit Evaluation"
                  }
                </Button>
                {existingEvaluation && !isEditing && !crossTeamShareId && canEdit && (
                  <Button type="button" variant="outline" onClick={() => setIsEditing(true)} className="w-full">
                    Edit
                  </Button>
                )}
              </div>

              {/* Tablet & Desktop: Horizontal layout */}
              <div className="hidden sm:flex justify-between items-center gap-3">
                <div className="flex gap-3">
                  <Button asChild variant="outline" type="button">
                    <Link href={`/${portalPrefix}/evaluations-list`}>Cancel</Link>
                  </Button>
                </div>
                <div className="flex gap-3">
                  {!existingEvaluation || isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveDraft}
                      disabled={isLoading || savingDraft || loadingDraft}
                      className="border-[#224794] text-[#224794] hover:bg-[#224794] hover:text-white"
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
                  ) : null}
                  <Button
                    type="submit"
                    disabled={isLoading || savingDraft || loadingDraft}
                    className="bg-[#10b981] hover:bg-[#059669]"
                  >
                    {isLoading
                      ? "Saving..."
                      : existingEvaluation && isEditing
                        ? "Update Evaluation"
                        : isManagementEvaluation
                          ? "Submit Management Evaluation"
                          : "Submit Evaluation"
                    }
                  </Button>
                  {existingEvaluation && !isEditing && !crossTeamShareId && canEdit && (
                    <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </>
        </div>
        )}

        {/* Draft Found Dialog */}
        <Suspense fallback={null}>
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
        </Suspense>
      </div>
      </div>
    </form>
  );
}
