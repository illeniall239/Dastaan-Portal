import React, { useMemo } from 'react';
import { format, isToday, isTomorrow, isYesterday, parseISO, startOfDay, isSameDay } from 'date-fns';
import { Calendar, Clock, User, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Meeting {
  id: string;
  writer_name: string;
  organizer_name?: string;
  meeting_date: string;
  meeting_attendees?: string[];
  status?: string;
  working_title: string;
  logline?: string;
  meeting_notes?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface AgendaViewProps {
  meetings: Meeting[];
  currentDate: Date;
  onMeetingClick: (meeting: Meeting) => void;
  className?: string;
}

/**
 * Mobile-optimized agenda view for calendar meetings.
 * Displays meetings in a vertical list grouped by date.
 */
export function AgendaView({
  meetings,
  currentDate,
  onMeetingClick,
  className
}: AgendaViewProps) {
  // Group meetings by date
  const groupedMeetings = useMemo(() => {
    const groups: { [key: string]: Meeting[] } = {};

    meetings.forEach((meeting) => {
      const meetingDate = parseISO(meeting.meeting_date);
      const dateKey = format(startOfDay(meetingDate), 'yyyy-MM-dd');

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(meeting);
    });

    // Sort meetings within each day by time
    Object.keys(groups).forEach((dateKey) => {
      groups[dateKey].sort((a, b) => {
        return new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime();
      });
    });

    return groups;
  }, [meetings]);

  // Get sorted date keys
  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedMeetings).sort();
  }, [groupedMeetings]);

  // Format date header with relative labels
  const formatDateHeader = (dateKey: string) => {
    const date = parseISO(dateKey);

    if (isToday(date)) {
      return `Today, ${format(date, 'MMM d')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'MMM d')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'MMM d')}`;
    }

    return format(date, 'EEEE, MMM d');
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (sortedDateKeys.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Meetings Scheduled</h3>
        <p className="text-sm text-muted-foreground">
          Your calendar is clear. Tap a time slot to schedule a meeting.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {sortedDateKeys.map((dateKey) => {
        const dateMeetings = groupedMeetings[dateKey];
        const date = parseISO(dateKey);
        const isCurrentDate = isSameDay(date, currentDate);

        return (
          <div key={dateKey} className="space-y-2">
            {/* Date Header */}
            <div
              className={cn(
                'sticky top-0 z-10 bg-background py-2 px-1 border-b-2',
                isCurrentDate ? 'border-primary' : 'border-muted'
              )}
            >
              <h3
                className={cn(
                  'text-sm font-semibold',
                  isCurrentDate ? 'text-primary' : 'text-foreground'
                )}
              >
                {formatDateHeader(dateKey)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {dateMeetings.length} {dateMeetings.length === 1 ? 'meeting' : 'meetings'}
              </p>
            </div>

            {/* Meetings for this date */}
            <div className="space-y-2 px-1">
              {dateMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => onMeetingClick(meeting)}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Individual meeting card for agenda view
 */
function MeetingCard({
  meeting,
  onClick,
  getStatusColor
}: {
  meeting: Meeting;
  onClick: () => void;
  getStatusColor: (status?: string) => string;
}) {
  const meetingTime = parseISO(meeting.meeting_date);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98] touch-target"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        {/* Time and Status Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              {format(meetingTime, 'h:mm a')}
            </span>
          </div>
          {meeting.status && meeting.status !== 'draft' && meeting.status !== 'scheduled' && (
            <Badge
              variant="outline"
              className={cn('text-xs px-2 py-0', getStatusColor(meeting.status))}
            >
              {meeting.status}
            </Badge>
          )}
        </div>

        {/* Working Title */}
        <h4 className="font-semibold text-base text-foreground mb-1 line-clamp-2">
          {meeting.working_title}
        </h4>

        {/* Logline (if available) */}
        {meeting.logline && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {meeting.logline}
          </p>
        )}

        {/* Writer and Organizer Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              Writer: <span className="text-foreground font-medium">{meeting.writer_name}</span>
            </span>
          </div>
          {meeting.organizer_name && (
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">
                Organizer: <span className="text-foreground font-medium">{meeting.organizer_name}</span>
              </span>
            </div>
          )}
        </div>

        {/* Attendees count (if available) */}
        {meeting.meeting_attendees && meeting.meeting_attendees.length > 0 && (
          <div className="mt-2 pt-2 border-t border-muted">
            <span className="text-xs text-muted-foreground">
              {meeting.meeting_attendees.length} {meeting.meeting_attendees.length === 1 ? 'attendee' : 'attendees'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
