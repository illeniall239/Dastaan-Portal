"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle, Circle, Plus, Trash2 } from "lucide-react";
import { ScoreCard } from "@/components/episodic-evaluations/score-card";
import { CallReportOverallAssessment } from "@/components/evaluations/call-report-overall-assessment";
import { OverallAssessment } from "@/components/episodic-evaluations/overall-assessment";
import { calculateGrade } from "@/lib/validations/episodic-evaluations";
import { formatDate } from "@/lib/utils/format-date";

interface ExternalEvaluatePageProps {
  params: Promise<{ token: string }>;
}

export default function ExternalEvaluatePage({ params }: ExternalEvaluatePageProps) {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);  // NEW: Multi-content support
  const [currentStep, setCurrentStep] = useState(0);     // NEW: Current step in wizard
  const [evaluations, setEvaluations] = useState<Record<string, any>>({}); // NEW: Store all evaluations by content_id
  const [error, setError] = useState<string | null>(null);

  // Evaluator ID tracking (browser-based)
  const [evaluatorId, setEvaluatorId] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  // Form state for evaluator info
  const [evaluatorName, setEvaluatorName] = useState("");
  const [evaluatorEmail, setEvaluatorEmail] = useState("");
  const [evaluatorOrg, setEvaluatorOrg] = useState("");

  // --- Episode Evaluation State ---
  // Episode Scores
  const [conflictScore, setConflictScore] = useState<number>(5);
  const [characterizationScore, setCharacterizationScore] = useState<number>(5);
  const [storyProgressionScore, setStoryProgressionScore] = useState<number>(5);
  const [freezesScore, setFreezesScore] = useState<number>(5);
  const [whatsNextScore, setWhatsNextScore] = useState<number>(5);
  const [epOverallAssessmentScore, setEpOverallAssessmentScore] = useState<number>(5);
  const [mainEventScore, setMainEventScore] = useState<number>(5);
  const [smallEventScore, setSmallEventScore] = useState<number>(5);
  const [dragnessScore, setDragnessScore] = useState<number>(5);
  // Episode per-criterion comments
  const [conflictComment, setConflictComment] = useState("");
  const [characterizationComment, setCharacterizationComment] = useState("");
  const [storyProgressionComment, setStoryProgressionComment] = useState("");
  const [mainEventComment, setMainEventComment] = useState("");
  const [smallEventComment, setSmallEventComment] = useState("");
  const [dragnessComment, setDragnessComment] = useState("");
  const [freezesComment, setFreezesComment] = useState("");
  const [whatsNextComment, setWhatsNextComment] = useState("");
  const [overallAssessmentComment, setOverallAssessmentComment] = useState("");

  // --- One-Liner Evaluation State ---
  // One-Liner Scores
  const [premiseConflictScore, setPremiseConflictScore] = useState<number>(5);
  const [storylinePlotScore, setStorylinePlotScore] = useState<number>(5);
  const [episodicProgressionScore, setEpisodicProgressionScore] = useState<number>(5);
  const [charactersScore, setCharactersScore] = useState<number>(5);
  const [crOverallAssessmentScore, setCrOverallAssessmentScore] = useState<number>(5);
  // Call report per-criterion comments
  const [crConflictComment, setCrConflictComment] = useState("");
  const [crCharacterizationComment, setCrCharacterizationComment] = useState("");
  const [crStoryProgressionComment, setCrStoryProgressionComment] = useState("");
  const [crWhatsNextComment, setCrWhatsNextComment] = useState("");
  const [crOverallComment, setCrOverallComment] = useState("");

  // --- One-Liner Evaluation State ---
  const [olComments, setOlComments] = useState("");

  // Utility function: Generate or retrieve evaluator ID from localStorage
  const getOrCreateEvaluatorId = (tokenParam: string): string => {
    const storageKey = `external_eval_${tokenParam}_evaluator_id`;
    let evId = localStorage.getItem(storageKey);

    if (!evId) {
      // Generate new UUID for this evaluator
      evId = crypto.randomUUID();
      localStorage.setItem(storageKey, evId);
    }

    return evId;
  };

  // Save current step's evaluation data
  const saveCurrentEvaluation = () => {
    if (!content || !content.content_id) return;

    const evaluationData: any = {
      content_type: content.type,
      content_id: content.content_id,
    };

    if (content.type === "episode") {
      evaluationData.evaluation_data = {
        conflict_of_content_score: conflictScore,
        conflict_of_content_comment: conflictComment,
        characterization_score: characterizationScore,
        characterization_comment: characterizationComment,
        story_progression_score: storyProgressionScore,
        story_progression_comment: storyProgressionComment,
        main_event_score: mainEventScore,
        main_event_comment: mainEventComment,
        small_event_score: smallEventScore,
        small_event_comment: smallEventComment,
        dragness_score: dragnessScore,
        dragness_comment: dragnessComment,
        freezes_score: freezesScore,
        freezes_comment: freezesComment,
        whats_next_element_score: whatsNextScore,
        whats_next_element_comment: whatsNextComment,
        overall_assessment_score: epOverallAssessmentScore,
        overall_assessment_comment: overallAssessmentComment,
        average_score: parseFloat(episodeAverageScore),
        grade: episodeGrade,
      };
    } else if (content.type === "call_report") {
      evaluationData.evaluation_data = {
        conflict_of_content_score: premiseConflictScore,
        conflict_of_content_comment: crConflictComment,
        characterization_score: storylinePlotScore,
        characterization_comment: crCharacterizationComment,
        story_progression_score: episodicProgressionScore,
        story_progression_comment: crStoryProgressionComment,
        whats_next_element_score: charactersScore,
        whats_next_element_comment: crWhatsNextComment,
        overall_oneliner_grade_score: crOverallAssessmentScore,
        overall_oneliner_grade_comment: crOverallComment,
        average_score: parseFloat(callReportAverageScore),
      };
    } else if (content.type === "one_liner") {
      evaluationData.evaluation_data = {
        comments: olComments,
      };
    }

    setEvaluations(prev => ({
      ...prev,
      [content.content_id]: evaluationData
    }));
  };

  // Load evaluation data for a content item
  const loadEvaluation = (contentItem: any) => {
    if (!contentItem || !contentItem.content_id) return;

    const saved = evaluations[contentItem.content_id];
    if (!saved) return;

    const data = saved.evaluation_data;
    if (!data) return;

    if (contentItem.type === "episode") {
      setConflictScore(data.conflict_of_content_score || 5);
      setConflictComment(data.conflict_of_content_comment || "");
      setCharacterizationScore(data.characterization_score || 5);
      setCharacterizationComment(data.characterization_comment || "");
      setStoryProgressionScore(data.story_progression_score || 5);
      setStoryProgressionComment(data.story_progression_comment || "");
      setMainEventScore(data.main_event_score || 5);
      setMainEventComment(data.main_event_comment || "");
      setSmallEventScore(data.small_event_score || 5);
      setSmallEventComment(data.small_event_comment || "");
      setDragnessScore(data.dragness_score || 5);
      setDragnessComment(data.dragness_comment || "");
      setFreezesScore(data.freezes_score || 5);
      setFreezesComment(data.freezes_comment || "");
      setWhatsNextScore(data.whats_next_element_score || 5);
      setWhatsNextComment(data.whats_next_element_comment || "");
      setEpOverallAssessmentScore(data.overall_assessment_score || 5);
      setOverallAssessmentComment(data.overall_assessment_comment || "");
    } else if (contentItem.type === "call_report") {
      setPremiseConflictScore(data.conflict_of_content_score || 5);
      setCrConflictComment(data.conflict_of_content_comment || "");
      setStorylinePlotScore(data.characterization_score || 5);
      setCrCharacterizationComment(data.characterization_comment || "");
      setEpisodicProgressionScore(data.story_progression_score || 5);
      setCrStoryProgressionComment(data.story_progression_comment || "");
      setCharactersScore(data.whats_next_element_score || 5);
      setCrWhatsNextComment(data.whats_next_element_comment || "");
      setCrOverallAssessmentScore(data.overall_oneliner_grade_score || 5);
      setCrOverallComment(data.overall_oneliner_grade_comment || "");
    } else if (contentItem.type === "one_liner") {
      setOlComments(data.comments || "");
    }
  };

  // Calculate average scores
  const callReportAverageScore = useMemo(() => {
    const scores = [
      premiseConflictScore,
      storylinePlotScore,
      episodicProgressionScore,
      charactersScore,
      crOverallAssessmentScore,
    ];
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return (sum / scores.length).toFixed(2);
  }, [premiseConflictScore, storylinePlotScore, episodicProgressionScore, charactersScore, crOverallAssessmentScore]);

  const episodeAverageScore = useMemo(() => {
    const scores = [
      conflictScore,
      characterizationScore,
      storyProgressionScore,
      mainEventScore,
      smallEventScore,
      dragnessScore,
      freezesScore,
      whatsNextScore,
      epOverallAssessmentScore,
    ];
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return (sum / scores.length).toFixed(2);
  }, [conflictScore, characterizationScore, storyProgressionScore, mainEventScore, smallEventScore, dragnessScore, freezesScore, whatsNextScore, epOverallAssessmentScore]);

  // Calculate grades
  const episodeGrade = useMemo(() => {
    return calculateGrade(parseFloat(episodeAverageScore));
  }, [episodeAverageScore]);

  useEffect(() => {
    params.then((resolvedParams) => {
      setToken(resolvedParams.token);
    });
  }, [params]);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get or create evaluator ID from localStorage
      const evId = getOrCreateEvaluatorId(token);
      setEvaluatorId(evId);

      // Fetch validation with evaluator_id to check for existing submission
      const response = await fetch(`/api/public/external/validate/${token}?evaluator_id=${evId}`);
      const data = await response.json();

      if (!response.ok) {
        // Check if already submitted
        if (data.already_submitted) {
          setAlreadySubmitted(true);
          setSubmittedAt(data.submitted_at);
          setLoading(false);
          return;
        }
        setError(data.error || "Invalid or expired link");
        setLoading(false);
        return;
      }

      // Check for already_submitted even on 200 response
      if (data.already_submitted) {
        setAlreadySubmitted(true);
        setSubmittedAt(data.submitted_at);
        setLoading(false);
        return;
      }

      setLinkData(data.link);

      // Check if API returned multiple contents or single content
      if (data.contents && Array.isArray(data.contents)) {
        // Multi-content link
        setContents(data.contents);
        setContent(data.contents[0]); // Set first content as active
        setCurrentStep(0);
      } else if (data.content) {
        // Single content link (backwards compatibility)
        setContent(data.content);
        setContents([data.content]); // Wrap in array for consistency
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Error validating token:", err);
      setError("Failed to validate link");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate evaluator name (required for all content types)
      if (!evaluatorName.trim()) {
        toast.error("Please enter your name");
        setSubmitting(false);
        return;
      }

      // Save current step's evaluation before submitting
      saveCurrentEvaluation();

      // Check if multi-content evaluation
      if (contents.length > 1) {
        // Multi-content submission
        // Ensure all contents have been evaluated
        const allEvaluated = contents.every(c => evaluations[c.content_id]);

        if (!allEvaluated) {
          toast.error("Please complete evaluations for all content items");
          setSubmitting(false);
          return;
        }

        // Submit all evaluations
        const response = await fetch("/api/public/external/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            evaluator_id: evaluatorId,
            evaluator_name: evaluatorName || undefined,
            evaluator_email: evaluatorEmail || undefined,
            evaluator_organization: evaluatorOrg || undefined,
            evaluations: Object.values(evaluations), // Array of all evaluations
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to submit evaluations");
        }

        toast.success("All evaluations submitted successfully!");
        setSubmitted(true);
        return;
      }

      // Single-content submission (backwards compatible)
      let evaluationData: any = {};

      if (linkData.content_type === "episode") {
        evaluationData = {
          conflict_of_content_score: conflictScore,
          conflict_of_content_comment: conflictComment || undefined,
          characterization_score: characterizationScore,
          characterization_comment: characterizationComment || undefined,
          story_progression_score: storyProgressionScore,
          story_progression_comment: storyProgressionComment || undefined,
          main_event_score: mainEventScore,
          main_event_comment: mainEventComment || undefined,
          small_event_score: smallEventScore,
          small_event_comment: smallEventComment || undefined,
          dragness_score: dragnessScore,
          dragness_comment: dragnessComment || undefined,
          freezes_score: freezesScore,
          freezes_comment: freezesComment || undefined,
          whats_next_element_score: whatsNextScore,
          whats_next_element_comment: whatsNextComment || undefined,
          overall_assessment_score: epOverallAssessmentScore,
          overall_assessment_comment: overallAssessmentComment || undefined,
        };
      } else if (linkData.content_type === "one_liner") {
        // One-liner evaluation - just comments
        evaluationData = {
          comments: olComments || null,
        };
      } else if (linkData.content_type === "call_report") {
        evaluationData = {
          conflict_of_content_score: premiseConflictScore,
          conflict_of_content_comment: crConflictComment || undefined,
          characterization_score: storylinePlotScore,
          characterization_comment: crCharacterizationComment || undefined,
          story_progression_score: episodicProgressionScore,
          story_progression_comment: crStoryProgressionComment || undefined,
          whats_next_element_score: charactersScore,
          whats_next_element_comment: crWhatsNextComment || undefined,
          overall_oneliner_grade_score: crOverallAssessmentScore,
          overall_oneliner_grade_comment: crOverallComment || undefined,
        };
      }

      const response = await fetch("/api/public/external/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          evaluator_id: evaluatorId,
          evaluator_name: evaluatorName || undefined,
          evaluator_email: evaluatorEmail || undefined,
          evaluator_organization: evaluatorOrg || undefined,
          evaluation_data: evaluationData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit evaluation");
      }

      toast.success("Evaluation submitted successfully!");
      setSubmitted(true);
    } catch (err: any) {
      console.error("Error submitting evaluation:", err);
      toast.error(err.message || "Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validating link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Evaluation Already Submitted</h2>
            <p className="text-muted-foreground text-center mb-4">
              You submitted your evaluation on {submittedAt ? formatDate(submittedAt) : "a previous date"}.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Thank you for your feedback. Your evaluation has been recorded and cannot be modified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground text-center">
              Your evaluation has been submitted successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">External Evaluation</h1>
          <p className="text-muted-foreground">
            You've been invited to provide feedback on this {content?.type === "episode" ? "episode" : "One-Liner"}
          </p>
        </div>

        {/* Multi-Step Progress Indicator */}
        {contents.length > 1 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Step {currentStep + 1} of {contents.length}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {content.type === "call_report" ? "Evaluating One-Liner" : `Evaluating Episode ${content.episode_number}`}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentStep + 1} / {contents.length} completed
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / contents.length) * 100}%` }}
                  />
                </div>

                {/* Step indicators */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                  {contents.map((item, index) => (
                    <div
                      key={index}
                      className={`flex-shrink-0 min-w-[60px] sm:min-w-[80px] text-center p-2 rounded border ${index === currentStep
                          ? "border-primary bg-primary/5"
                          : index < currentStep
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200"
                        }`}
                    >
                      <div className="text-xs font-medium truncate">
                        {item.type === "call_report" ? "One-Liner" : `Ep ${item.episode_number}`}
                      </div>
                      {index < currentStep && (
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {content.type === "call_report" ? content.working_title : (content.story_title || content.episode_title)}
                </CardTitle>
                {content.type === "episode" && (
                  <Badge variant="secondary" className="mt-2">Episode {content.episode_number}</Badge>
                )}
              </div>
              {content.genre && (
                <Badge>{Array.isArray(content.genre) ? content.genre.join(", ") : content.genre}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {content.type === "episode" && (
              <div className="space-y-2">
                {content.additional_info && (
                  <p className="text-sm">{content.additional_info}</p>
                )}
                {content.attachment_url && (
                  <div>
                    <Label>Script</Label>
                    <a
                      href={content.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm block mt-1"
                    >
                      {content.attachment_name || "View Script"}
                    </a>
                  </div>
                )}
              </div>
            )}
            {content.type === "one_liner" && (
              <div className="space-y-2">
                {content.logline && (
                  <div>
                    <Label>Logline</Label>
                    <p className="text-sm">{content.logline}</p>
                  </div>
                )}
                {content.synopsis && (
                  <div>
                    <Label>Synopsis</Label>
                    <p className="text-sm">{content.synopsis}</p>
                  </div>
                )}
                {content.summary && (
                  <div>
                    <Label>Summary</Label>
                    <p className="text-sm">{content.summary}</p>
                  </div>
                )}
                {content.attachments && content.attachments.length > 0 && (
                  <div>
                    <Label>Attachments</Label>
                    <div className="mt-2 space-y-2">
                      {content.attachments.map((attachment: any) => (
                        <a
                          key={attachment.id}
                          href={`/api/attachments/download?path=${encodeURIComponent(attachment.file_path)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline text-sm"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                          {attachment.file_name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {content.type === "call_report" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {content.content_type && (
                    <Badge variant="outline" className="text-xs">{content.content_type}</Badge>
                  )}
                </div>

                {content.logline && (
                  <div>
                    <Label>Logline</Label>
                    <p className="text-sm">{content.logline}</p>
                  </div>
                )}

                {content.short_synopsis && (
                  <div>
                    <Label>Short Synopsis</Label>
                    <p className="text-sm whitespace-pre-wrap">{content.short_synopsis}</p>
                  </div>
                )}

                {content.episodic_synopsis && (
                  <div>
                    <Label>Episodic Synopsis</Label>
                    <p className="text-sm whitespace-pre-wrap">{content.episodic_synopsis}</p>
                  </div>
                )}

                {content.synopsis && !content.short_synopsis && (
                  <div>
                    <Label>Synopsis</Label>
                    <p className="text-sm whitespace-pre-wrap">{content.synopsis}</p>
                  </div>
                )}

                {content.logline_image_url && (
                  <div>
                    <Label>Reference Image</Label>
                    <img
                      src={content.logline_image_url}
                      alt="Logline reference"
                      className="max-w-md rounded-lg mt-2"
                    />
                  </div>
                )}

                {content.attachments && content.attachments.length > 0 && (
                  <div>
                    <Label>Attachments</Label>
                    <div className="mt-2 space-y-2">
                      {content.attachments.map((attachment: any) => (
                        <a
                          key={attachment.id}
                          href={`/api/attachments/download?path=${encodeURIComponent(attachment.file_path)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline text-sm"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                          {attachment.file_name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit}>
          {/* Evaluator Information - For all evaluations */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>Please provide your details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={evaluatorEmail}
                  onChange={(e) => setEvaluatorEmail(e.target.value)}
                  placeholder="your.email@example.com (optional)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Episode Evaluation Form */}
          {content?.type === "episode" && (
            <>
              {/* Rating Scale Guide */}
              <Card className="p-4 border-2 border-blue-100 bg-blue-50/30 mb-6">
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

              {/* Scores */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Evaluation Scores</CardTitle>
                  <CardDescription>Rate each criterion from 1 (poor) to 10 (excellent)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <ScoreCard
                      label="Conflict of Content"
                      description="How engaging and well-developed is the central conflict?"
                      score={conflictScore}
                      onChange={setConflictScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Conflict of Content (optional)..."
                        rows={2}
                        value={conflictComment}
                        onChange={(e) => setConflictComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Characterization"
                      description="How compelling and relatable are the characters?"
                      score={characterizationScore}
                      onChange={setCharacterizationScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Characterization (optional)..."
                        rows={2}
                        value={characterizationComment}
                        onChange={(e) => setCharacterizationComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Story Progression"
                      description="How effectively does the narrative move the story forward?"
                      score={storyProgressionScore}
                      onChange={setStoryProgressionScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Story Progression (optional)..."
                        rows={2}
                        value={storyProgressionComment}
                        onChange={(e) => setStoryProgressionComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Main Event"
                      description="How impactful and well-executed is the main event of the episode?"
                      score={mainEventScore}
                      onChange={setMainEventScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Main Event (optional)..."
                        rows={2}
                        value={mainEventComment}
                        onChange={(e) => setMainEventComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Small Event"
                      description="How effective are the supporting events in building the narrative?"
                      score={smallEventScore}
                      onChange={setSmallEventScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Small Event (optional)..."
                        rows={2}
                        value={smallEventComment}
                        onChange={(e) => setSmallEventComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Dragness"
                      description="How well does the episode maintain pacing and avoid unnecessary drag?"
                      score={dragnessScore}
                      onChange={setDragnessScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Dragness (optional)..."
                        rows={2}
                        value={dragnessComment}
                        onChange={(e) => setDragnessComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Freeze"
                      description="How effective are the cliffhangers/freeze moments in creating suspense?"
                      score={freezesScore}
                      onChange={setFreezesScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Freeze (optional)..."
                        rows={2}
                        value={freezesComment}
                        onChange={(e) => setFreezesComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="What's Next Element"
                      description="How strong is the anticipation for the next episode?"
                      score={whatsNextScore}
                      onChange={setWhatsNextScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on What's Next Element (optional)..."
                        rows={2}
                        value={whatsNextComment}
                        onChange={(e) => setWhatsNextComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Overall Assessment"
                      description="What is your overall impression of this episode?"
                      score={epOverallAssessmentScore}
                      onChange={setEpOverallAssessmentScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Overall Assessment (optional)..."
                        rows={2}
                        value={overallAssessmentComment}
                        onChange={(e) => setOverallAssessmentComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Assessment Display */}
              <OverallAssessment average={parseFloat(episodeAverageScore)} grade={episodeGrade} />
            </>
          )}

          {/* One-Liner Evaluation Form */}
          {content?.type === "one_liner" && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Additional Comments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Additional Comments</Label>
                    <Textarea
                      value={olComments}
                      onChange={(e) => setOlComments(e.target.value)}
                      placeholder="Provide your feedback and comments..."
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Call Report Evaluation Form */}
          {content?.type === "call_report" && (
            <>
              {/* Rating Scale Guide */}
              <Card className="p-4 border-2 border-blue-100 bg-blue-50/30 mb-6">
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

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Project Evaluation</CardTitle>
                  <CardDescription>Rate each criterion on a scale of 1-10</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <ScoreCard
                      label="Conflict of Content"
                      description="How compelling and engaging is the core conflict driving the content?"
                      score={premiseConflictScore}
                      onChange={setPremiseConflictScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Conflict of Content (optional)..."
                        rows={2}
                        value={crConflictComment}
                        onChange={(e) => setCrConflictComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Characterization"
                      description="How well-developed, relatable, and distinct are the characters?"
                      score={storylinePlotScore}
                      onChange={setStorylinePlotScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Characterization (optional)..."
                        rows={2}
                        value={crCharacterizationComment}
                        onChange={(e) => setCrCharacterizationComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Story Progression"
                      description="How well does the story flow and progress across the narrative?"
                      score={episodicProgressionScore}
                      onChange={setEpisodicProgressionScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Story Progression (optional)..."
                        rows={2}
                        value={crStoryProgressionComment}
                        onChange={(e) => setCrStoryProgressionComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="What's Next Element"
                      description="How effectively does the story create curiosity about what happens next?"
                      score={charactersScore}
                      onChange={setCharactersScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on What's Next Element (optional)..."
                        rows={2}
                        value={crWhatsNextComment}
                        onChange={(e) => setCrWhatsNextComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ScoreCard
                      label="Overall Oneliner Grade"
                      description="What is your overall grade for this oneliner as a complete package?"
                      score={crOverallAssessmentScore}
                      onChange={setCrOverallAssessmentScore}
                      disabled={submitting}
                    />
                    <div className="ml-4">
                      <Textarea
                        placeholder="Comments on Overall Oneliner Grade (optional)..."
                        rows={2}
                        value={crOverallComment}
                        onChange={(e) => setCrOverallComment(e.target.value)}
                        disabled={submitting}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Assessment Display */}
              <CallReportOverallAssessment average={parseFloat(callReportAverageScore)} />
            </>
          )}

          {/* Submit Button */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Your evaluation will be submitted anonymously and reviewed by the management team.
                  {linkData.submissions_remaining && (
                    <> This link has {linkData.submissions_remaining} submissions remaining.</>
                  )}
                </p>
              </div>
              {/* Multi-step navigation or single submit */}
              {contents.length > 1 ? (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (currentStep > 0) {
                        // Save current evaluation before going back
                        saveCurrentEvaluation();

                        const prevStep = currentStep - 1;
                        const prevContent = contents[prevStep];

                        setCurrentStep(prevStep);
                        setContent(prevContent);

                        // Load saved data for previous content
                        loadEvaluation(prevContent);

                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    disabled={currentStep === 0}
                    className="flex-1"
                  >
                    Previous
                  </Button>

                  {currentStep < contents.length - 1 ? (
                    <Button
                      type="button"
                      onClick={() => {
                        // Save current evaluation before moving to next
                        saveCurrentEvaluation();

                        const nextStep = currentStep + 1;
                        const nextContent = contents[nextStep];

                        setCurrentStep(nextStep);
                        setContent(nextContent);

                        // Load saved data for next content if exists
                        loadEvaluation(nextContent);

                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex-1"
                    >
                      Next: {contents[currentStep + 1].type === "call_report" ? "One-Liner" : `Episode ${contents[currentStep + 1].episode_number}`}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit All Evaluations"
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <Button type="submit" disabled={submitting} className="w-full" size="lg">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Evaluation"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
