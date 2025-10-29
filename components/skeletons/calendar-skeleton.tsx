import { Skeleton } from "@/components/ui/skeleton";

interface CalendarSkeletonProps {
  view: "day" | "week" | "month";
}

export function CalendarSkeleton({ view }: CalendarSkeletonProps) {
  if (view === "month") {
    return <MonthViewSkeleton />;
  }

  return <GridViewSkeleton view={view} />;
}

function GridViewSkeleton({ view }: { view: "day" | "week" }) {
  const numDays = view === "day" ? 1 : 7;
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm

  // Sample skeleton meeting blocks (2-3 per day)
  const getSampleMeetings = (dayIndex: number) => {
    const meetings = [];
    // Add 2-3 random meetings per day
    if (dayIndex % 2 === 0) {
      meetings.push({ hour: 9, height: 80 }); // 1 hour meeting at 9am
    }
    if (dayIndex % 3 === 0) {
      meetings.push({ hour: 14, height: 160 }); // 2 hour meeting at 2pm
    }
    if (dayIndex === 1 || dayIndex === 4) {
      meetings.push({ hour: 11, height: 80 }); // 1 hour meeting at 11am
    }
    return meetings;
  };

  return (
    <div className="flex flex-1 overflow-hidden border rounded-lg bg-white">
      {/* Time column */}
      <div className="w-20 flex-shrink-0 border-r bg-gray-50">
        <div className="h-14 border-b" /> {/* Header spacer */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="h-20 border-b flex items-start justify-center pt-1 text-xs text-gray-500"
          >
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex-1 overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${numDays}, minmax(0, 1fr))` }}>
          {/* Day headers */}
          {Array.from({ length: numDays }).map((_, dayIndex) => (
            <div
              key={`header-${dayIndex}`}
              className="h-14 border-b border-r flex flex-col items-center justify-center bg-gray-50 px-2"
            >
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}

          {/* Time slot grid */}
          {Array.from({ length: numDays }).map((_, dayIndex) => (
            <div
              key={`day-${dayIndex}`}
              className="relative border-r"
              style={{ gridRow: "2 / -1" }}
            >
              {/* Hour dividers */}
              {hours.map((hour) => (
                <div
                  key={`${dayIndex}-${hour}`}
                  className="h-20 border-b"
                />
              ))}

              {/* Sample skeleton meeting blocks */}
              {getSampleMeetings(dayIndex).map((meeting, meetingIndex) => (
                <div
                  key={`meeting-${dayIndex}-${meetingIndex}`}
                  className="absolute left-1 right-1"
                  style={{
                    top: `${(meeting.hour - 8) * 80}px`,
                    height: `${meeting.height}px`,
                  }}
                >
                  <Skeleton className="h-full w-full rounded-md" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthViewSkeleton() {
  const weeks = 5; // 5 weeks in typical month view
  const daysPerWeek = 7;

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="py-2 px-3 text-center border-r last:border-r-0"
          >
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: weeks * daysPerWeek }).map((_, i) => (
          <div
            key={i}
            className="aspect-square border-r border-b p-2 hover:bg-gray-50 transition-colors"
          >
            {/* Day number */}
            <Skeleton className="h-5 w-6 mb-2" />

            {/* Sample meeting dots (some days have meetings) */}
            {i % 3 === 0 && (
              <div className="space-y-1">
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            )}
            {i % 5 === 0 && (
              <div className="space-y-1 mt-1">
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2 w-3/4 rounded-full" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
