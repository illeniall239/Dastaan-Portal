"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { toast } from "sonner";
import { createEvaluationClient, updateEvaluationClient } from "@/lib/evaluations/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, PaperclipIcon, Loader2, FilePenLine } from "lucide-react";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import { CallReportOverallAssessment } from "@/components/evaluations/call-report-overall-assessment";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  overall_rating?: number;
}

export function EvaluatorEvaluationForm({
  callReport,
  userId,
  userName,
  attachments = [],
  progress = null,
  writers = [],
}: {
  callReport: CallReport;
  userId: string;
  userName: string;
  attachments?: any[];
  progress?: any;
  writers?: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraftData, setPendingDraftData] = useState<any>(null);
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

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
    targetWriterId: "",
    perEpPriceRange: "",
    slot: "",
    premiseConflictScore: 5,
    storylinePlotScore: 5,
    episodicProgressionScore: 5,
    charactersScore: 5,
    first2EpsRequired: false,
    comments: "",
    decision: "" as "approve" | "reject" | "",
    decisionNotes: "",
  });

  // Calculate average score
  const [averageScore, setAverageScore] = useState(5);

  useEffect(() => {
    const scores = [
      formData.premiseConflictScore,
      formData.storylinePlotScore,
      formData.episodicProgressionScore,
      formData.charactersScore,
    ];
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    setAverageScore(Math.round(avg * 10) / 10);
  }, [
    formData.premiseConflictScore,
    formData.storylinePlotScore,
    formData.episodicProgressionScore,
    formData.charactersScore,
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleWriterChange = (value: string) => {
    setFormData((prev) => ({ ...prev, targetWriterId: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };

  const handleScoreChange = (field: string, value: string) => {
    const numValue = parseInt(value);
    if (numValue >= 1 && numValue <= 10) {
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate decision field
    if (!formData.decision) {
      toast.error("Please select a decision (Approve or Reject)");
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

    // Validate decision notes for reject
    if (formData.decision === "reject" && (!formData.decisionNotes || formData.decisionNotes.trim().length === 0)) {
      toast.error("Please provide justification for your rejection");
      return;
    }

    setIsLoading(true);

    try {
      // Create evaluation
      const selectedWriter = writers.find((w) => w.id === formData.targetWriterId);
      if (existingEvaluation && isEditing) {
        await updateEvaluationClient({
          id: existingEvaluation.id,
          target_writer: selectedWriter?.name || null,
          per_ep_price_range: formData.perEpPriceRange || null,
          slot: formData.slot || null,
          premise_conflict_score: formData.premiseConflictScore,
          storyline_plot_score: formData.storylinePlotScore,
          episodic_progression_score: formData.episodicProgressionScore,
          characters_score: formData.charactersScore,
          first_2_eps_required: formData.first2EpsRequired,
          comments: formData.comments || null,
          decision: formData.decision,
          decision_notes: formData.decision === "reject" ? formData.decisionNotes : null,
        });
      } else {
        await createEvaluationClient({
          call_report_id: callReport.id,
          evaluator_id: userId,
          target_writer: selectedWriter?.name || undefined,
          per_ep_price_range: formData.perEpPriceRange || undefined,
          slot: formData.slot || undefined,
          premise_conflict_score: formData.premiseConflictScore,
          storyline_plot_score: formData.storylinePlotScore,
          episodic_progression_score: formData.episodicProgressionScore,
          characters_score: formData.charactersScore,
          first_2_eps_required: formData.first2EpsRequired,
          comments: formData.comments || undefined,
          decision: formData.decision,
          decision_notes: formData.decision === "reject" ? formData.decisionNotes : undefined,
        });
      }

      toast.success("Evaluation submitted successfully!");

      // Delete the draft after successful submission
      try {
        await fetch(`/api/evaluator/forms/draft/${callReport.id}`, {
          method: 'DELETE',
        });
      } catch (draftError) {
        // Silently fail - draft deletion is not critical
        console.error("Error deleting draft:", draftError);
      }

      // Navigate back
      router.push("/evaluator/evaluations");
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
        targetWriterId: formData.targetWriterId,
        perEpPriceRange: formData.perEpPriceRange,
        slot: formData.slot,
        premiseConflictScore: formData.premiseConflictScore,
        storylinePlotScore: formData.storylinePlotScore,
        episodicProgressionScore: formData.episodicProgressionScore,
        charactersScore: formData.charactersScore,
        first2EpsRequired: formData.first2EpsRequired,
        comments: formData.comments,
      };

      const response = await fetch(`/api/evaluator/forms/draft/${callReport.id}`, {
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
        // Store draft data and show custom dialog
        setPendingDraftData(data.draft.draft_data);
        setShowDraftDialog(true);
      }
    } catch (error) {
      console.error("Error loading draft:", error);
      // Silently fail - loading draft is not critical
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleLoadDraft = () => {
    if (pendingDraftData) {
      setFormData({
        targetWriterId: pendingDraftData.targetWriterId || "",
        perEpPriceRange: pendingDraftData.perEpPriceRange || "",
        slot: pendingDraftData.slot || "",
        premiseConflictScore: pendingDraftData.premiseConflictScore || 5,
        storylinePlotScore: pendingDraftData.storylinePlotScore || 5,
        episodicProgressionScore: pendingDraftData.episodicProgressionScore || 5,
        charactersScore: pendingDraftData.charactersScore || 5,
        first2EpsRequired: pendingDraftData.first2EpsRequired || false,
        comments: pendingDraftData.comments || "",
        decision: "",
        decisionNotes: "",
      });
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
    // Fetch existing evaluation for this call report by current user
    const fetchExisting = async () => {
      try {
        const res = await fetch(`/api/evaluator/forms/by-call-report/${callReport.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.evaluation) {
            setExistingEvaluation(json.evaluation);
            // Prefill form values for editing
            setFormData((prev) => ({
              ...prev,
              perEpPriceRange: json.evaluation.per_ep_price_range || "",
              slot: json.evaluation.slot || "",
              premiseConflictScore: json.evaluation.premise_conflict_score || 5,
              storylinePlotScore: json.evaluation.storyline_plot_score || 5,
              episodicProgressionScore: json.evaluation.episodic_progression_score || 5,
              charactersScore: json.evaluation.characters_score || 5,
              first2EpsRequired: !!json.evaluation.first_2_eps_required,
              comments: json.evaluation.comments || "",
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
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <div className="py-6 space-y-6 max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/evaluator/evaluations">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to My Evaluations
            </Link>
          </Button>
        </div>

        {/* Call Report Information (Read-only) */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">Writer Engagement Report Information</h2>
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
                <span className="text-sm font-medium">Writer:</span>
                <p className="text-sm text-muted-foreground">
                  {callReport.writer_name} ({callReport.contact_email})
                </p>
              </div>
              <div>
                <span className="text-sm font-medium">Logline:</span>
                <p className="text-sm text-muted-foreground">{callReport.logline}</p>
              </div>
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
                    <div className={`text-sm px-3 py-1 rounded-md border ${
                      callReport.overall_rating >= 9 ? 'text-green-700 bg-green-50 border-green-300' :
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
                          {(attachment.file_size / 1024 / 1024).toFixed(2)} MB uploaded by {attachment.users?.name || 'Unknown'} on {new Date(attachment.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
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

        {/* Rating Scale - Placed below attachments to guide evaluators before scoring */}
        <Card className="p-4 border-2 border-blue-100 bg-blue-50/30">
          <CardHeader className="py-2">
            <CardTitle className="text-base">Rating Scale</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
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
          </CardContent>
        </Card>

        {/* Section 1: Evaluation Scores */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 1: Evaluation Scores</h3>
          <p className="text-sm text-muted-foreground">
            Rate each criterion on a scale of 1-10.
          </p>

          <div className="space-y-4">
            <ScoreCard
              label="Premise / Conflict"
              description="How well is the premise established and conflict developed?"
              score={formData.premiseConflictScore}
              onChange={(value) => setFormData((prev) => ({ ...prev, premiseConflictScore: value }))}
            />

            <ScoreCard
              label="Storyline / Plot"
              description="How well-structured and engaging is the storyline?"
              score={formData.storylinePlotScore}
              onChange={(value) => setFormData((prev) => ({ ...prev, storylinePlotScore: value }))}
            />

            <ScoreCard
              label="Episodic Progression"
              description="How well does the story progress episodically?"
              score={formData.episodicProgressionScore}
              onChange={(value) => setFormData((prev) => ({ ...prev, episodicProgressionScore: value }))}
            />

            <ScoreCard
              label="Characters"
              description="How well-developed and compelling are the characters?"
              score={formData.charactersScore}
              onChange={(value) => setFormData((prev) => ({ ...prev, charactersScore: value }))}
            />

            {/* Dialogues score removed as per requirements */}
          </div>
        </div>

        {/* Section 2: Overall Assessment */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 2: Overall Assessment</h3>
          <CallReportOverallAssessment average={averageScore} />

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

        {/* Section 3: Additional Project Information */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 3: Additional Project Information</h3>
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetWriter">Target Writer</Label>
                <Select onValueChange={handleWriterChange} value={formData.targetWriterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a writer" />
                  </SelectTrigger>
                  <SelectContent>
                    {writers.map((writer) => (
                      <SelectItem key={writer.id} value={writer.id}>
                        {writer.name} ({writer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <option value="50000-100000">Rs 50,000 - 100,000</option>
                  <option value="100000-200000">Rs 100,000 - 200,000</option>
                  <option value="200000-300000">Rs 200,000 - 300,000</option>
                  <option value="300000-500000">Rs 300,000 - 500,000</option>
                  <option value="500000-1000000">Rs 500,000 - 1,000,000</option>
                  <option value="1000000+">Rs 1,000,000+</option>
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

        {/* Section 4: Additional Comments */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Section 4: Additional Comments</h3>
          <Card className="p-4">
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Any additional notes or feedback..."
                rows={4}
                value={formData.comments}
                onChange={handleInputChange}
              />
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
              {/* Decision Radio Buttons */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Your Decision *</Label>
                <div className="space-y-3">
                  {/* Approve Option */}
                  <label
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.decision === "approve"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300 hover:bg-green-50/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="approve"
                      checked={formData.decision === "approve"}
                      onChange={(e) => {
                        setFormData({ ...formData, decision: "approve", decisionNotes: "" });
                      }}
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-green-700">Approve</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Recommend this project for production
                      </p>
                    </div>
                  </label>

                  {/* Reject Option */}
                  <label
                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.decision === "reject"
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 hover:border-red-300 hover:bg-red-50/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="reject"
                      checked={formData.decision === "reject"}
                      onChange={(e) => {
                        setFormData({ ...formData, decision: "reject" });
                      }}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500"
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-red-700">Reject</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Do not recommend this project
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Decision Notes (Required for Reject) */}
              {formData.decision === "reject" && (
                <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <Label htmlFor="decisionNotes" className="text-base font-semibold text-red-900">
                    Justification for Rejection *
                  </Label>
                  <Textarea
                    id="decisionNotes"
                    value={formData.decisionNotes}
                    onChange={(e) => setFormData({ ...formData, decisionNotes: e.target.value })}
                    placeholder="Please explain your reasons for rejecting this project..."
                    rows={4}
                    className="bg-white"
                    required
                  />
                  <p className="text-xs text-red-700">
                    Providing detailed justification helps improve future projects
                  </p>
                </div>
              )}

              {/* Warning for Score vs Decision Mismatch */}
              {formData.decision === "approve" && averageScore < 5.0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">
                    ⚠️ Warning: You cannot approve a project with an average score below 5.0 (current: {averageScore.toFixed(1)})
                  </p>
                </div>
              )}

              {formData.decision === "reject" && averageScore >= 7.0 && (
                <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
                  <p className="text-sm text-blue-800">
                    ℹ️ Note: You selected Reject but the score is {averageScore.toFixed(1)}/10 (high). Please confirm your decision is correct.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Evaluation Progress card removed */}

        {/* Form Actions - sticky on mobile, responsive layout */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-3 border-t md:static md:p-0 md:border-0 safe-bottom">
          {/* Mobile: Stacked buttons */}
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="flex gap-2">
              <Button asChild variant="outline" type="button" className="flex-1 text-xs px-2">
                <Link href="/evaluator/evaluations">Cancel</Link>
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
              {isLoading ? "Saving..." : existingEvaluation && isEditing ? "Save Changes" : "Submit Evaluation"}
            </Button>
            {existingEvaluation && !isEditing && (
              <Button type="button" variant="outline" onClick={() => setIsEditing(true)} className="w-full">
                Edit
              </Button>
            )}
          </div>

          {/* Tablet & Desktop: Horizontal layout */}
          <div className="hidden sm:flex justify-between items-center gap-3">
            <div className="flex gap-3">
              <Button asChild variant="outline" type="button">
                <Link href="/evaluator/evaluations">Cancel</Link>
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
                {isLoading ? "Saving..." : existingEvaluation && isEditing ? "Save Changes" : "Submit Evaluation"}
              </Button>
              {existingEvaluation && !isEditing && (
                <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

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
    </form>
  );
}