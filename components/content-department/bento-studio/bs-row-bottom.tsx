"use client";

import Link from "next/link";
import { Calendar, FileText, Film } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BsTile } from "./bs-tile";

const ICON_MAP: Record<string, LucideIcon> = {
  calendar: Calendar,
  fileText: FileText,
  film: Film,
};

interface QuickAction {
  iconName: string;
  label: string;
  description: string;
  href: string;
}

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  contact_name: string | null;
}

interface BsRowBottomProps {
  quickActions: QuickAction[];
  upcomingMeetings: Meeting[];
}

export function BsRowBottom({ quickActions, upcomingMeetings }: BsRowBottomProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Recent One-Liners Tile */}
      <BsTile variant="white" className="flex-1 min-h-[340px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[#15151A]">Recent one-liners</h3>
          <Link
            href="/content-department/call-reports"
            className="text-[12.5px] font-semibold text-[#5B4BFF] hover:underline"
          >
            See all
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <p className="text-[13px] text-[#7B7B85] text-center py-8">
            View all one-liner reports to see recent activity
          </p>
          <div className="text-center">
            <Link
              href="/content-department/call-reports"
              className="text-[13px] font-semibold text-[#5B4BFF] hover:underline"
            >
              View all reports →
            </Link>
          </div>
        </div>
      </BsTile>

      {/* Deliveries / Upcoming Meetings Tile (Dark) */}
      <BsTile variant="dark" className="w-full md:w-[340px] flex-shrink-0 flex flex-col min-h-[340px]">
        <h3 className="text-[15px] font-bold text-white mb-4">Next deliveries</h3>

        <div className="space-y-3 flex-1">
          {upcomingMeetings.length > 0 ? (
            upcomingMeetings.slice(0, 3).map((meeting) => {
              const date = new Date(meeting.meeting_date);
              const day = date.getDate();
              const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();

              return (
                <Link
                  key={meeting.id}
                  href="/content-department/calendar"
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {/* Date Box */}
                  <div className="w-[46px] h-[46px] rounded-[14px] bg-white/[0.08] flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[16px] font-extrabold text-white leading-none">{day}</span>
                    <span className="text-[9px] font-semibold text-white/[0.54] tracking-[0.6px]">{month}</span>
                  </div>
                  {/* Text */}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">
                      {meeting.title || "Untitled Meeting"}
                    </p>
                    <p className="text-[11.5px] text-white/50 truncate">
                      {meeting.contact_name || "No contact specified"}
                    </p>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-[13px] text-white/50 text-center py-8">
              No upcoming deliveries
            </p>
          )}
        </div>

        <div className="mt-auto pt-4">
          <Link
            href="/content-department/calendar"
            className="flex items-center justify-center gap-2 w-full h-[42px] bg-white/[0.08] rounded-[14px] text-[13px] font-semibold text-white hover:bg-white/[0.14] transition-colors"
          >
            <Calendar className="w-[15px] h-[15px]" />
            Open calendar
          </Link>
        </div>
      </BsTile>

      {/* Quick Actions Tile */}
      <BsTile variant="white" className="w-full md:w-[230px] flex-shrink-0 min-h-[340px]">
        <h3 className="text-[15px] font-bold text-[#15151A] mb-3">Quick actions</h3>

        <div className="space-y-[12px]">
          {quickActions.map((action, i) => {
            const Icon = ICON_MAP[action.iconName] || FileText;
            return (
              <Link
                key={i}
                href={action.href}
                className="flex items-center gap-[10px] bg-[#F8F8F5] rounded-[15px] px-[13px] py-[11px] w-full hover:bg-[#F0F0ED] transition-colors"
              >
                <div className="w-[28px] h-[28px] rounded-[9px] bg-[#5B4BFF1F] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-[14px] h-[14px] text-[#5B4BFF]" />
                </div>
                <span className="text-[12.5px] font-semibold text-[#15151A]">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </BsTile>
    </div>
  );
}
