import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { CalendarIcon, UserIcon, MapPinIcon, FileTextIcon, ClipboardListIcon, ClockIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { format, parseISO } from "date-fns";
import { BackButton } from "@/components/ui/back-button";
import { formatDateWithWeekday, formatTime } from "@/lib/utils/format-date";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Only allow content department users
  if (user.role !== "content_creator") {
    redirect("/content-department");
  }

  const supabase = await createClient();

  // STEP 1: Get current user's team context for team isolation
  const { data: currentUser } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  const hasGlobalAccess = currentUser?.role && ['admin', 'management'].includes(currentUser.role);

  // STEP 2: Fetch meeting with team verification
  let query = supabase
    .from("meetings")
    .select("*")
    .eq("id", resolvedParams.id);

  // TEAM ISOLATION: Verify user can access this meeting
  if (!hasGlobalAccess && currentUser?.team_id) {
    query = query.eq("team_id", currentUser.team_id);
  }

  const { data: meeting, error } = await query.single();

  // If no data returned, user doesn't have access to this meeting
  if (error || !meeting) {
    redirect("/content-department/calendar");
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex flex-col gap-4 sm:gap-6 w-full sm:w-auto">
          <BackButton fallbackHref="/content-department/calendar" variant="outline" size="sm" className="w-fit" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{meeting.title}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Scheduled Meeting
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto lg:flex-shrink-0">
          <Button asChild className="bg-[#10b981] hover:bg-[#059669]">
            <Link href="/content-department/log-call-report">
              <FileTextIcon className="h-4 w-4 mr-2" />
              Log One-Liner Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Meeting Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">{formatDateWithWeekday(meeting.meeting_date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">{formatTime(meeting.meeting_date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Writer/Originator</p>
                  <p className="text-sm text-muted-foreground">{meeting.contact_name}</p>
                  {meeting.contact_email && (
                    <p className="text-sm text-muted-foreground">{meeting.contact_email}</p>
                  )}
                </div>
              </div>

              {meeting.suggested_writer && (
                <div className="flex items-start gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Suggested Writer</p>
                    <p className="text-sm text-muted-foreground">{meeting.suggested_writer}</p>
                  </div>
                </div>
              )}

              {meeting.category && (
                <div className="flex items-start gap-3">
                  <FileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {meeting.category.replace("_", " ")}
                    </p>
                  </div>
                </div>
              )}

              {meeting.logged_by && (
                <div className="flex items-start gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Scheduled By</p>
                    <p className="text-sm text-muted-foreground">{meeting.logged_by}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {meeting.attendees && meeting.attendees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attendees</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {meeting.attendees.map((attendee: string, index: number) => (
                    <li key={index} className="text-sm flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      {attendee}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(meeting.contact_phone || meeting.contact_address) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {meeting.contact_phone && (
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{meeting.contact_phone}</p>
                  </div>
                )}
                {meeting.contact_address && (
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{meeting.contact_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Content Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meeting.agenda && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Agenda</h3>
                  <p className="text-sm text-muted-foreground">{meeting.agenda}</p>
                </div>
              )}




            </CardContent>
          </Card>

          {meeting.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Meeting Agenda / Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {meeting.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {meeting.next_steps && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps / Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {meeting.next_steps}
                </p>
              </CardContent>
            </Card>
          )}

          {meeting.status && meeting.status !== 'draft' && meeting.status !== 'scheduled' && (
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 capitalize">
                  {meeting.status}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
