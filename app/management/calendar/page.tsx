"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewSwitcher } from "@/components/calendar/view-switcher";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { MonthView } from "@/components/calendar/month-view";
import { MeetingPeekPanel } from "@/components/calendar/meeting-peek-panel";
import { CalendarSkeleton } from "@/components/skeletons/calendar-skeleton";
import { createClient } from "@/lib/supabase/client";

interface Meeting {
  id: string;
  writer_name: string;
  organizer_name?: string;
  meeting_date: string;
  meeting_attendees?: string[];
  status?: string;
  working_title: string;
  logline?: string;
  meeting_notes?: string;
  contact_email?: string;
  contact_phone?: string;
}

export default function ManagementCalendar() {
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [animationDirection, setAnimationDirection] = useState<"forward" | "backward" | null>(null);

  // Fetch meetings from database
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchMeetings = useCallback(async () => {
    if (isFetching) {
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("call_reports")
        .select(`
          id,
          writer_name,
          meeting_date,
          meeting_attendees,
          status,
          working_title,
          logline,
          meeting_notes,
          contact_email,
          contact_phone
        `)
        .eq("meeting_type", "scheduled_meeting")
        .order("meeting_date", { ascending: true })
        .limit(200);

      if (fetchError) throw fetchError;

      setMeetings(data || []);
    } catch (error: any) {
      console.error("❌ Error fetching meetings:", error);
      setError(error.message || "Failed to load meetings");
      setMeetings([]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation handlers
  const handlePrevious = () => {
    if (!currentDate) return;
    setAnimationDirection("backward");
    if (currentView === "day") {
      setCurrentDate(subDays(currentDate, 1));
    } else if (currentView === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (currentView === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (!currentDate) return;
    setAnimationDirection("forward");
    if (currentView === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (currentView === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (currentView === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    if (currentView === "month") {
      setCurrentView("day");
    }
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  // Get date range text
  const getDateRangeText = () => {
    if (currentView === "day") {
      return currentDate ? format(currentDate, "EEEE, MMMM d, yyyy") : "Select Date";
    } else if (currentView === "week") {
      if (!currentDate) return "Select Date";
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else if (currentView === "month") {
      return currentDate ? format(currentDate, "MMMM yyyy") : "Select Date";
    }
  };

  return (
    <div className="flex h-screen bg-muted/10">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevious} disabled={loading}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} disabled={loading}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday} disabled={loading}>
                Today
              </Button>
            </div>

            {/* Date Range Display */}
            <h1 className="text-xl font-semibold">{getDateRangeText()}</h1>
          </div>

          {/* Refresh button and View Switcher */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={fetchMeetings}
              title="Refresh meetings"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
          </div>
        </div>

        {/* Calendar View Area */}
        <div className="flex-1 flex overflow-hidden">
          {error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <p className="text-destructive font-semibold mb-2">Error Loading Calendar</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchMeetings}>Retry</Button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 p-4 overflow-auto">
              <CalendarSkeleton view={currentView} />
            </div>
          ) : (
            <>
              <div className="flex-1 p-4 overflow-auto">
                <div
                  key={`${currentDate ? format(currentDate, 'yyyy-MM-dd') : 'unknown'}-${currentView}`}
                  className={`transition-all duration-200 ease-in-out ${
                    animationDirection === "forward"
                      ? "animate-slide-in-right"
                      : animationDirection === "backward"
                        ? "animate-slide-in-left"
                        : ""
                  }`}
                  onAnimationEnd={() => setAnimationDirection(null)}
                >
                  {currentView === "month" ? (
                    <MonthView
                      currentDate={currentDate}
                      meetings={meetings}
                      onDateClick={handleDateSelect}
                      onMeetingClick={handleMeetingClick}
                    />
                  ) : (
                    <CalendarGrid
                      view={currentView}
                      currentDate={currentDate}
                      meetings={meetings}
                      onMeetingClick={handleMeetingClick}
                      readOnly={true}
                    />
                  )}
                </div>
              </div>

              {/* Meeting Peek Panel */}
              {selectedMeeting && (
                <MeetingPeekPanel
                  meeting={selectedMeeting}
                  onClose={() => setSelectedMeeting(null)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
