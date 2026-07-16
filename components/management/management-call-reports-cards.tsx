"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareLinkDialog } from "@/components/management/share-link-dialog";
import { CallReportDetailDialog } from "@/components/management/call-report-detail-dialog";
import { CalendarDays, Users, FileText, Share2, Eye, Search } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface ManagementCallReportsCardsProps {
  callReports: any[];
  userRole?: string;
}

export function ManagementCallReportsCards({ callReports, userRole }: ManagementCallReportsCardsProps) {
  const isViewerOnly = userRole === "management_viewer";
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const debouncedSearch = useDebounce(search, 300);

  const filteredReports = useMemo(() => {
    let results = [...callReports];

    // Filter by search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      results = results.filter((r) => {
        const fields = [
          r.working_title,
          r.writer_name,
          r.call_report_id,
          r.logline,
          r.stories?.title,
          r.stories?.writer_originator_name,
          r.stories?.genre,
          r.creator?.team?.name,
        ];
        return fields.some((f) => f && String(f).toLowerCase().includes(q));
      });
    }

    // Sort
    results.sort((a, b) => {
      const dateA = new Date(a.original_submission_date || a.meeting_date || a.created_at).getTime();
      const dateB = new Date(b.original_submission_date || b.meeting_date || b.created_at).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return results;
  }, [callReports, debouncedSearch, sortBy]);

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
      {/* Search & Sort */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, writer, logline..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "oldest")}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {debouncedSearch && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredReports.length} of {callReports.length} reports
          </p>
        )}
      </div>

      {filteredReports.length === 0 && debouncedSearch ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center text-muted-foreground">
            <FileText className="h-12 w-12" />
            <div>
              <p className="font-medium">No results found</p>
              <p className="text-sm">Try a different search term.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => {
          const displayDate = report.original_submission_date || report.meeting_date || null;
          const formattedDate = displayDate ? format(new Date(displayDate), "PPP") : "Not logged";
          const attendees: string[] = report.meeting_attendees || [];
          const episodesCount = report.episodes ? report.episodes.length : 0;
          const storyTitle = report.stories?.title;
          const genre = report.stories?.genre;
          const writer = report.writer_name || report.stories?.writer_originator_name || "Unknown writer";
          const teamName = report.creator?.team?.name;

          return (
            <Card key={report.id} className="flex flex-col">
              <CardHeader className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg leading-tight">{report.working_title}</CardTitle>
                    {teamName && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                        {teamName}
                      </Badge>
                    )}
                  </div>
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
                {!isViewerOnly && report.logline && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Logline</p>
                    <p className="text-sm leading-relaxed">{report.logline}</p>
                  </div>
                )}

                {!isViewerOnly && report.meeting_notes && (
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

                {!isViewerOnly && report.next_steps && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Steps</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{report.next_steps}</p>
                  </div>
                )}
              </CardContent>

              {!isViewerOnly && (
                <CardFooter className="pt-4 border-t">
                  <div className="flex items-center gap-2 w-full flex-wrap">
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
              )}
            </Card>
          );
        })}
      </div>
      )}

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

