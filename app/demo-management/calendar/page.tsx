"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewSwitcher } from "@/components/calendar/view-switcher";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { MonthView } from "@/components/calendar/month-view";
import { TeamsMobileCalendar } from "@/components/calendar/teams-mobile-calendar";
import { MeetingPeekPanel } from "@/components/calendar/meeting-peek-panel";
import { CalendarSkeleton } from "@/components/skeletons/calendar-skeleton";

interface Meeting {
  id: string;
  contact_name?: string;
  organizer_name?: string;
  meeting_date: string;
  duration_minutes?: number;
  attendees?: string[];
  status?: string;
  title: string;
  notes?: string;
  contact_email?: string;
  contact_phone?: string;
}

export default function DemoCalendarPage() {
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [animationDirection, setAnimationDirection] = useState<"forward" | "backward" | null>(null);

  // Create Pakistani writer names in Roman Urdu for dummy data
  const getPakistaniWriterNames = () => [
    'Umera Ahmad', 'Hassan Imam', 'Ali Moeen', 'Irfan Khan', 'Saima Akram',
    'Hina Altaf', 'Mehmood Shah', 'Rida Bilgrami', 'Farhat Ishtiaq', 'Bushra Ansari',
    'Saife Hassan', 'Hira Shahab', 'Khalil Ullah', 'Rabia Azfar', 'Ahmed Ali',
    'Fatima Suria', 'Asad Bashir', 'Nida Mumtaz', 'Taimoor Ahmed', 'Nigar Sultana',
    'Faisal Malik', 'Ayesha Iqbal', 'Imran Ashraf', 'Hina Qadir', 'Bilal Ahmad',
    'Zara Javed', 'Sohaib Khan', 'Hareem Shah', 'Arsalan Memon', 'Alishba Shabbir'
  ];

  // Create Pakistani drama names in Roman Urdu for dummy data
  const getPakistaniDramaNames = () => [
    'Humsafar', 'Mere Paas Tum Ho', 'Diyar-e-Dil', 'Zindagi Gulzar Hai', 'Ishq Zahe Naseeb',
    'Aik Thi Raniya', 'Ishq Khuda Ke Naam', 'Tumhari Natasha', 'Bunty I Love You', 'Lahore Se Aagey',
    'Jaan Nisaar', 'Pyarey Afzal', 'Ishq Bazaar', 'Aik Thi Meree Qismat', 'Ishq Hai',
    'Sinf-e-Aahan', 'Aik Thi Rania', 'Alif Allah Aur Insaan', 'Zindagi Kitni Haseen Hay',
    'Mah-e-Tamaam', 'Sanam', 'Mere Paas Tum Na Aa', 'Ishq Gumshuda'
  ];

  // Create dummy meetings that match the real schema
  const generateDummyMeetings = (): Meeting[] => {
    const writerNames = getPakistaniWriterNames();
    const dramaNames = getPakistaniDramaNames();
    const statuses = ['scheduled', 'completed', 'cancelled', 'rescheduled'];

    // Generate meetings for the next 30 days
    const meetings: Meeting[] = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);

      // Randomly decide if we add a meeting on this day (about 60% chance)
      if (Math.random() > 0.4) {
        const writerName = writerNames[Math.floor(Math.random() * writerNames.length)];
        const dramaName = dramaNames[Math.floor(Math.random() * dramaNames.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Random number of attendees (1-4)
        const attendeesCount = Math.floor(Math.random() * 4) + 1;
        const attendees = Array.from({ length: attendeesCount }, () =>
          writerNames[Math.floor(Math.random() * writerNames.length)]
        );

        meetings.push({
          id: `meeting_${i}_${Date.now()}`,
          contact_name: writerName,
          organizer_name: writerNames[Math.floor(Math.random() * writerNames.length)],
          meeting_date: new Date(date).toISOString(),
          duration_minutes: Math.floor(Math.random() * 180) + 30, // 30 min to 3 hours
          attendees: attendees,
          status: status,
          title: dramaName,
          notes: `Discussed progress on ${dramaName} and next steps for production`,
          contact_email: `${writerName.replace(/\s+/g, '.').toLowerCase()}@drama.com`,
          contact_phone: `+92-${Math.floor(100000000 + Math.random() * 900000000)}`,
        });
      }
    }

    return meetings;
  };

  // Mock fetch function (since this is a demo)
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const dummyMeetings = generateDummyMeetings();
    setMeetings(dummyMeetings);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

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
        <div className="bg-white border-b p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Navigation Controls */}
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
            <h1 className="text-base sm:text-xl font-semibold truncate">{getDateRangeText()}</h1>
          </div>

          {/* Refresh button and View Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
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

        {/* Calendar View Area */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
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
                  onTimeSlotClick={() => {}}
                />
              </div>

              {/* Desktop: Calendar Grid/Month View */}
              <div className="hidden md:block flex-1 p-4 overflow-auto">
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
