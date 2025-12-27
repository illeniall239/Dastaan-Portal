"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, Phone, MapPin, Target, Lightbulb, Eye, Paperclip } from "lucide-react";
import { format } from "date-fns";

interface CallReportDetailDialogProps {
  report: any | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions
const formatDate = (date: string | null) => {
  if (!date) return "Not set";
  try {
    return format(new Date(date), "PPP");
  } catch {
    return "Invalid date";
  }
};

const formatDateTime = (date: string | null) => {
  if (!date) return "Not set";
  try {
    return format(new Date(date), "PPP 'at' p");
  } catch {
    return "Invalid date";
  }
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'external_producer': 'External Producer',
    'writer_pitch': 'Writer Pitch',
    'inhouse_content': 'In-house Content',
    'content_head_initiative': 'Content Head Initiative',
    'given_by_management': 'Given by Management'
  };
  return labels[category] || category;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    ready_for_evaluation: "bg-blue-100 text-blue-700 border-blue-200",
    in_review: "bg-yellow-100 text-yellow-700 border-yellow-200",
    approved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };
  return colors[status] || "bg-slate-100 text-slate-700 border-slate-200";
};

export function CallReportDetailDialog({ report, isOpen, onClose }: CallReportDetailDialogProps) {
  if (!report) return null;

  const episodesCount = report.episodes ? report.episodes.length : 0;
  const attendees: string[] = report.meeting_attendees || [];
  const genres: string[] = report.genre || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {report.working_title}
          </DialogTitle>
          {report.stories?.title && (
            <DialogDescription className="text-base">
              Story: {report.stories.title}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Writer:</span>
                <p className="font-medium">{report.writer_name || "Not specified"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Logged By:</span>
                <p className="font-medium">{report.creator?.name || "Unknown"}</p>
              </div>
              {genres.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Genre:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {genres.map((genre, idx) => (
                      <Badge key={idx} variant="outline">{genre}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {report.theme && (
                <div>
                  <span className="text-sm text-muted-foreground">Theme:</span>
                  <p className="font-medium">{report.theme}</p>
                </div>
              )}
              {report.status && (
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <div className="mt-1">
                    <Badge className={getStatusColor(report.status)}>
                      {report.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Created:</span>
                <p className="text-sm">{formatDateTime(report.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Content Classification */}
          {(report.category || report.content_type || report.theme || report.target_slot) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Content Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {report.category && (
                  <div>
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <p className="font-medium">{getCategoryLabel(report.category)}</p>
                  </div>
                )}
                {report.content_type && (
                  <div>
                    <span className="text-sm text-muted-foreground">Content Type:</span>
                    <p className="font-medium">{report.content_type}</p>
                  </div>
                )}
                {report.theme && (
                  <div>
                    <span className="text-sm text-muted-foreground">Theme:</span>
                    <p className="font-medium">{report.theme}</p>
                  </div>
                )}
                {report.target_slot && (
                  <div>
                    <span className="text-sm text-muted-foreground">Target Slot:</span>
                    <p className="font-medium">{report.target_slot}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Logline & Synopsis */}
          {(report.logline || report.short_synopsis || report.episodic_synopsis) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Story Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.logline && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Logline:</span>
                    <p className="mt-1 text-sm leading-relaxed">{report.logline}</p>
                  </div>
                )}
                {report.short_synopsis && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Short Synopsis:</span>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{report.short_synopsis}</p>
                  </div>
                )}
                {report.episodic_synopsis && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Episodic Synopsis:</span>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{report.episodic_synopsis}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          {(report.contact_type || report.contact_email || report.contact_phone || report.contact_address) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {report.contact_type && (
                  <div>
                    <span className="text-sm text-muted-foreground">Contact Type:</span>
                    <p className="font-medium capitalize">{report.contact_type.replace(/_/g, " ")}</p>
                  </div>
                )}
                {report.contact_email && (
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${report.contact_email}`} className="text-blue-600 hover:underline">
                        {report.contact_email}
                      </a>
                    </p>
                  </div>
                )}
                {report.contact_phone && (
                  <div>
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {report.contact_phone}
                    </p>
                  </div>
                )}
                {report.contact_address && (
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Address:</span>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {report.contact_address}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Evaluation Status */}
          {(report.overall_rating || report.evaluation_status || report.evaluation_deadline) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Evaluation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {report.overall_rating && (
                    <div>
                      <span className="text-sm text-muted-foreground">Overall Rating:</span>
                      <p className="font-bold text-xl mt-1">{report.overall_rating.toFixed(1)} / 10</p>
                    </div>
                  )}
                  {report.evaluation_deadline && (
                    <div>
                      <span className="text-sm text-muted-foreground">Evaluation Deadline:</span>
                      <p className="font-medium">{formatDate(report.evaluation_deadline)}</p>
                    </div>
                  )}
                </div>
                {(report.required_evaluators && report.completed_evaluations !== undefined) && (
                  <div>
                    <span className="text-sm text-muted-foreground">Evaluation Progress:</span>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{report.completed_evaluations} / {report.required_evaluators} completed</span>
                        <span>{Math.round((report.completed_evaluations / report.required_evaluators) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(report.completed_evaluations / report.required_evaluators) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {report.attachments && report.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments ({report.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.attachments.map((attachment: any) => {
                    const fileSizeKB = attachment.file_size ? (attachment.file_size / 1024).toFixed(1) : "Unknown";
                    const uploadDate = formatDateTime(attachment.uploaded_at);
                    const uploaderName = attachment.uploader?.name || "Unknown";

                    return (
                      <div key={attachment.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                              <span>{fileSizeKB} KB</span>
                              <span>•</span>
                              <span>Uploaded by {uploaderName}</span>
                              <span>•</span>
                              <span>{uploadDate}</span>
                            </div>
                          </div>
                        </div>
                        <a
                          href={`/api/attachments/download?path=${encodeURIComponent(attachment.file_path)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-3 whitespace-nowrap"
                        >
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Episodes */}
          {episodesCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Episodes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <span className="font-medium">{episodesCount}</span> episode{episodesCount !== 1 ? 's' : ''} linked to this report
                </p>
              </CardContent>
            </Card>
          )}

          {/* Private Fields (Content Head Initiative) */}
          {(report.idea_by || report.developed_by || report.management_member_name) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg text-amber-900">Management Information</CardTitle>
                <p className="text-xs text-amber-700">Visible only to management and content team</p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {report.idea_by && (
                  <div>
                    <span className="text-sm text-amber-700">Idea By:</span>
                    <p className="font-medium text-amber-900">{report.idea_by}</p>
                  </div>
                )}
                {report.developed_by && (
                  <div>
                    <span className="text-sm text-amber-700">Developed By:</span>
                    <p className="font-medium text-amber-900">{report.developed_by}</p>
                  </div>
                )}
                {report.management_member_name && (
                  <div>
                    <span className="text-sm text-amber-700">Management Member:</span>
                    <p className="font-medium text-amber-900">{report.management_member_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
