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
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import type { Negotiation } from "@/lib/negotiations/client";
import type { DeliveryEpisode } from "@/lib/validations/negotiations";

interface NegotiationDetailsProps {
  negotiation: Negotiation;
  basePath: string;
  canEdit?: boolean;
}

export function NegotiationDetails({
  negotiation,
  basePath,
  canEdit = true,
}: NegotiationDetailsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAgreeForm, setShowAgreeForm] = useState(false);
  const [showFailForm, setShowFailForm] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState(
    negotiation.proposed_price?.toString() || ""
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
      const response = await fetch(`/api/negotiations/${negotiation.id}/agree`, {
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
      const response = await fetch(`/api/negotiations/${negotiation.id}/fail`, {
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

  const deliverySchedule = (negotiation.delivery_schedule as DeliveryEpisode[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push(basePath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Negotiations
        </Button>
        {getStatusBadge(negotiation.status)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {(negotiation as any).stories?.title || "Unknown Project"}
          </CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{negotiation.negotiation_id}</span>
            <span>•</span>
            <span>Created {formatDate(negotiation.created_at)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Story ID</p>
                <p>{(negotiation as any).stories?.story_id || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Writer Name</p>
                <p>{negotiation.writer_producer_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Genre</p>
                <p>{negotiation.genre || "N/A"}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Financial Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rate Range</p>
                <p>₨{negotiation.rate_range || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Proposed Price</p>
                <p className="text-lg font-semibold">{formatCurrency(negotiation.proposed_price)}</p>
              </div>
              {negotiation.status === "agreed" && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agreed Price</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(negotiation.agreed_price)}
                  </p>
                </div>
              )}
            </div>

            {negotiation.payment_structure && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Payment Structure</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                  {negotiation.payment_structure}
                </p>
              </div>
            )}

            {negotiation.price_justification && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Price Justification</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                  {negotiation.price_justification}
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Production Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Episodes</p>
                <p>{negotiation.estimated_episodes || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Slot</p>
                <p>{negotiation.suggested_time_slot || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Start Date</p>
                <p>{formatDate(negotiation.project_start_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expected Completion</p>
                <p>{formatDate(negotiation.expected_completion_date)}</p>
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

          {negotiation.status === "agreed" && negotiation.agreed_terms && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Agreed Terms</h3>
              <p className="whitespace-pre-wrap bg-muted p-4 rounded">{negotiation.agreed_terms}</p>
            </div>
          )}

          {negotiation.status === "failed" && negotiation.failed_reason && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-destructive">Failure Reason</h3>
              <p className="whitespace-pre-wrap bg-destructive/10 p-4 rounded border border-destructive/20">
                {negotiation.failed_reason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && negotiation.status === "in_progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showAgreeForm && !showFailForm && (
              <div className="flex gap-4">
                <Button onClick={() => setShowAgreeForm(true)} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Agreed
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowFailForm(true)}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark as Failed
                </Button>
              </div>
            )}

            {showAgreeForm && (
              <div className="space-y-4 border p-4 rounded">
                <h4 className="font-semibold">Mark Negotiation as Agreed</h4>
                <div className="space-y-2">
                  <Label htmlFor="agreedPrice">Agreed Price (PKR) *</Label>
                  <Input
                    id="agreedPrice"
                    type="number"
                    value={agreedPrice}
                    onChange={(e) => setAgreedPrice(e.target.value)}
                    placeholder="Enter final agreed price"
                    min="0"
                    step="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agreedTerms">Agreed Terms *</Label>
                  <Textarea
                    id="agreedTerms"
                    value={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.value)}
                    placeholder="Enter the final agreed terms and conditions"
                    rows={5}
                    maxLength={5000}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleMarkAsAgreed} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Confirm Agreement"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAgreeForm(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {showFailForm && (
              <div className="space-y-4 border border-destructive p-4 rounded">
                <h4 className="font-semibold text-destructive">Mark Negotiation as Failed</h4>
                <div className="space-y-2">
                  <Label htmlFor="failedReason">Reason for Failure *</Label>
                  <Textarea
                    id="failedReason"
                    value={failedReason}
                    onChange={(e) => setFailedReason(e.target.value)}
                    placeholder="Explain why the negotiation failed"
                    rows={4}
                    maxLength={1000}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleMarkAsFailed}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Confirm Failure"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFailForm(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
