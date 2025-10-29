"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";

interface CalendarPickerProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date) => void;
}

export function CalendarPicker({ selectedDate, onDateSelect }: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const firstDayOfMonth = startOfMonth(currentMonth);
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfWeek = firstDayOfMonth.getDay();

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (day: number) => {
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onDateSelect(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={prevMonth}
            disabled={isSameMonth(currentMonth, new Date())}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-medium">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="h-8" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(
              currentMonth.getFullYear(),
              currentMonth.getMonth(),
              day
            );
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <Button
                key={day}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={`h-8 w-8 p-0 font-normal ${
                  isToday ? "bg-blue-100 text-blue-800" : ""
                } ${isSelected ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() => handleDateClick(day)}
              >
                {day}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}