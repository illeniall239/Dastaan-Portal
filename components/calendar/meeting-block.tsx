"use client";

import { format, parseISO } from "date-fns";
import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Meeting {
  id: string;
  contact_name?: string;
  organizer_name?: string;
  meeting_date: string;
  duration_minutes?: number;
  attendees?: string[];
  status?: string;
  title: string;
}

interface MeetingBlockProps {
  meeting: Meeting;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const statusColors = {
  scheduled: "bg-blue-500 border-blue-700 text-white shadow-lg",
  confirmed: "bg-blue-500 border-blue-700 text-white shadow-lg",
  completed: "bg-green-500 border-green-700 text-white shadow-lg",
  cancelled: "bg-gray-400 border-gray-600 text-white shadow-lg",
  draft: "bg-blue-500 border-blue-700 text-white shadow-lg",
};

export function MeetingBlock({ meeting, onClick, style, className }: MeetingBlockProps) {
  const meetingDate = parseISO(meeting.meeting_date);
  const status = meeting.status || "scheduled";
  const colorClass = statusColors[status as keyof typeof statusColors] || statusColors.scheduled;

  const numericHeight = typeof style?.height === "number"
    ? style.height
    : typeof style?.height === "string"
      ? parseFloat(style.height)
      : undefined;

  const isMini = numericHeight !== undefined && numericHeight <= 30;
  const isCompact = numericHeight !== undefined && numericHeight > 30 && numericHeight <= 50;
  const isMedium = numericHeight !== undefined && numericHeight > 50 && numericHeight <= 70;

  // Format duration for display
  const durationMinutes = meeting.duration_minutes || 60;
  const durationDisplay = durationMinutes >= 60
    ? `${durationMinutes / 60}h`
    : `${durationMinutes}m`;

  return (
    <div
      className={cn(
        "rounded-lg border-2 cursor-pointer transition-all hover:shadow-xl hover:brightness-110 z-10 flex flex-col justify-center overflow-hidden",
        colorClass,
        isMini
          ? "px-2 py-0.5 text-[11px] leading-[1.2] gap-0.5"
          : isCompact
            ? "px-2.5 py-1 leading-none"
            : isMedium
              ? "px-2.5 py-1.5 text-xs leading-tight gap-1"
              : "px-3 py-2 text-xs gap-2",
        className
      )}
      style={{
        ...style,
        boxSizing: "border-box",
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }}
      onClick={onClick}
    >
      {isMini ? (
        <>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate flex-1">{meeting.title}</span>
            <span className="whitespace-nowrap text-[10px] font-medium shrink-0">
              {format(meetingDate, "h:mm a")}
            </span>
          </div>
        </>
      ) : isCompact ? (
        <>
          <div className="font-semibold truncate text-[10px] leading-none pb-1">
            {meeting.title}
          </div>
          <div className="flex items-center gap-1 text-[9px] leading-none">
            <Clock className="h-2 w-2 text-white/80 shrink-0" />
            <span className="truncate">{format(meetingDate, "h:mm a")} ({durationDisplay})</span>
          </div>
        </>
      ) : isMedium ? (
        <>
          <div className="font-semibold truncate text-xs leading-tight pb-0.5">
            {meeting.title}
          </div>
          <div className="flex items-center gap-1 text-[10px] leading-tight">
            <Clock className="h-2.5 w-2.5 text-white/80 shrink-0" />
            <span className="truncate">{format(meetingDate, "h:mm a")} ({durationDisplay})</span>
          </div>
        </>
      ) : (
        <>
          <div className="font-semibold truncate text-sm">
            {meeting.title}
          </div>

          <div className="flex items-center gap-1 text-xs truncate">
            <Clock className="h-3 w-3 text-white/80 shrink-0" />
            <span className="truncate">{format(meetingDate, "h:mm a")} ({durationDisplay})</span>
          </div>

          <div className="flex items-center gap-1 text-xs truncate">
            <User className="h-3 w-3" />
            <span className="truncate">{meeting.organizer_name || meeting.contact_name}</span>
          </div>
        </>
      )}
    </div>
  );
}
