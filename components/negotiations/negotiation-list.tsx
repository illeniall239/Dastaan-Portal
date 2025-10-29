"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import type { Negotiation } from "@/lib/negotiations/client";

interface NegotiationListProps {
  negotiations: Negotiation[];
  basePath: string; // e.g., "/evaluator/negotiations" or "/content-department/negotiations"
}

export function NegotiationList({ negotiations, basePath }: NegotiationListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "agreed":
        return <Badge className="bg-green-600">Agreed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "N/A";
    return `₨${amount.toLocaleString("en-PK")}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PK");
  };

  if (negotiations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Negotiations Found</h3>
          <p className="text-muted-foreground text-center mb-4">
            Get started by creating your first negotiation
          </p>
          <Button asChild>
            <Link href={`${basePath}/new`}>Create Negotiation</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {negotiations.map((negotiation) => (
        <Card key={negotiation.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {(negotiation as any).stories?.title || "Unknown Project"}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{negotiation.negotiation_id}</span>
                  <span>•</span>
                  <span>{negotiation.writer_producer_name}</span>
                </div>
              </div>
              {getStatusBadge(negotiation.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Genre</p>
                <p className="text-sm">{negotiation.genre || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rate Range</p>
                <p className="text-sm">₨{negotiation.rate_range || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {negotiation.status === "agreed" ? "Agreed Price" : "Proposed Price"}
                </p>
                <p className="text-sm font-semibold">
                  {negotiation.status === "agreed"
                    ? formatCurrency(negotiation.agreed_price)
                    : formatCurrency(negotiation.proposed_price)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Episodes</p>
                <p className="text-sm">{negotiation.estimated_episodes || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Slot</p>
                <p className="text-sm">{negotiation.suggested_time_slot || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                <p className="text-sm">{formatDate(negotiation.project_start_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(negotiation.created_at)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`${basePath}/${negotiation.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
