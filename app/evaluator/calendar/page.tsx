"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ViewSwitcher } from "@/components/calendar/view-switcher";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { MonthView } from "@/components/calendar/month-view";
import { TeamsMobileCalendar } from "@/components/calendar/teams-mobile-calendar";
import { MeetingPeekPanel } from "@/components/calendar/meeting-peek-panel";
import { QuickMeetingDialog } from "@/components/calendar/quick-meeting-dialog";
import { CalendarSkeleton } from "@/components/skeletons/calendar-skeleton";
import { createClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/ui/back-button";

interface Meeting {
  id: string;
  meeting_id?: string;
  title: string;
  contact_name?: string;
  organizer_name?: string;
  meeting_date: string;
  duration_minutes?: number;
  attendees?: string[];
  status?: string;
  notes?: string;
  contact_email?: string;
  contact_phone?: string;
  category?: string;
  location?: string;
  agenda?: string;
}

export default function EvaluatorCalendar() {
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickMeetingDialogOpen, setQuickMeetingDialogOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

      // TEAM ISOLATION: Get current user's team_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data: currentUser } = await supabase
        .from("users")
        .select("team_id, role")
        .eq("id", user.id)
        .single();

      const hasGlobalAccess = currentUser?.role && ['admin', 'management'].includes(currentUser.role);

      // Build query with team filter
      let query = supabase
        .from("meetings")
        .select(`
          id,
          meeting_id,
          title,
          contact_name,
          meeting_date,
          duration_minutes,
          attendees,
          status,
          notes,
          contact_email,
          contact_phone,
          category,
          location,
          agenda,
          organizer:users!created_by(name)
        `);

      // TEAM ISOLATION: Apply team filter unless admin/management
      if (!hasGlobalAccess && currentUser?.team_id) {
        query = query.eq("team_id", currentUser.team_id);
      }

      const { data, error: fetchError } = await query
        .order("meeting_date", { ascending: true })
        .limit(200);

      if (fetchError) throw fetchError;

      const processedData = (data || []).map((meeting: any) => ({
        ...meeting,
        organizer_name: meeting.organizer?.name || "Unknown"
      }));

      setMeetings(processedData);
    } catch (error: any) {
      console.error("❌ Error fetching meetings:", error);
      setError(error.message || "Failed to load meetings");
      setMeetings([]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  // Fetch current user ID
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Handle time slot click
  const handleTimeSlotClick = (dateTime: Date) => {
    setSelectedDateTime(dateTime);
    setQuickMeetingDialogOpen(true);
  };

  // Handle meeting created - refresh calendar
  const handleMeetingCreated = () => {
    fetchMeetings();
  };

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
        {/* Top Navigation Bar - Shows immediately */}
        <div className="bg-white border-b p-3 sm:p-4 flex flex-col gap-4">
          {/* Top Row: Back Button + Controls */}
          <div className="flex items-center justify-between">
            <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={fetchMeetings}
                title="Refresh meetings"
                disabled={loading}
                className="touch-target"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <div className="hidden md:block">
                <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
              </div>
            </div>
          </div>

          {/* Bottom Row: Navigation and Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevious} disabled={loading} className="touch-target">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} disabled={loading} className="touch-target">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday} disabled={loading} className="touch-target">
                Today
              </Button>
            </div>

            {/* Date Range Display */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{getDateRangeText()}</h1>
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
              {/* Mobile: Teams-Style Calendar */}
              <div className="md:hidden flex-1 overflow-hidden">
                <TeamsMobileCalendar
                  meetings={meetings}
                  currentDate={currentDate}
                  onMeetingClick={handleMeetingClick}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              </div>

              {/* Desktop: Calendar Grid/Month View */}
              <div className="hidden md:block flex-1 p-4 overflow-auto">
                <div
                  key={`${currentDate ? format(currentDate, 'yyyy-MM-dd') : 'unknown'}-${currentView}`}
                  className={`transition-all duration-200 ease-in-out ${animationDirection === "forward"
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
                      onTimeSlotClick={handleTimeSlotClick}
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

      {/* Quick Meeting Dialog */}
      {currentUserId && (
        <QuickMeetingDialog
          open={quickMeetingDialogOpen}
          onOpenChange={setQuickMeetingDialogOpen}
          selectedDateTime={selectedDateTime}
          onMeetingCreated={handleMeetingCreated}
          userId={currentUserId}
        />
      )}
    </div>
  );
}
