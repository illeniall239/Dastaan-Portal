import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format, parseISO, startOfDay, isSameDay, addDays, getHours } from 'date-fns';
import { HorizontalDaySelector } from './horizontal-day-selector';
import { TimeSlot } from './time-slot';
import { cn } from '@/lib/utils';

interface Meeting {
  id: string;
  writer_name: string;
  working_title: string;
  meeting_date: string;
  status?: string;
  logline?: string;
}

interface TeamsMobileCalendarProps {
  meetings: Meeting[];
  currentDate: Date;
  onMeetingClick: (meeting: Meeting) => void;
  onTimeSlotClick: (dateTime: Date) => void;
  className?: string;
}

/**
 * Microsoft Teams-inspired mobile calendar view.
 * Features:
 * - Horizontal scrollable day selector at top
 * - Vertical scrollable date list with time slots
 * - Core hours (9 AM - 5 PM) always shown
 * - Extended hours shown if meetings exist outside core hours
 * - Tap on any time slot to schedule a meeting
 */
export function TeamsMobileCalendar({
  meetings,
  currentDate,
  onMeetingClick,
  onTimeSlotClick,
  className
}: TeamsMobileCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const dateRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Generate 21 days for display (matching horizontal selector)
  const days = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => addDays(currentDate, i - 10));
  }, [currentDate]);

  // Group meetings by date and hour
  const groupedMeetings = useMemo(() => {
    const groups: { [dateKey: string]: { [hour: number]: Meeting[] } } = {};

    days.forEach(day => {
      const dateKey = format(startOfDay(day), 'yyyy-MM-dd');
      groups[dateKey] = {};
    });

    meetings.forEach(meeting => {
      const meetingDate = parseISO(meeting.meeting_date);
      const dateKey = format(startOfDay(meetingDate), 'yyyy-MM-dd');
      const hour = getHours(meetingDate);

      if (groups[dateKey]) {
        if (!groups[dateKey][hour]) {
          groups[dateKey][hour] = [];
        }
        groups[dateKey][hour].push(meeting);
      }
    });

    return groups;
  }, [meetings, days]);

  // Get hour range for a specific date (9-17 core, extended if needed)
  const getHourRange = (dateKey: string): number[] => {
    const CORE_START = 9; // 9 AM
    const CORE_END = 17; // 5 PM
    const meetingsForDate = groupedMeetings[dateKey] || {};
    const hoursWithMeetings = Object.keys(meetingsForDate).map(Number);

    if (hoursWithMeetings.length === 0) {
      // No meetings: show core hours only
      return Array.from({ length: CORE_END - CORE_START + 1 }, (_, i) => CORE_START + i);
    }

    // Has meetings: extend range to include all meeting hours
    const minHour = Math.min(...hoursWithMeetings, CORE_START);
    const maxHour = Math.max(...hoursWithMeetings, CORE_END);

    return Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  };

  // Handle day selection from horizontal selector
  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    scrollToDate(date);
  };

  // Scroll to specific date in vertical list
  const scrollToDate = (date: Date) => {
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
    const element = dateRefs.current[dateKey];

    if (element && scrollContainerRef.current) {
      isScrolling.current = true;
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrolling.current = false;
      }, 1000);
    }
  };

  // Scroll to current date on mount
  useEffect(() => {
    scrollToDate(currentDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update selected date based on visible date (IntersectionObserver)
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return; // Don't update during programmatic scroll

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const dateKey = entry.target.getAttribute('data-date');
            if (dateKey) {
              const date = parseISO(dateKey);
              setSelectedDate(date);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.5],
        rootMargin: '-20% 0px -70% 0px'
      }
    );

    // Observe all date sections
    Object.values(dateRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [days]);

  return (
    <div className={cn('flex flex-col h-full bg-muted/10', className)}>
      {/* Horizontal Day Selector */}
      <HorizontalDaySelector
        currentDate={currentDate}
        selectedDate={selectedDate}
        onDateSelect={handleDaySelect}
      />

      {/* Vertical Scrollable Date List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        {days.map((day) => {
          const dateKey = format(startOfDay(day), 'yyyy-MM-dd');
          const hourRange = getHourRange(dateKey);
          const meetingsForDate = groupedMeetings[dateKey] || {};

          return (
            <div
              key={dateKey}
              ref={(el) => {
                dateRefs.current[dateKey] = el;
              }}
              data-date={dateKey}
              className="border-b last:border-b-0"
            >
              {/* Date Row */}
              <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
                <div className="flex items-baseline gap-3 px-3 py-2.5">
                  {/* Date Label (15 Jan format) */}
                  <div className="flex-shrink-0 w-16">
                    <div className="text-2xl font-bold text-foreground">
                      {format(day, 'd')}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground uppercase">
                      {format(day, 'MMM')}
                    </div>
                  </div>

                  {/* Day Name */}
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">
                      {format(day, 'EEEE')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Object.values(meetingsForDate).flat().length} meeting
                      {Object.values(meetingsForDate).flat().length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Slots */}
              <div className="px-3 py-2 space-y-2">
                {hourRange.map((hour) => {
                  const meetingsForHour = meetingsForDate[hour] || [];
                  const dateTime = new Date(day);
                  dateTime.setHours(hour, 0, 0, 0);

                  return (
                    <TimeSlot
                      key={hour}
                      hour={hour}
                      date={day}
                      meetings={meetingsForHour}
                      onSlotClick={(date, hour) => {
                        const slotDateTime = new Date(date);
                        slotDateTime.setHours(hour, 0, 0, 0);
                        onTimeSlotClick(slotDateTime);
                      }}
                      onMeetingClick={onMeetingClick}
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
