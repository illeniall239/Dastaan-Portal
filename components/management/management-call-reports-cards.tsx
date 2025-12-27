"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareLinkDialog } from "@/components/management/share-link-dialog";
import { CallReportDetailDialog } from "@/components/management/call-report-detail-dialog";
import { CalendarDays, Users, FileText, Share2, Eye } from "lucide-react";
import { format } from "date-fns";

interface ManagementCallReportsCardsProps {
  callReports: any[];
}

export function ManagementCallReportsCards({ callReports }: ManagementCallReportsCardsProps) {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleShare = (report: any) => {
    setSelectedReport(report);
    setIsShareDialogOpen(true);
  };

  const handleViewDetails = (report: any) => {
    setSelectedReport(report);
    setIsDetailDialogOpen(true);
  };

  if (!callReports || callReports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center text-muted-foreground">
          <FileText className="h-12 w-12" />
          <div>
            <p className="font-medium">No writer engagement reports found</p>
            <p className="text-sm">Writer engagement reports logged by the content team will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {callReports.map((report) => {
          const meetingDate = report.meeting_date ? new Date(report.meeting_date) : null;
          const formattedDate = meetingDate ? format(meetingDate, "PPP") : "Not logged";
          const attendees: string[] = report.meeting_attendees || [];
          const episodesCount = report.episodes ? report.episodes.length : 0;
          const storyTitle = report.stories?.title;
          const genre = report.stories?.genre;
          const writer = report.writer_name || report.stories?.writer_originator_name || "Unknown writer";

          return (
            <Card key={report.id} className="flex flex-col">
              <CardHeader className="space-y-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg leading-tight">{report.working_title}</CardTitle>
                  {storyTitle && <p className="text-sm text-muted-foreground">Story: {storyTitle}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Writer: {writer}</span>
                  {genre && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    </>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {formattedDate}
                  </span>
                </div>
                {episodesCount > 0 && (
                  <div className="text-xs text-blue-600 font-medium">
                    {episodesCount} linked episode{episodesCount !== 1 ? "s" : ""}
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                {report.logline && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Logline</p>
                    <p className="text-sm leading-relaxed">{report.logline}</p>
                  </div>
                )}

                {report.meeting_notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meeting Notes</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">{report.meeting_notes}</p>
                  </div>
                )}

                {attendees.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Attendees
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {attendees.slice(0, 6).map((name, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                      {attendees.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{attendees.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {report.next_steps && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Steps</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{report.next_steps}</p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-4 border-t">
                <div className="flex items-center gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(report);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(report);
                    }}
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {selectedReport && (
        <ShareLinkDialog
          isOpen={isShareDialogOpen}
          onClose={() => {
            setIsShareDialogOpen(false);
            setSelectedReport(null);
          }}
          contentType="call_report"
          contentId={selectedReport.id}
          contentTitle={selectedReport.working_title}
        />
      )}

      <CallReportDetailDialog
        report={selectedReport}
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
      />
    </>
  );
}

