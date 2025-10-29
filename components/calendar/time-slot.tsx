import React from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Meeting {
  id: string;
  writer_name: string;
  working_title: string;
  meeting_date: string;
  status?: string;
  logline?: string;
}

interface TimeSlotProps {
  hour: number; // 0-23
  date: Date;
  meetings: Meeting[];
  onSlotClick: (date: Date, hour: number) => void;
  onMeetingClick: (meeting: Meeting) => void;
}

/**
 * Time slot component for Teams-style calendar
 * Shows either empty slot or meetings for a specific hour
 */
export function TimeSlot({
  hour,
  date,
  meetings,
  onSlotClick,
  onMeetingClick
}: TimeSlotProps) {
  const timeLabel = formatHour(hour);
  const hasMeetings = meetings.length > 0;

  if (!hasMeetings) {
    return (
      <div
        onClick={() => onSlotClick(date, hour)}
        className={cn(
          'min-h-[60px] p-3 rounded-lg cursor-pointer',
          'bg-muted/20 hover:bg-muted/40',
          'border border-transparent hover:border-muted',
          'transition-all duration-200',
          'touch-target'
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{timeLabel}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-5">No meetings</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {meetings.map((meeting) => (
        <MeetingSlot
          key={meeting.id}
          meeting={meeting}
          timeLabel={timeLabel}
          onClick={() => onMeetingClick(meeting)}
        />
      ))}
    </div>
  );
}

/**
 * Individual meeting card within a time slot
 */
function MeetingSlot({
  meeting,
  timeLabel,
  onClick
}: {
  meeting: Meeting;
  timeLabel: string;
  onClick: () => void;
}) {
  const meetingTime = parseISO(meeting.meeting_date);

  return (
    <div
      onClick={onClick}
      className={cn(
        'min-h-[80px] p-3 rounded-lg cursor-pointer',
        'bg-white border border-muted',
        'hover:shadow-md hover:border-primary/30',
        'active:scale-[0.98]',
        'transition-all duration-200',
        'touch-target'
      )}
    >
      {/* Time and Status */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold text-foreground">
            {format(meetingTime, 'h:mm a')}
          </span>
        </div>
        {meeting.status && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-4',
              getStatusColor(meeting.status)
            )}
          >
            {meeting.status}
          </Badge>
        )}
      </div>

      {/* Meeting Title */}
      <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
        {meeting.working_title}
      </h4>

      {/* Writer Info */}
      <div className="flex items-center gap-1.5">
        <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate">
          {meeting.writer_name}
        </span>
      </div>

      {/* Logline (if available and space permits) */}
      {meeting.logline && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
          {meeting.logline}
        </p>
      )}
    </div>
  );
}

/**
 * Format hour (0-23) to 12-hour time
 */
function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

/**
 * Get status color classes
 */
function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300';
  }
}
