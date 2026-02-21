"use client";

import { format, parseISO } from "date-fns";
import { X, Calendar, Clock, User, Users, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useEffect } from "react";

interface Meeting {
  id: string;
  contact_name?: string;
  meeting_date: string;
  attendees?: string[];
  status?: string;
  title: string;
  location?: string;
  notes?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface MeetingPeekPanelProps {
  meeting: Meeting | null;
  onClose: () => void;
}

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
  draft: "bg-blue-100 text-blue-800",
};

export function MeetingPeekPanel({ meeting, onClose }: MeetingPeekPanelProps) {
  // Lock body scroll when panel is open on mobile
  useEffect(() => {
    // Only apply on mobile (check if viewport is less than md breakpoint)
    const isMobile = window.innerWidth < 768;

    if (meeting && isMobile) {
      // Save original overflow style
      const originalOverflow = document.body.style.overflow;

      // Lock scroll
      document.body.style.overflow = 'hidden';

      // Restore on cleanup
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [meeting]);

  if (!meeting) return null;

  const meetingDate = parseISO(meeting.meeting_date);
  const status = meeting.status || "scheduled";
  // Hide status badge for draft and scheduled (they're the same)
  const showStatusBadge = status !== "draft" && status !== "scheduled";

  return (
    <div className="w-full md:w-96 md:border-l bg-white h-full md:h-full overflow-y-auto flex flex-col fixed bottom-0 left-0 right-0 md:static rounded-t-2xl md:rounded-none shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:shadow-none max-h-[85vh] md:max-h-full z-50">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b bg-muted/10 flex items-start justify-between sticky top-0 z-10 bg-white rounded-t-2xl md:rounded-none">
        <div className="flex-1">
          <h2 className="text-lg font-semibold line-clamp-2">
            {meeting.title}
          </h2>
          {showStatusBadge && (
            <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.scheduled}>
              {status}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="touch-target">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Date & Time */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Date</p>
              <p className="text-sm text-muted-foreground">
                {format(meetingDate, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Time</p>
              <p className="text-sm text-muted-foreground">
                {format(meetingDate, "h:mm a")}
              </p>
            </div>
          </div>

          {meeting.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{meeting.location}</p>
              </div>
            </div>
          )}
        </div>

        {/* Writer Info */}
        <div>
          <div className="flex items-start gap-3 mb-2">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Contact</p>
              <p className="text-sm text-muted-foreground">{meeting.contact_name}</p>
              {meeting.contact_email && (
                <p className="text-xs text-muted-foreground">{meeting.contact_email}</p>
              )}
              {meeting.contact_phone && (
                <p className="text-xs text-muted-foreground">{meeting.contact_phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Attendees */}
        {meeting.attendees && meeting.attendees.length > 0 && (
          <div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Attendees ({meeting.attendees.length})</p>
                <div className="space-y-2">
                  {meeting.attendees.map((attendee: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {attendee.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{attendee}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meeting Agenda */}
        {meeting.notes && (
          <div>
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Meeting Agenda</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {meeting.notes}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 sm:p-4 border-t bg-muted/10 space-y-2 safe-bottom">
        <Button asChild className="w-full touch-target">
          <Link href={`/content-department/calendar/${meeting.id}`}>
            View Full Details
          </Link>
        </Button>
        <Button variant="outline" asChild className="w-full touch-target">
          <Link href="/content-department/log-call-report">
            Log One-Liner
          </Link>
        </Button>
      </div>
    </div>
  );
}
