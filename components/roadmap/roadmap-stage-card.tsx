"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FileText,
  ClipboardCheck,
  ThumbsUp,
  Handshake,
  Scale,
  FileSignature,
  Wallet,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Users,
} from "lucide-react";
import type { RoadmapStageData } from "@/types";
import { STAGE_CONFIG } from "@/lib/roadmap/constants";

interface RoadmapStageCardProps {
  stage: RoadmapStageData;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  ClipboardCheck,
  ThumbsUp,
  Handshake,
  Scale,
  FileSignature,
  Wallet,
  CheckCircle2,
};

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "skipped":
      return <Badge variant="outline" className="text-gray-400">Skipped</Badge>;
    default:
      return null;
  }
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function RoadmapStageCard({ stage }: RoadmapStageCardProps) {
  const config = STAGE_CONFIG[stage.stage];
  const Icon = ICONS[config.icon];

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{config.label}</CardTitle>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
          {getStatusBadge(stage.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Started:</span>
            <span className="font-medium">{formatDate(stage.startedAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-medium">{formatDate(stage.completedAt)}</span>
          </div>
        </div>

        {/* Days in stage */}
        {stage.daysInStage !== null && stage.status === "in_progress" && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Time in stage:</span>
            <span className="font-medium">{stage.daysInStage} day(s)</span>
          </div>
        )}

        {/* Actor(s) */}
        {stage.actors && stage.actors.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Participants ({stage.actors.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stage.actors.slice(0, 5).map((actor, idx) => (
                <div
                  key={actor.id + idx}
                  className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(actor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{actor.name}</span>
                </div>
              ))}
              {stage.actors.length > 5 && (
                <div className="flex items-center px-2 py-1 text-sm text-muted-foreground">
                  +{stage.actors.length - 5} more
                </div>
              )}
            </div>
          </div>
        ) : stage.actor ? (
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Handled by:</span>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {getInitials(stage.actor.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{stage.actor.name}</span>
              <Badge variant="outline" className="text-xs">
                {stage.actor.role.replace("_", " ")}
              </Badge>
            </div>
          </div>
        ) : null}

        {/* Outcome */}
        {stage.outcome && (
          <div className="pt-2 border-t">
            <p className="text-sm">
              <span className="text-muted-foreground">Outcome: </span>
              <span className="font-medium">{stage.outcome}</span>
            </p>
            {stage.outcomeDetails?.averageScore && (
              <p className="text-sm mt-1">
                <span className="text-muted-foreground">Average Score: </span>
                <span className="font-medium">{stage.outcomeDetails.averageScore}/10</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
