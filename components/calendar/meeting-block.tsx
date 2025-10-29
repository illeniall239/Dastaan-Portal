"use client";

import { format, parseISO } from "date-fns";
import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Meeting {
  id: string;
  writer_name: string;
  organizer_name?: string;
  meeting_date: string;
  meeting_attendees?: string[];
  status?: string;
  working_title: string;
}

interface MeetingBlockProps {
  meeting: Meeting;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const statusColors = {
  scheduled: "bg-purple-500 border-purple-700 text-white shadow-lg",
  confirmed: "bg-blue-500 border-blue-700 text-white shadow-lg",
  completed: "bg-green-500 border-green-700 text-white shadow-lg",
  cancelled: "bg-gray-400 border-gray-600 text-white shadow-lg",
  draft: "bg-orange-500 border-orange-700 text-white shadow-lg",
};

export function MeetingBlock({ meeting, onClick, style, className }: MeetingBlockProps) {
  const meetingDate = parseISO(meeting.meeting_date);
  const status = meeting.status || "scheduled";
  const colorClass = statusColors[status as keyof typeof statusColors] || statusColors.scheduled;

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-3 cursor-pointer transition-all hover:shadow-xl hover:scale-105 min-h-[70px] z-10",
        colorClass,
        className
      )}
      style={{
        ...style,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }}
      onClick={onClick}
    >
      <div className="text-xs font-semibold truncate mb-1">
        {meeting.working_title}
      </div>

      <div className="flex items-center gap-1 text-xs mb-1">
        <Clock className="h-3 w-3" />
        <span>{format(meetingDate, "h:mm a")}</span>
      </div>

      <div className="flex items-center gap-1 text-xs truncate">
        <User className="h-3 w-3" />
        <span className="truncate">{meeting.organizer_name || meeting.writer_name}</span>
      </div>
    </div>
  );
}
