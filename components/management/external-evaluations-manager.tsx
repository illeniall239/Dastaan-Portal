"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Eye,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ExternalEvaluationDetailModal } from "./external-evaluation-detail-modal";

interface ExternalEvaluationsManagerProps {
  links: any[];
  episodes: any[];
  oneLiners: any[];
  callReports: any[];
  evaluations: any[];
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

  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);



  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLinkStatus = (link: any) => {
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
                            <TableCell className="text-sm">{formatDate(link.created_at)}</TableCell>
                            <TableCell className="text-sm">{formatDate(link.expires_at)}</TableCell>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Evaluator</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>
                            {submission.evaluation_count > 1 ? (
                              // Multi-content submission
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline">
                                  {submission.evaluations.length} Evaluations
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {submission.evaluations.filter((e: any) => e.content_type === 'call_report' || e.content_type === 'one_liner').length > 0 && 'One-Liner + '}
                                  {submission.evaluations.filter((e: any) => e.content_type === 'episode').length} Episode{submission.evaluations.filter((e: any) => e.content_type === 'episode').length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            ) : (
                              // Single evaluation (backwards compatible)
                              <Badge variant="outline">
                                {submission.evaluations[0].content_type === "episode" ? "Episode" : "One-Liner"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{submission.evaluator_name || "Anonymous"}</TableCell>
                          <TableCell>{submission.evaluator_email || "-"}</TableCell>
                          <TableCell className="text-sm">{formatDate(submission.submitted_at)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedEvaluation(submission)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View {submission.evaluation_count > 1 && `(${submission.evaluation_count})`}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* External Evaluation Detail Modal */}
      <ExternalEvaluationDetailModal
        evaluation={selectedEvaluation}
        isOpen={!!selectedEvaluation}
        onClose={() => setSelectedEvaluation(null)}
      />
    </div>
  );
}
