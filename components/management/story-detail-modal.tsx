"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  Circle,
  User,
  Mail,
  Building2,
  FileText,
  Calendar,
  MessageSquare,
} from "lucide-react";
import type { PipelineStory, StageStatus } from "@/types";
import { format } from "date-fns";

interface StoryDetailModalProps {
  story: PipelineStory | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StoryDetailModal({ story, isOpen, onClose }: StoryDetailModalProps) {
  if (!story) return null;

  // Get stage status badge
  const getStatusBadge = (status: StageStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-slate-500">
            <Circle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not started";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  // Calculate duration
  const calculateDuration = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

  const stages = [
    {
      number: 1,
      title: "Idea Approved",
      status: story.stage1_status,
      startDate: story.stage1_start_date,
      completionDate: story.stage1_completion_date,
      assigned: story.stage1_assigned,
      assignedEmail: story.stage1_assigned_email,
      assignedDepartment: story.stage1_assigned_department,
    },
    {
      number: 2,
      title: "Writer's Engagement / Story Lock",
      status: story.stage2_status,
      startDate: story.stage2_start_date,
      completionDate: story.stage2_completion_date,
      assigned: story.stage2_assigned,
      assignedEmail: story.stage2_assigned_email,
      assignedDepartment: story.stage2_assigned_department,
    },
    {
      number: 3,
      title: "Delivery Plan & Contract",
      status: story.stage3_status,
      startDate: story.stage3_start_date,
      completionDate: story.stage3_completion_date,
      assigned: story.stage3_assigned,
      assignedEmail: story.stage3_assigned_email,
      assignedDepartment: story.stage3_assigned_department,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl mb-2" dir="rtl" lang="ur">
                {story.title}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span>{story.writer_name}</span>
                <Badge variant="secondary">{story.genre}</Badge>
                <span className="text-xs">Story ID: {story.story_id}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Stage Highlight */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Current Stage</p>
                <p className="text-lg font-bold text-blue-700">
                  Stage {story.current_stage}: {stages[story.current_stage - 1].title}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600">Days in stage</p>
                <p className="text-2xl font-bold text-blue-700">{story.days_in_current_stage}</p>
              </div>
            </div>
          </Card>

          {/* Stage Details */}
          <div>
            <h3 className="text-lg font-bold mb-4">Stage Progress</h3>
            <div className="space-y-4">
              {stages.map((stage) => (
                <Card key={stage.number} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">
                        Stage {stage.number}: {stage.title}
                      </h4>
                    </div>
                    {getStatusBadge(stage.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dates */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Timeline
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Started:</span>
                          <span className="font-medium">{formatDate(stage.startDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Completed:</span>
                          <span className="font-medium">{formatDate(stage.completionDate)}</span>
                        </div>
                        {stage.status === "completed" && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Duration:</span>
                            <span className="font-medium text-green-600">
                              {calculateDuration(stage.startDate, stage.completionDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Person */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Assigned To
                      </p>
                      {stage.assigned ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-slate-400" />
                            <span className="font-medium">{stage.assigned}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600">{stage.assignedEmail}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600">{stage.assignedDepartment}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Not assigned</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="border-t my-4" />

          {/* Documents */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents & Attachments
            </h3>
            {story.documents.length === 0 ? (
              <Card className="p-4">
                <p className="text-sm text-slate-400 text-center">No documents uploaded yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {story.documents.map((doc, index) => (
                  <Card key={index} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">{doc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Badge variant="outline" className="text-xs">
                            {doc.type}
                          </Badge>
                          <span>{formatDate(doc.uploaded_date)}</span>
                        </div>
                      </div>
                      <FileText className="h-4 w-4 text-slate-400" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="border-t my-4" />

          {/* Progress Notes */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Progress Notes
            </h3>
            {story.notes.length === 0 ? (
              <Card className="p-4">
                <p className="text-sm text-slate-400 text-center">No progress notes yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {story.notes.map((note, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-700">
                            {note.author.split(" ").map(n => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{note.author}</p>
                          <p className="text-xs text-slate-500">{formatDate(note.date)}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 ml-10">{note.text}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
