import React, { useRef, useEffect } from 'react';
import { format, addDays, subDays, isToday, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface HorizontalDaySelectorProps {
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  className?: string;
}

/**
 * Horizontal scrollable day selector for mobile calendar.
 * Shows 21 days (3 weeks) with smooth scroll and snap points.
 * Format: "M 15", "T 16", etc.
 */
export function HorizontalDaySelector({
  currentDate,
  selectedDate,
  onDateSelect,
  className
}: HorizontalDaySelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate 21 days: 10 before currentDate, currentDate, 10 after
  const days = Array.from({ length: 21 }, (_, i) => {
    return addDays(currentDate, i - 10);
  });

  // Scroll to selected date when it changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const selectedIndex = days.findIndex(day => isSameDay(day, selectedDate));
      if (selectedIndex !== -1) {
        const dayElement = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
        if (dayElement) {
          dayElement.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest'
          });
        }
      }
    }
  }, [selectedDate]);

  // Format day chip text: "M 15", "T 16", etc.
  const formatDayChip = (date: Date) => {
    const dayLetter = format(date, 'EEEEE'); // Single letter: M, T, W, etc.
    const dayNumber = format(date, 'd'); // Day number: 1, 2, 3, etc.
    return { dayLetter, dayNumber };
  };

  return (
    <div className={cn('bg-white border-b', className)}>
      {/* Scrollable container with snap points */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex overflow-x-auto gap-2 px-3 py-3',
          'scrollbar-hide', // Hide scrollbar for cleaner look
          'scroll-smooth',
          // Snap to center for each day chip
          '[scroll-snap-type:x_mandatory]'
        )}
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        {days.map((day, index) => {
          const { dayLetter, dayNumber } = formatDayChip(day);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              className={cn(
                // Layout and sizing
                'flex-shrink-0 flex flex-col items-center justify-center',
                'w-12 h-16 rounded-lg',
                'scroll-snap-align-center',
                // Touch target
                'touch-target',
                // Base styles
                'transition-all duration-200',
                'border-2',
                // Selected state (primary blue)
                isSelected && [
                  'bg-primary text-primary-foreground',
                  'border-primary',
                  'shadow-md',
                ],
                // Today state (lighter blue if not selected)
                isTodayDate && !isSelected && [
                  'bg-primary/10 text-primary',
                  'border-primary/30',
                  'font-semibold',
                ],
                // Default state
                !isSelected && !isTodayDate && [
                  'bg-muted/20 text-foreground',
                  'border-transparent',
                  'hover:bg-muted/40',
                ],
                // Dim days from other months
                !isCurrentMonth && 'opacity-40'
              )}
            >
              {/* Day letter (M, T, W, etc.) */}
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase mb-0.5',
                  isSelected
                    ? 'text-primary-foreground'
                    : isTodayDate
                      ? 'text-primary'
                      : 'text-muted-foreground'
                )}
              >
                {dayLetter}
              </span>

              {/* Day number (15, 16, etc.) */}
              <span
                className={cn(
                  'text-lg font-bold',
                  isSelected
                    ? 'text-primary-foreground'
                    : isTodayDate
                      ? 'text-primary'
                      : 'text-foreground'
                )}
              >
                {dayNumber}
              </span>
            </button>
          );
        })}
      </div>

      {/* Optional: Add fade effect on edges to indicate scrollability */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
