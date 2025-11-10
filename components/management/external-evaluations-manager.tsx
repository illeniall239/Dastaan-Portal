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

interface ExternalEvaluationsManagerProps {
  links: any[];
  episodes: any[];
  oneLiners: any[];
  evaluations: any[];
}

export function ExternalEvaluationsManager({
  links,
  episodes,
  oneLiners,
  evaluations,
}: ExternalEvaluationsManagerProps) {
  const router = useRouter();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [contentType, setContentType] = useState<"episode" | "one_liner">("episode");
  const [selectedContentId, setSelectedContentId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [maxSubmissions, setMaxSubmissions] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    if (!selectedContentId) {
      toast.error("Please select content to evaluate");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/management/external/generate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          content_id: selectedContentId,
          expires_in_days: expiresInDays,
          max_submissions: maxSubmissions,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate link");
      }

      toast.success("Shareable link generated successfully!");
      setGeneratedLink(data.link.url);

      // Reset form
      setSelectedContentId("");
      setNotes("");

      // Refresh page data
      router.refresh();
    } catch (error: any) {
      console.error("Error generating link:", error);
      toast.error(error.message || "Failed to generate link");
    } finally {
      setIsSubmitting(false);
    }
  };

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

    if (link.max_submissions !== null && link.current_submissions >= link.max_submissions) {
      return { label: "Full", icon: AlertCircle, color: "text-yellow-500" };
    }

    return { label: "Active", icon: CheckCircle, color: "text-green-500" };
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="space-y-6">
      {/* Generate Link Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Shareable Link</CardTitle>
          <CardDescription>
            Create a shareable evaluation link for external evaluators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Generate External Evaluation Link</DialogTitle>
                <DialogDescription>
                  Create a shareable link for external evaluators to provide feedback
                </DialogDescription>
              </DialogHeader>

              {generatedLink ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900 mb-2">Link Generated Successfully!</h4>
                        <div className="bg-white border rounded p-3 flex items-center justify-between">
                          <code className="text-sm text-gray-700 flex-1 mr-2 break-all">
                            {generatedLink}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedLink)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setGeneratedLink(null);
                      setIsGenerateDialogOpen(false);
                    }}
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Content Type *</Label>
                    <Select
                      value={contentType}
                      onValueChange={(value) => {
                        setContentType(value as "episode" | "one_liner");
                        setSelectedContentId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="episode">Episode</SelectItem>
                        <SelectItem value="one_liner">One-Liner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Select Content *</Label>
                    <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose content to evaluate" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentType === "episode"
                          ? episodes.map((episode) => (
                              <SelectItem key={episode.id} value={episode.id}>
                                Episode {episode.episode_number} - {(episode as any).stories?.title}
                              </SelectItem>
                            ))
                          : oneLiners.map((oneLiner) => (
                              <SelectItem key={oneLiner.id} value={oneLiner.id}>
                                {(oneLiner as any).stories?.title} ({oneLiner.writer_name})
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Expires In (Days)</Label>
                      <Input
                        type="number"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
                        min={1}
                        max={365}
                      />
                    </div>
                    <div>
                      <Label>Max Submissions</Label>
                      <Input
                        type="number"
                        value={maxSubmissions || ""}
                        onChange={(e) =>
                          setMaxSubmissions(e.target.value ? parseInt(e.target.value) : null)
                        }
                        placeholder="Unlimited"
                        min={1}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notes (Internal)</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Why was this link created?"
                    />
                  </div>

                  <Button onClick={handleGenerateLink} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Link"
                    )}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

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
                              <Badge variant="outline">
                                {link.content_type === "episode" ? "Episode" : "One-Liner"}
                              </Badge>
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
                              {link.max_submissions && ` / ${link.max_submissions}`}
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
                        <TableHead>Organization</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations.map((evaluation) => (
                        <TableRow key={evaluation.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {evaluation.content_type === "episode" ? "Episode" : "One-Liner"}
                            </Badge>
                          </TableCell>
                          <TableCell>{evaluation.evaluator_name || "Anonymous"}</TableCell>
                          <TableCell>{evaluation.evaluator_email || "-"}</TableCell>
                          <TableCell>{evaluation.evaluator_organization || "-"}</TableCell>
                          <TableCell className="text-sm">{formatDate(evaluation.submitted_at)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // TODO: Open detail view modal
                                toast.info("Detail view coming soon");
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
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
    </div>
  );
}
