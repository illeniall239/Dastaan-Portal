"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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

  // Form state for evaluator info
  const [evaluatorName, setEvaluatorName] = useState("");
  const [evaluatorEmail, setEvaluatorEmail] = useState("");
  const [evaluatorOrg, setEvaluatorOrg] = useState("");

  // Form state for episode evaluation
  const [noOfPages, setNoOfPages] = useState<number>(45);
  const [noOfScenes, setNoOfScenes] = useState<number>(22);
  const [conflictScore, setConflictScore] = useState<number>(5);
  const [characterizationScore, setCharacterizationScore] = useState<number>(5);
  const [storyProgressionScore, setStoryProgressionScore] = useState<number>(5);
  const [freezesScore, setFreezesScore] = useState<number>(5);
  const [whatsNextScore, setWhatsNextScore] = useState<number>(5);
  const [comments, setComments] = useState("");

  // Form state for one-liner evaluation
  const [decision, setDecision] = useState<"approved" | "rejected" | "maybe">("maybe");
  const [decisionNotes, setDecisionNotes] = useState("");

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
      const response = await fetch(`/api/public/external/validate/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid or expired link");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let evaluationData: any = {};

      if (linkData.content_type === "episode") {
        // Validate episode evaluation
        if (!noOfPages || !noOfScenes) {
          toast.error("Please fill in number of pages and scenes");
          setSubmitting(false);
          return;
        }

        evaluationData = {
          no_of_pages: noOfPages,
          no_of_scenes: noOfScenes,
          conflict_of_content_score: conflictScore,
          characterization_score: characterizationScore,
          story_progression_score: storyProgressionScore,
          freezes_score: freezesScore,
          whats_next_element_score: whatsNextScore,
          comments: comments || null,
          events: [], // External evaluators don't add events for simplicity
        };
      } else if (linkData.content_type === "one_liner") {
        evaluationData = {
          decision,
          decision_notes: decisionNotes,
        };
      }

      const response = await fetch("/api/public/external/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
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
            You've been invited to provide feedback on this {linkData.content_type === "episode" ? "episode" : "concept"}
          </p>
        </div>

        {/* Content Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{content.story_title || content.episode_title}</CardTitle>
                {content.type === "episode" && (
                  <Badge variant="secondary" className="mt-2">Episode {content.episode_number}</Badge>
                )}
              </div>
              <Badge>{content.genre}</Badge>
            </div>
            {content.writer && (
              <CardDescription>Writer: {content.writer}</CardDescription>
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
                      className="text-primary hover:underline text-sm"
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
          </CardContent>
        </Card>

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit}>
          {/* Evaluator Information */}
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

          {/* Episode Evaluation Form */}
          {linkData.content_type === "episode" && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Script Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pages">Number of Pages *</Label>
                      <Input
                        id="pages"
                        type="number"
                        value={noOfPages}
                        onChange={(e) => setNoOfPages(parseInt(e.target.value) || 0)}
                        min={1}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="scenes">Number of Scenes *</Label>
                      <Input
                        id="scenes"
                        type="number"
                        value={noOfScenes}
                        onChange={(e) => setNoOfScenes(parseInt(e.target.value) || 0)}
                        min={1}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Evaluation Scores</CardTitle>
                  <CardDescription>Rate each criterion from 1 (poor) to 10 (excellent)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { label: "Conflict of Content", value: conflictScore, setter: setConflictScore },
                    { label: "Characterization", value: characterizationScore, setter: setCharacterizationScore },
                    { label: "Story Progression", value: storyProgressionScore, setter: setStoryProgressionScore },
                    { label: "Freezes (Cliffhangers)", value: freezesScore, setter: setFreezesScore },
                    { label: "What's Next Element", value: whatsNextScore, setter: setWhatsNextScore },
                  ].map((criterion) => (
                    <div key={criterion.label}>
                      <div className="flex justify-between mb-2">
                        <Label>{criterion.label}</Label>
                        <Badge variant="outline">{criterion.value}/10</Badge>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={criterion.value}
                        onChange={(e) => criterion.setter(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Additional Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Share your thoughts, suggestions, or any additional feedback..."
                    rows={5}
                  />
                </CardContent>
              </Card>
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
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      {[
                        { value: "approved", label: "Approved", color: "bg-green-100 border-green-300" },
                        { value: "maybe", label: "Maybe", color: "bg-yellow-100 border-yellow-300" },
                        { value: "rejected", label: "Rejected", color: "bg-red-100 border-red-300" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDecision(option.value as any)}
                          className={`p-4 border-2 rounded-lg text-center font-medium transition-all ${
                            decision === option.value
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
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="Explain your decision and provide constructive feedback..."
                      rows={6}
                      required
                    />
                  </div>
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
