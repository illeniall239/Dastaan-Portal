"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Copy,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils/format-date";

interface ExternalLink {
  id: string;
  token: string;
  content_type: string;
  content_id: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  current_submissions: number;
  notes?: string;
}

interface EvaluationData {
  id: string;
  content_type: string;
  evaluation_data: Record<string, unknown>;
  average_score?: number;
  submitted_at?: string;
  conflict_of_content_score?: number;
  characterization_score?: number;
  story_progression_score?: number;
  freezes_score?: number;
  whats_next_element_score?: number;
  overall_assessment_score?: number;
  premise_conflict_score?: number;
  storyline_plot_score?: number;
  episodic_progression_score?: number;
  characters_score?: number;
  summary_analysis?: string;
  slot?: string;
  comments?: string;
}

interface ExternalSubmission {
  id: string;
  evaluator_name: string | null;
  evaluator_email: string | null;
  submitted_at: string;
  evaluation_count: number;
  evaluations: EvaluationData[];
}

interface ExternalEvaluationsManagerProps {
  links: ExternalLink[];
  episodes: unknown[];
  oneLiners: unknown[];
  callReports: unknown[];
  evaluations: ExternalSubmission[];
  contentCountsMap: Record<string, { total: number; call_report: number; episode: number }>;
}

