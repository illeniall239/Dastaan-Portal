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
  const [events, setEvents] = useState<{ title: string; description: string }[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  // Episode Scores
  const [conflictScore, setConflictScore] = useState<number>(5);
  const [characterizationScore, setCharacterizationScore] = useState<number>(5);
  const [storyProgressionScore, setStoryProgressionScore] = useState<number>(5);
  const [freezesScore, setFreezesScore] = useState<number>(5);
  const [whatsNextScore, setWhatsNextScore] = useState<number>(5);
  const [epOverallAssessmentScore, setEpOverallAssessmentScore] = useState<number>(5);
  const [summaryAnalysis, setSummaryAnalysis] = useState("");

  // --- Call Report Evaluation State ---
  const [targetWriterId, setTargetWriterId] = useState("");
  const [perEpPriceRange, setPerEpPriceRange] = useState("");
  const [slot, setSlot] = useState("");
  const [first2EpsRequired, setFirst2EpsRequired] = useState(false);
  // Call Report Scores
  const [premiseConflictScore, setPremiseConflictScore] = useState<number>(5);
  const [storylinePlotScore, setStorylinePlotScore] = useState<number>(5);
  const [episodicProgressionScore, setEpisodicProgressionScore] = useState<number>(5);
  const [charactersScore, setCharactersScore] = useState<number>(5);
  const [crOverallAssessmentScore, setCrOverallAssessmentScore] = useState<number>(5);

  const [comments, setComments] = useState("");
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");

  // --- One-Liner Evaluation State ---
  const [olDecision, setOlDecision] = useState<"approved" | "rejected" | null>(null);
  const [olDecisionNotes, setOlDecisionNotes] = useState("");

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
      freezesScore,
      whatsNextScore,
      epOverallAssessmentScore,
    ];
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return (sum / scores.length).toFixed(2);
  }, [conflictScore, characterizationScore, storyProgressionScore, freezesScore, whatsNextScore, epOverallAssessmentScore]);

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
      setContent(data.content);
      setLoading(false);
    } catch (err: any) {
      console.error("Error validating token:", err);
      setError("Failed to validate link");
      setLoading(false);
    }
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) {
      toast.error("Event title is required");
      return;
    }
    setEvents([...events, { title: newEventTitle, description: newEventDescription }]);
    setNewEventTitle("");
    setNewEventDescription("");
  };

  const handleRemoveEvent = (index: number) => {
    const newEvents = [...events];
    newEvents.splice(index, 1);
    setEvents(newEvents);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let evaluationData: any = {};

      if (linkData.content_type === "episode") {
        if (events.length === 0) {
          toast.error("Please add at least one event from the episode");
          setSubmitting(false);
          return;
        }

        evaluationData = {
          events,
          summary_analysis: summaryAnalysis,
          conflict_of_content_score: conflictScore,
          characterization_score: characterizationScore,
          story_progression_score: storyProgressionScore,
          freezes_score: freezesScore,
          whats_next_element_score: whatsNextScore,
          overall_assessment_score: epOverallAssessmentScore,
        };
      } else if (linkData.content_type === "one_liner") {
        // Validate one_liner evaluation
        if (!olDecision) {
          toast.error("Please select a decision (Approve or Reject)");
          setSubmitting(false);
          return;
        }

        evaluationData = {
          decision: olDecision,
          decision_notes: olDecisionNotes,
        };
      } else if (linkData.content_type === "call_report") {
        // Validate call_report evaluation
        if (!perEpPriceRange) {
          toast.error("Please select a price range");
          setSubmitting(false);
          return;
        }
        if (!slot) {
          toast.error("Please select a slot");
          setSubmitting(false);
          return;
        }
        if (!decision) {
          toast.error("Please select a decision");
          setSubmitting(false);
          return;
        }
        if (decision === 'rejected' && !decisionNotes.trim()) {
          toast.error("Please provide justification for rejection");
          setSubmitting(false);
          return;
        }

        evaluationData = {
          target_writer_id: targetWriterId || null, // Optional
          per_ep_price_range: perEpPriceRange,
          slot: slot,
          first_2_eps_required: first2EpsRequired,
          premise_conflict_score: premiseConflictScore,
          storyline_plot_score: storylinePlotScore,
          episodic_progression_score: episodicProgressionScore,
          characters_score: charactersScore,
          overall_assessment_score: crOverallAssessmentScore,
          comments: comments || null,
          decision: decision,
          decision_notes: decisionNotes,
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
              You submitted your evaluation on {submittedAt ? new Date(submittedAt).toLocaleDateString() : "a previous date"}.
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
            You've been invited to provide feedback on this {linkData.content_type === "episode" ? "episode" : linkData.content_type === "call_report" ? "writer engagement report" : "concept"}
          </p>
        </div>

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
            {(content.writer || content.writer_name) && (
              <CardDescription>Writer: {content.writer || content.writer_name}</CardDescription>
            )}
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
              </div>
            )}
            {content.type === "call_report" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {content.call_report_id}
                  </Badge>
                  {content.category && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {content.category.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {content.content_type && (
                    <Badge variant="outline" className="text-xs">{content.content_type}</Badge>
                  )}
                </div>

                {/* Writers List */}
                {content.writers && content.writers.length > 0 && (
                  <div>
                    <Label>Writers</Label>
                    <div className="text-sm text-muted-foreground">
                      {content.writers.map((w: any, i: number) => (
                        <span key={i}>{w.name}{i < content.writers.length - 1 ? ", " : ""}</span>
                      ))}
                    </div>
                  </div>
                )}

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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit}>
          {/* Evaluator Information - Only for one-liner evaluations */}
          {linkData.content_type === "one_liner" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Information (Optional)</CardTitle>
                <CardDescription>Help us understand who is providing this feedback</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">
                    Email {linkData.allowed_emails && linkData.allowed_emails.length > 0 && "*"}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={evaluatorEmail}
                    onChange={(e) => setEvaluatorEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required={linkData.allowed_emails && linkData.allowed_emails.length > 0}
                  />
                </div>
                <div>
                  <Label htmlFor="org">Organization</Label>
                  <Input
                    id="org"
                    value={evaluatorOrg}
                    onChange={(e) => setEvaluatorOrg(e.target.value)}
                    placeholder="Your organization"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Episode Evaluation Form */}
          {linkData.content_type === "episode" && (
            <>
              {/* Events Section */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Events</CardTitle>
                  <CardDescription>Add key events from the episode</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Event Title</Label>
                      <Input
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        placeholder="Brief title of the event"
                      />
                    </div>
                    <Button type="button" onClick={handleAddEvent} variant="secondary">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {events.map((event, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 border rounded bg-slate-50">
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemoveEvent(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4 italic">No events added yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Analysis */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Summary & Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="summary">Your Analysis</Label>
                  <Textarea
                    id="summary"
                    value={summaryAnalysis}
                    onChange={(e) => setSummaryAnalysis(e.target.value)}
                    placeholder="Write your summary and analysis of this episode..."
                    rows={6}
                  />
                </CardContent>
              </Card>

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
                  <ScoreCard
                    label="Conflict of Content"
                    description="Evaluate the central conflict and tension in the episode"
                    score={conflictScore}
                    onChange={setConflictScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="Characterization"
                    description="Assess character development and authenticity"
                    score={characterizationScore}
                    onChange={setCharacterizationScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="Story Progression"
                    description="Rate how well the story moves forward"
                    score={storyProgressionScore}
                    onChange={setStoryProgressionScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="Freezes (Cliffhangers)"
                    description="Evaluate the effectiveness of cliffhangers and hooks"
                    score={freezesScore}
                    onChange={setFreezesScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="What's Next Element"
                    description="Rate the anticipation created for the next episode"
                    score={whatsNextScore}
                    onChange={setWhatsNextScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="Overall Assessment"
                    description="Your overall evaluation of the episode"
                    score={epOverallAssessmentScore}
                    onChange={setEpOverallAssessmentScore}
                    disabled={submitting}
                  />
                </CardContent>
              </Card>

              {/* Overall Assessment Display */}
              <OverallAssessment average={parseFloat(episodeAverageScore)} grade={episodeGrade} />
            </>
          )}

          {/* One-Liner Evaluation Form */}
          {linkData.content_type === "one_liner" && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Your Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Recommendation *</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {[
                        { value: "approved", label: "Approved", color: "bg-green-100 border-green-300" },
                        { value: "rejected", label: "Rejected", color: "bg-red-100 border-red-300" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setOlDecision(option.value as any)}
                          className={`p-4 border-2 rounded-lg text-center font-medium transition-all ${olDecision === option.value
                            ? `${option.color} scale-105`
                            : "bg-white border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes & Feedback *</Label>
                    <Textarea
                      id="notes"
                      value={olDecisionNotes}
                      onChange={(e) => setOlDecisionNotes(e.target.value)}
                      placeholder="Explain your decision and provide constructive feedback..."
                      rows={6}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Call Report Evaluation Form */}
          {linkData.content_type === "call_report" && (
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
                  <ScoreCard
                    label="Premise / Conflict"
                    description="Evaluate the strength of the premise and central conflict"
                    score={premiseConflictScore}
                    onChange={setPremiseConflictScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="Storyline / Plot"
                    description="Assess the coherence and engagement of the plot"
                    score={storylinePlotScore}
                    onChange={setStorylinePlotScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="Episodic Progression"
                    description="Rate the episode-to-episode development and pacing"
                    score={episodicProgressionScore}
                    onChange={setEpisodicProgressionScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="Characters"
                    description="Evaluate character development and depth"
                    score={charactersScore}
                    onChange={setCharactersScore}
                    disabled={submitting}
                  />

                  <ScoreCard
                    label="Overall Assessment"
                    description="Your overall evaluation of the project"
                    score={crOverallAssessmentScore}
                    onChange={setCrOverallAssessmentScore}
                    disabled={submitting}
                  />
                </CardContent>
              </Card>

              {/* Overall Assessment Display */}
              <CallReportOverallAssessment average={parseFloat(callReportAverageScore)} />

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Additional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* First 2 Eps Required */}
                  <div className="flex items-center space-x-2 border p-3 rounded">
                    <input
                      type="checkbox"
                      id="first2Eps"
                      checked={first2EpsRequired}
                      onChange={(e) => setFirst2EpsRequired(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="first2Eps" className="cursor-pointer">First 2 episodes required</Label>
                  </div>

                  {/* Target Writer Input */}
                  <div className="space-y-2">
                    <Label>Target Writer</Label>
                    <Input
                      value={targetWriterId}
                      onChange={(e) => setTargetWriterId(e.target.value)}
                      placeholder="Enter target writer name (optional)"
                    />
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label>Per Ep Price Range (Rs) *</Label>
                    <select
                      value={perEpPriceRange}
                      onChange={(e) => setPerEpPriceRange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
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

                  {/* Slot */}
                  <div className="space-y-2">
                    <Label>Slot *</Label>
                    <select
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select slot</option>
                      <option value="6:00 PM">6:00 PM</option>
                      <option value="7:00 PM">7:00 PM</option>
                      <option value="8:00 PM">8:00 PM</option>
                      <option value="9:00 PM">9:00 PM</option>
                      <option value="10:00 PM">10:00 PM</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Comments</Label>
                    <Textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Your Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Recommendation *</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <Button
                        type="button"
                        variant={decision === "approved" ? "default" : "outline"}
                        onClick={() => setDecision("approved")}
                        className="h-auto py-4"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant={decision === "rejected" ? "destructive" : "outline"}
                        onClick={() => setDecision("rejected")}
                        className="h-auto py-4"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                  {decision === "rejected" && (
                    <div>
                      <Label>Reason for Rejection *</Label>
                      <Textarea
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        className="mt-2"
                        required
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Submit Button */}
          <Card>
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
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
