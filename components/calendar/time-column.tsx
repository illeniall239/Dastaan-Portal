"use client";

import { format } from "date-fns";

interface TimeColumnProps {
  startHour?: number;
  endHour?: number;
}

export function TimeColumn({ startHour = 8, endHour = 20 }: TimeColumnProps) {
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );

  return (
    <div className="flex flex-col border-r bg-muted/30">
      {/* Empty space for header */}
      <div className="h-16 border-b" />

      {/* Time slots */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="h-20 border-b px-2 py-1 text-xs text-muted-foreground"
        >
          {format(new Date().setHours(hour, 0, 0, 0), "h a")}
        </div>
      ))}
    </div>
  );
}