export function ExternalEvaluationsManager({
  links,
  episodes,
  oneLiners,
  callReports,
  evaluations,
  contentCountsMap,
}: ExternalEvaluationsManagerProps) {
  const router = useRouter();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  const getLinkStatus = (link: ExternalLink) => {
    if (!link.is_active) {
      return { label: "Inactive", icon: XCircle, color: "text-gray-500" };
    }

    const now = new Date();
    const expiresAt = new Date(link.expires_at);

    if (expiresAt < now) {
      return { label: "Expired", icon: Clock, color: "text-orange-500" };
    }

    return { label: "Active", icon: CheckCircle, color: "text-green-500" };
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const normalizeEvaluationData = (data: Record<string, unknown>, contentType: string) => {
    if (!data) return { scores: {}, average_score: null };

    if (contentType === "episode") {
      const scores = {
        conflict_of_content_score: (data.conflict_of_content_score as number) ?? 0,
        characterization_score: (data.characterization_score as number) ?? 0,
        story_progression_score: (data.story_progression_score as number) ?? 0,
        freezes_score: (data.freezes_score as number) ?? 0,
        whats_next_element_score: (data.whats_next_element_score as number) ?? 0,
        overall_assessment_score: (data.overall_assessment_score as number) ?? 0,
      };

      const scoreValues = Object.values(scores).filter((v) => typeof v === "number") as number[];
      const average =
        scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : null;

      return {
        scores,
        average_score: average,
        summary_analysis: data.summary_analysis as string | undefined,
      };
    }

    if (contentType === "call_report" || contentType === "one_liner") {
      const scores = {
        premise_conflict_score: (data.premise_conflict_score as number) ?? 0,
        storyline_plot_score: (data.storyline_plot_score as number) ?? 0,
        episodic_progression_score: (data.episodic_progression_score as number) ?? 0,
        characters_score: (data.characters_score as number) ?? 0,
        overall_assessment_score: (data.overall_assessment_score as number) ?? 0,
      };

      const scoreValues = Object.values(scores).filter((v) => typeof v === "number") as number[];
      const average =
        scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : null;

      return {
        scores,
        average_score: average,
        slot: data.slot as string | undefined,
        comments: data.comments as string | undefined,
      };
    }

    return { scores: {}, average_score: null };
  };

  return (
    <div className="space-y-6">


      {/* Tabs for Links and Evaluations */}
      <Tabs defaultValue="links" className="w-full">
        <TabsList>
          <TabsTrigger value="links">
            Generated Links ({links.length})
          </TabsTrigger>
          <TabsTrigger value="evaluations">
            Submissions ({evaluations.length})
          </TabsTrigger>
        </TabsList>

        {/* Links Tab */}
        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle>All Generated Links</CardTitle>
              <CardDescription>View and manage all external evaluation links</CardDescription>
            </CardHeader>
            <CardContent>
              {links.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No links generated yet. Create one to get started!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submissions</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {links.map((link) => {
                        const status = getLinkStatus(link);
                        const StatusIcon = status.icon;

                        return (
                          <TableRow key={link.id}>
                            <TableCell>
                              {contentCountsMap[link.id] ? (
                                // Multi-content link
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline">
                                    One-Liner + {contentCountsMap[link.id].episode} Episode{contentCountsMap[link.id].episode !== 1 ? 's' : ''}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {contentCountsMap[link.id].total} item{contentCountsMap[link.id].total !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              ) : (
                                // Single content link (backwards compatibility)
                                <Badge variant="outline">
                                  {link.content_type === "episode" ? "Episode" : "One-Liner"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {link.notes || link.content_id}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon className={`h-4 w-4 ${status.color}`} />
                                <span className="text-sm">{status.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {link.current_submissions}
                            </TableCell>
                            <TableCell className="text-sm">{formatDateTime(link.created_at)}</TableCell>
                            <TableCell className="text-sm">{formatDateTime(link.expires_at)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(`${baseUrl}/public/evaluate/${link.token}`)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                >
                                  <a
                                    href={`${baseUrl}/public/evaluate/${link.token}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations">
          <Card>
            <CardHeader>
              <CardTitle>External Submissions</CardTitle>
              <CardDescription>View all evaluations from external evaluators</CardDescription>
            </CardHeader>
            <CardContent>
              {evaluations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No submissions yet. Share a link to start receiving feedback!
                </p>
              ) : (
                <div className="space-y-4">
                  {evaluations.map((submission) => (
                    <Card key={submission.id} className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {submission.evaluator_name || "Anonymous"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {submission.evaluator_email || "-"}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              {formatDateTime(submission.submitted_at)}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {submission.evaluation_count} evaluation{submission.evaluation_count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        {submission.evaluations.length > 1 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Includes{" "}
                            {submission.evaluations.filter((e) => e.content_type === "episode").length} episode evaluation
                            {submission.evaluations.filter((e) => e.content_type === "episode").length !== 1 ? "s" : ""} and{" "}
                            {submission.evaluations.filter((e) => e.content_type === "call_report" || e.content_type === "one_liner").length} one-liner evaluation
                            {submission.evaluations.filter((e) => e.content_type === "call_report" || e.content_type === "one_liner").length !== 1 ? "s" : ""}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {submission.evaluations.map((evaluation: EvaluationData, idx: number) => {
                          const normalized = normalizeEvaluationData(
                            evaluation.evaluation_data || {},
                            evaluation.content_type
                          );
                          const scores = normalized.scores || {} as Record<string, number>;
                          const average = normalized.average_score ?? evaluation.average_score;

                          const contentLabel =
                            evaluation.content_type === "episode"
                              ? "Episode"
                              : "One-Liner";

                          return (
                            <div key={evaluation.id || idx} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{contentLabel}</Badge>
                                  {submission.evaluations.length > 1 && (
                                    <Badge variant="outline" className="text-xs">
                                      #{idx + 1}
                                    </Badge>
                                  )}
                                  {evaluation.submitted_at && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatDateTime(evaluation.submitted_at)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold">
                                    {average !== null && average !== undefined ? average.toFixed(1) : "N/A"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Average Score</p>
                                </div>
                              </div>

                              {/* Scores */}
                              {evaluation.content_type === "episode" ? (
                                <div className="grid md:grid-cols-2 gap-2 text-sm">
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Conflict of Content</p>
                                    <p className="font-semibold">{"conflict_of_content_score" in scores ? String(scores.conflict_of_content_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Characterization</p>
                                    <p className="font-semibold">{"characterization_score" in scores ? String(scores.characterization_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Story Progression</p>
                                    <p className="font-semibold">{"story_progression_score" in scores ? String(scores.story_progression_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Freezes</p>
                                    <p className="font-semibold">{"freezes_score" in scores ? String(scores.freezes_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">What's Next Element</p>
                                    <p className="font-semibold">{"whats_next_element_score" in scores ? String(scores.whats_next_element_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Final Impression</p>
                                    <p className="font-semibold">{"overall_assessment_score" in scores ? String(scores.overall_assessment_score) : "N/A"}/10</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid md:grid-cols-2 gap-2 text-sm">
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Premise/Conflict</p>
                                    <p className="font-semibold">{"premise_conflict_score" in scores ? String(scores.premise_conflict_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Storyline/Plot</p>
                                    <p className="font-semibold">{"storyline_plot_score" in scores ? String(scores.storyline_plot_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Episodic Progression</p>
                                    <p className="font-semibold">{"episodic_progression_score" in scores ? String(scores.episodic_progression_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2">
                                    <p className="text-muted-foreground mb-1">Characters</p>
                                    <p className="font-semibold">{"characters_score" in scores ? String(scores.characters_score) : "N/A"}/10</p>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2 md:col-span-2">
                                    <p className="text-muted-foreground mb-1">Final Impression</p>
                                    <p className="font-semibold">{"overall_assessment_score" in scores ? String(scores.overall_assessment_score) : "N/A"}/10</p>
                                  </div>
                                </div>
                              )}

                              {/* Comments / Summary */}
                              {normalized.comments && (
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">Additional Comments</p>
                                  <p className="text-blue-900 whitespace-pre-wrap">{normalized.comments}</p>
                                </div>
                              )}
                              {normalized.summary_analysis && (
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">Summary & Analysis</p>
                                  <p className="text-blue-900 whitespace-pre-wrap">{normalized.summary_analysis}</p>
                                </div>
                              )}
                              {normalized.slot && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>Suggested Slot: {normalized.slot}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
