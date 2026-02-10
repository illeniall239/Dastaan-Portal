"use client";

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";

interface Meeting {
  id: string;
  contact_name?: string;
  organizer_name?: string;
  meeting_date: string;
  attendees?: string[];
  status?: string;
  title: string;
}

interface MonthViewProps {
  currentDate: Date;
  meetings: Meeting[];
  onDateClick: (date: Date) => void;
  onMeetingClick: (meeting: Meeting) => void;
}

export function MonthView({
  currentDate,
  meetings,
  onDateClick,
  onMeetingClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Generate all days to display
  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Get meetings for a specific day
  const getMeetingsForDay = (date: Date) => {
    return meetings.filter((meeting) => {
      const meetingDate = parseISO(meeting.meeting_date);
      return isSameDay(meetingDate, date);
    });
  };

  // Group days into weeks
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-muted/20">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-semibold text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, dayIdx) => {
          const dayMeetings = getMeetingsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[120px] border-r border-b p-2 hover:bg-muted/30 cursor-pointer transition-colors",
                !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                isToday && "bg-blue-50"
              )}
              onClick={() => onDateClick(day)}
            >
              {/* Date number */}
              <div className="flex justify-between items-start mb-2">
                <span
                  className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    isToday && "bg-blue-600 text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Meeting indicators */}
              <div className="space-y-1">
                {dayMeetings.slice(0, 3).map((meeting) => (
                  <div
                    key={meeting.id}
                    className="text-xs px-2 py-1 rounded bg-purple-100 border-l-2 border-purple-500 truncate hover:bg-purple-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMeetingClick(meeting);
                    }}
                  >
                    <div className="font-medium truncate">
                      {format(parseISO(meeting.meeting_date), "h:mm a")}
                    </div>
                    <div className="truncate text-muted-foreground">
                      {meeting.title}
                    </div>
                  </div>
                ))}

                {/* Show "+N more" if there are more meetings */}
                {dayMeetings.length > 3 && (
                  <div className="text-xs text-muted-foreground px-2">
                    +{dayMeetings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
