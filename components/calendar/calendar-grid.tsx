"use client";

import { format, addDays, startOfWeek, parseISO, differenceInMinutes, isSameDay } from "date-fns";
import { TimeColumn } from "./time-column";
import { MeetingBlock } from "./meeting-block";

interface Meeting {
  id: string;
  writer_name: string;
  organizer_name?: string;
  meeting_date: string;
  duration_minutes?: number;
  meeting_attendees?: string[];
  status?: string;
  working_title: string;
}

interface CalendarGridProps {
  view: "day" | "week" | "workweek";
  currentDate: Date;
  meetings: Meeting[];
  onMeetingClick: (meeting: Meeting) => void;
  onTimeSlotClick?: (dateTime: Date) => void;
  startHour?: number;
  endHour?: number;
  readOnly?: boolean;
}

export function CalendarGrid({
  view,
  currentDate,
  meetings,
  onMeetingClick,
  onTimeSlotClick,
  startHour = 8,
  endHour = 20,
  readOnly = false,
}: CalendarGridProps) {
  // Calculate days to display
  const getDaysToDisplay = () => {
    if (view === "day") {
      return [currentDate];
    }

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }

    // workweek: Monday to Friday
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i + 1));
  };

  const days = getDaysToDisplay();
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Calculate meeting position and height
  const getMeetingStyle = (meetingDate: Date, durationMinutes: number = 60) => {
    const meetingHour = meetingDate.getHours();
    const meetingMinute = meetingDate.getMinutes();

    // Calculate top position (from start hour)
    const minutesFromStart = (meetingHour - startHour) * 60 + meetingMinute;
    const top = (minutesFromStart / 60) * 80; // 80px per hour

    // Calculate height based on duration (with 20px minimum for visibility)
    const calculatedHeight = (durationMinutes / 60) * 80; // 80px per hour
    const height = Math.max(20, calculatedHeight);

    return {
      top: `${top}px`,
      height: `${height}px`,
      width: 'calc(100% - 8px)',
      left: '4px',
      position: 'absolute' as const,
    };
  };

  // Filter meetings for each day
  const getMeetingsForDay = (day: Date) => {
    return meetings.filter((meeting) => {
      const meetingDate = parseISO(meeting.meeting_date);
      return isSameDay(meetingDate, day);
    });
  };

  // Handle time slot click
  const handleTimeSlotClick = (day: Date, hour: number) => {
    if (!onTimeSlotClick) return;

    // Create date/time for the clicked slot
    const dateTime = new Date(day);
    dateTime.setHours(hour, 0, 0, 0);

    onTimeSlotClick(dateTime);
  };

  return (
    <div className="flex flex-1 overflow-hidden border rounded-lg bg-white">
      {/* Time column */}
      <TimeColumn startHour={startHour} endHour={endHour} />

      {/* Days columns */}
      <div className="flex flex-1 overflow-x-auto">
        {days.map((day) => {
          const dayMeetings = getMeetingsForDay(day);

          return (
            <div key={day.toISOString()} className="flex-1 min-w-[150px] border-r last:border-r-0">
              {/* Day header */}
              <div className="h-16 border-b bg-muted/20 p-2 text-center">
                <div className="text-xs text-muted-foreground uppercase">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-xl font-semibold ${
                    isSameDay(day, new Date())
                      ? "bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                      : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>

              {/* Time slots grid */}
              <div className="relative" style={{ minHeight: `${hours.length * 80}px` }}>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className={`h-20 border-b transition-colors ${
                      readOnly ? '' : 'hover:bg-blue-50 cursor-pointer group'
                    }`}
                    style={{ position: 'relative' }}
                    onClick={readOnly ? undefined : () => handleTimeSlotClick(day, hour)}
                    title={readOnly ? undefined : `Schedule meeting at ${hour}:00`}
                  >
                    {/* Subtle plus icon on hover - only shown when not readOnly */}
                    {!readOnly && (
                      <div className="opacity-0 group-hover:opacity-40 absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity">
                        <span className="text-3xl text-blue-600">+</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Meeting blocks */}
                {dayMeetings.map((meeting) => {
                  const meetingDate = parseISO(meeting.meeting_date);
                  const style = getMeetingStyle(meetingDate, meeting.duration_minutes || 60);

                  return (
                    <MeetingBlock
                      key={meeting.id}
                      meeting={meeting}
                      onClick={() => onMeetingClick(meeting)}
                      style={style}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
