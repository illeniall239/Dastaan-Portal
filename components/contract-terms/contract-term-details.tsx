"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowLeft, PaperclipIcon, Download } from "lucide-react";
import type { ContractTerm } from "@/lib/contract-terms/client";
import Link from "next/link";
import type { DeliveryEpisode } from "@/lib/validations/contract-terms";

interface ContractTermDetailsProps {
  contractTerm: ContractTerm;
  basePath: string;
  canEdit?: boolean;
  attachments?: any[];
}

export function ContractTermDetails({
  contractTerm,
  basePath,
  canEdit = true,
  attachments = [],
}: ContractTermDetailsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAgreeForm, setShowAgreeForm] = useState(false);
  const [showFailForm, setShowFailForm] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState(
    contractTerm.proposed_price?.toString() || ""
  );
  const [agreedTerms, setAgreedTerms] = useState("");
  const [failedReason, setFailedReason] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge variant="default" className="text-lg">In Progress</Badge>;
      case "agreed":
        return <Badge className="bg-green-600 text-lg">Agreed</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-lg">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-lg">{status}</Badge>;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "N/A";
    return `₨${amount.toLocaleString("en-PK")}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleMarkAsAgreed = async () => {
    if (!agreedPrice || parseFloat(agreedPrice) <= 0) {
      toast.error("Please enter a valid agreed price");
      return;
    }
    if (!agreedTerms.trim()) {
      toast.error("Please enter the agreed terms");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/contract-terms/${contractTerm.id}/agree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreed_price: parseFloat(agreedPrice),
          agreed_terms: agreedTerms,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark negotiation as agreed");
      }

      toast.success("Negotiation marked as agreed successfully!");
      router.refresh();
      setShowAgreeForm(false);
    } catch (error) {
      console.error("Error marking negotiation as agreed:", error);
      toast.error("Failed to mark negotiation as agreed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsFailed = async () => {
    if (!failedReason.trim()) {
      toast.error("Please enter the reason for failure");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/contract-terms/${contractTerm.id}/fail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          failed_reason: failedReason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark negotiation as failed");
      }

      toast.success("Negotiation marked as failed");
      router.refresh();
      setShowFailForm(false);
    } catch (error) {
      console.error("Error marking negotiation as failed:", error);
      toast.error("Failed to mark negotiation as failed");
    } finally {
      setIsLoading(false);
    }
  };

  const deliverySchedule = (contractTerm.delivery_schedule as DeliveryEpisode[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push(basePath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Negotiations
        </Button>
        {getStatusBadge(contractTerm.status)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {(contractTerm as any).stories?.title || "Unknown Project"}
          </CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{contractTerm.negotiation_id}</span>
            <span>•</span>
            <span>Created {formatDate(contractTerm.created_at)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Story ID</p>
                <p>{(contractTerm as any).stories?.story_id || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Writer Name</p>
                <p>{contractTerm.writer_producer_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Genre</p>
                <p>{contractTerm.genre || "N/A"}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Financial Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rate Range</p>
                <p>₨{contractTerm.rate_range || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Proposed Price</p>
                <p className="text-lg font-semibold">{formatCurrency(contractTerm.proposed_price)}</p>
              </div>
              {contractTerm.status === "agreed" && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agreed Price</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(contractTerm.agreed_price)}
                  </p>
                </div>
              )}
            </div>

            {contractTerm.payment_structure && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Payment Structure</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                  {contractTerm.payment_structure}
                </p>
              </div>
            )}

            {contractTerm.price_justification && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Price Justification</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                  {contractTerm.price_justification}
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Production Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Episodes</p>
                <p>{contractTerm.estimated_episodes || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Slot</p>
                <p>{contractTerm.suggested_time_slot || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Start Date</p>
                <p>{formatDate(contractTerm.project_start_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expected Completion</p>
                <p>{formatDate(contractTerm.expected_completion_date)}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Episode Delivery Schedule</h3>
            {deliverySchedule.length > 0 ? (
              <div className="space-y-2">
                {deliverySchedule.map((episode, index) => (
                  <div key={index} className="border rounded p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        Episode {episode.episode_number}
                        {episode.episode_title && `: ${episode.episode_title}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Delivery Date</p>
                      <p className="text-sm">{formatDate(episode.delivery_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No delivery schedule defined</p>
            )}
          </div>

          {contractTerm.status === "agreed" && contractTerm.agreed_terms && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Agreed Terms</h3>
              <p className="whitespace-pre-wrap bg-muted p-4 rounded">{contractTerm.agreed_terms}</p>
            </div>
          )}

          {contractTerm.status === "failed" && contractTerm.failed_reason && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-destructive">Failure Reason</h3>
              <p className="whitespace-pre-wrap bg-destructive/10 p-4 rounded border border-destructive/20">
                {contractTerm.failed_reason}
              </p>
            </div>
          )}

          {/* Signed Copy / Attachments */}
          {attachments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PaperclipIcon className="h-5 w-5" />
                Signed Copy / Attachments
              </h3>
              <div className="space-y-2">
                {attachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PaperclipIcon className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-sm text-slate-900">{attachment.file_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                          {attachment.users?.name && ` • ${attachment.users.name}`}
                          {" • "}
                          {new Date(attachment.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      asChild
                    >
                      <Link href={`/api/attachments/${attachment.id}`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
