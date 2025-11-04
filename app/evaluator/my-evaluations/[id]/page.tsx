import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, UserIcon, FileTextIcon, StarIcon, TrendingUp, TrendingDown, Minus, CheckCircle2, Clock } from "lucide-react";
import { getEvaluationById } from "@/lib/evaluations/server";
import { EvaluationProgressBar } from "@/components/evaluations/evaluation-progress-bar";

// Add Next.js caching - revalidate every 30 seconds
export const revalidate = 300; // 5 minutes for better performance

export default async function EvaluatorEvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Ensure user has evaluator role
  if (user.role !== "evaluator") {
    redirect("/unauthorized");
  }

  // Fetch the evaluation
  let evaluation;
  try {
    evaluation = await getEvaluationById(resolvedParams.id);
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    redirect("/evaluator/my-evaluations");
  }

  if (!evaluation) {
    redirect("/evaluator/evaluations-list?view=completed");
  }

  // Check if the current user is the evaluator who submitted this evaluation
  if (evaluation.evaluator_id !== user.id) {
    redirect("/evaluator/evaluations-list?view=completed");
  }

  const createdDate = new Date(evaluation.created_at);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Get overall evaluation progress from call report
  const internalCompleted = evaluation.call_reports?.completed_evaluations || 0;
  const internalRequired = evaluation.call_reports?.required_evaluations || 5;
  const currentAverage = evaluation.call_reports?.current_average_score;
  const evalStatus = evaluation.call_reports?.evaluation_status;
  const evaluationDeadline = evaluation.call_reports?.evaluation_deadline;
  const finalDecisionMadeAt = evaluation.call_reports?.final_decision_made_at;
  const isComplete = internalCompleted >= internalRequired || evalStatus === 'completed_after_deadline' || !!finalDecisionMadeAt;

  // Calculate deadline status
  const deadlineDate = evaluationDeadline ? new Date(evaluationDeadline) : null;
  const now = new Date();
  const isDeadlinePassed = deadlineDate ? now > deadlineDate : false;
  const daysRemaining = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50";
    if (score >= 6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  // Progress score color helper
  const getProgressScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500 bg-gray-50 border-gray-200";
    if (score >= 7.0) return "text-green-700 bg-green-50 border-green-200";
    if (score >= 5.0) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number | null) => {
    if (score === null) return <Clock className="h-5 w-5" />;
    if (score >= 7.0) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (score >= 5.0) return <Minus className="h-5 w-5 text-yellow-600" />;
    return <TrendingDown className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/evaluator/evaluations-list?view=completed">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {evaluation.call_reports?.working_title || "Evaluation Details"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Evaluation ID: {evaluation.form_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-6 py-3 rounded-lg text-2xl font-bold ${getScoreColor(evaluation.average_score || 0)}`}>
            {evaluation.average_score?.toFixed(1) || "N/A"}/10
          </div>
          {/* Edit button to open evaluate page in edit mode */}
          <Button asChild variant="outline">
            <Link href={`/evaluator/evaluate/${evaluation.call_report_id}?edit=1`}>
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Evaluation Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evaluation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Submitted On</p>
                  <p className="text-sm text-muted-foreground">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Evaluator</p>
                  <p className="text-sm text-muted-foreground">
                    {evaluation.evaluators?.name || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {evaluation.evaluators?.email || ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Call Report</p>
                  <p className="text-sm text-muted-foreground">
                    {evaluation.call_reports?.call_report_id || "N/A"}
                  </p>
                  <Link
                    href={`/evaluator/evaluations-list?view=completed`}
                    className="text-sm text-[#224794] hover:underline"
                  >
                    View My Evaluations
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Evaluation Progress Card */}
          <Card className="border-2 border-blue-200 bg-blue-50/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Overall Evaluation Progress</CardTitle>
                {finalDecisionMadeAt ? (
                  <Badge className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Decided
                  </Badge>
                ) : isComplete ? (
                  <Badge className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                ) : internalCompleted > 0 ? (
                  <Badge variant="secondary">In Progress</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Stats */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{internalCompleted}/{internalRequired}</p>
                  <p className="text-xs text-muted-foreground">Evaluations</p>
                  {/* Deadline info */}
                  {deadlineDate && !finalDecisionMadeAt && (
                    <div className="mt-1">
                      {isDeadlinePassed ? (
                        <p className="text-xs text-red-600 font-medium">Deadline passed</p>
                      ) : daysRemaining !== null && (
                        <p className="text-xs text-orange-600 font-medium">
                          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {currentAverage !== null && currentAverage !== undefined && (
                  <div className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border-2 ${getProgressScoreColor(currentAverage)}`}>
                    {getScoreIcon(currentAverage)}
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {currentAverage.toFixed(1)}
                      </div>
                      <div className="text-xs font-medium">Current Avg</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div>
                <EvaluationProgressBar
                  completed={internalCompleted}
                  total={internalRequired}
                  internalCompleted={internalCompleted}
                  externalCompleted={0}
                  internalRequired={internalRequired}
                  externalRequired={0}
                  showLabels={false}
                />
              </div>

              {/* Status Message */}
              <div className="bg-white rounded-lg p-3 border text-xs">
                {finalDecisionMadeAt ? (
                  <span className="text-green-700 font-medium">
                    ✓ Auto-decision made on {new Date(finalDecisionMadeAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })} with {internalCompleted}/{internalRequired} evaluations.
                  </span>
                ) : evalStatus === 'completed_after_deadline' ? (
                  <span className="text-yellow-700 font-medium">
                    ✓ Proceeded after deadline with {internalCompleted}/{internalRequired} evaluations completed.
                  </span>
                ) : isComplete ? (
                  <span className="text-green-700 font-medium">
                    ✓ All {internalRequired} required evaluations completed. Awaiting decision.
                  </span>
                ) : internalCompleted > 0 ? (
                  <span className="text-blue-700">
                    <span className="font-semibold">{internalRequired - internalCompleted} more</span> evaluation{internalRequired - internalCompleted !== 1 ? "s" : ""} needed{isDeadlinePassed ? " (deadline passed - can proceed with minimum 3)" : ""}.
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Waiting for {internalRequired} evaluators to submit.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Writer</p>
                <p className="text-sm text-muted-foreground">
                  {evaluation.call_reports?.writer_name || "N/A"}
                </p>
              </div>

              {evaluation.target_writer && (
                <div>
                  <p className="text-sm font-medium">Target Writer</p>
                  <p className="text-sm text-muted-foreground">{evaluation.target_writer}</p>
                </div>
              )}

              {evaluation.per_ep_price_range && (
                <div>
                  <p className="text-sm font-medium">Per EP Price Range</p>
                  <p className="text-sm text-muted-foreground">Rs {evaluation.per_ep_price_range.replace('-', ' - ')}</p>
                </div>
              )}

              {evaluation.genre && (
                <div>
                  <p className="text-sm font-medium">Genre</p>
                  <p className="text-sm text-muted-foreground">{evaluation.genre}</p>
                </div>
              )}

              {evaluation.slot && (
                <div>
                  <p className="text-sm font-medium">Slot</p>
                  <p className="text-sm text-muted-foreground">{evaluation.slot}</p>
                </div>
              )}

              {evaluation.big_idea && (
                <div>
                  <p className="text-sm font-medium">Big Idea / Topic</p>
                  <p className="text-sm text-muted-foreground">{evaluation.big_idea}</p>
                </div>
              )}

              {evaluation.theme && (
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">{evaluation.theme}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium">First 2 Episodes Required</p>
                <p className="text-sm text-muted-foreground">
                  {evaluation.first_2_eps_required ? "Yes" : "No"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Scores & Comments */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <StarIcon className="h-4 w-4 text-[#224794]" />
                    <span className="text-sm font-medium">Premise / Conflict</span>
                  </div>
                  <span className="text-lg font-bold text-[#224794]">
                    {evaluation.premise_conflict_score}/10
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <StarIcon className="h-4 w-4 text-[#224794]" />
                    <span className="text-sm font-medium">Storyline / Plot</span>
                  </div>
                  <span className="text-lg font-bold text-[#224794]">
                    {evaluation.storyline_plot_score}/10
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <StarIcon className="h-4 w-4 text-[#224794]" />
                    <span className="text-sm font-medium">Episodic Progression</span>
                  </div>
                  <span className="text-lg font-bold text-[#224794]">
                    {evaluation.episodic_progression_score}/10
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <StarIcon className="h-4 w-4 text-[#224794]" />
                    <span className="text-sm font-medium">Characters</span>
                  </div>
                  <span className="text-lg font-bold text-[#224794]">
                    {evaluation.characters_score}/10
                  </span>
                </div>

                {/* Dialogues score removed */}

                {/* Overall Assessment removed (deprecated) */}
              </div>

              <div className="mt-6 p-4 bg-[#224794] text-white rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Average Score:</span>
                  <span className="text-3xl font-bold">
                    {evaluation.average_score?.toFixed(1) || "N/A"}/10
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decision Card */}
          {evaluation.decision && (
            <Card className={`border-2 ${
              evaluation.decision === 'approve'
                ? 'border-green-500 bg-green-50/50'
                : 'border-red-500 bg-red-50/50'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {evaluation.decision === 'approve' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-700">Decision: Approved</span>
                    </>
                  ) : (
                    <>
                      <FileTextIcon className="h-5 w-5 text-red-600" />
                      <span className="text-red-700">Decision: Rejected</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evaluation.decision === 'reject' && evaluation.decision_notes && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-red-900">Justification for Rejection:</p>
                    <p className="text-sm text-red-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-red-200">
                      {evaluation.decision_notes}
                    </p>
                  </div>
                )}
                {evaluation.decision === 'approve' && (
                  <p className="text-sm text-green-800">
                    This project has been recommended for production.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {evaluation.comments && (
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {evaluation.comments}
                </p>
              </CardContent>
            </Card>
          )}

          {evaluation.call_reports && (
            <Card>
              <CardHeader>
                <CardTitle>Project Synopsis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {evaluation.call_reports.logline && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Logline</h3>
                    <p className="text-sm text-muted-foreground">
                      {evaluation.call_reports.logline}
                    </p>
                  </div>
                )}

                {evaluation.call_reports.usp && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">USP</h3>
                    <p className="text-sm text-muted-foreground">
                      {evaluation.call_reports.usp}
                    </p>
                  </div>
                )}

              
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}