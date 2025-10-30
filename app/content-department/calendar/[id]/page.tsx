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
import { ArrowLeftIcon, CalendarIcon, UserIcon, MapPinIcon, FileTextIcon, ClipboardListIcon, ClockIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { format, parseISO } from "date-fns";

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

  // Fetch the scheduled meeting
  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("call_reports")
    .select("*")
    .eq("id", resolvedParams.id)
    .eq("meeting_type", "scheduled_meeting")
    .single();

  if (error || !meeting) {
    redirect("/content-department/calendar");
  }

  const meetingDate = new Date(meeting.meeting_date);
  const formattedDate = meetingDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = meetingDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/content-department/calendar">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{meeting.working_title}</h1>
            <p className="text-muted-foreground mt-1">
              Scheduled Meeting
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#10b981] hover:bg-[#059669]">
          <Link href="/content-department/log-call-report">
            <FileTextIcon className="h-4 w-4 mr-2" />
            Log Writer Engagement Report
          </Link>
        </Button>
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
                  <p className="text-sm text-muted-foreground">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">{formattedTime}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Writer/Originator</p>
                  <p className="text-sm text-muted-foreground">{meeting.writer_name}</p>
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

          {meeting.meeting_attendees && meeting.meeting_attendees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attendees</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {meeting.meeting_attendees.map((attendee: string, index: number) => (
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
              {meeting.logline && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Logline</h3>
                  <p className="text-sm text-muted-foreground">{meeting.logline}</p>
                </div>
              )}

              {meeting.usp && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">USP (Unique Selling Point)</h3>
                  <p className="text-sm text-muted-foreground">{meeting.usp}</p>
                </div>
              )}

              
            </CardContent>
          </Card>

          {meeting.meeting_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Meeting Agenda / Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {meeting.meeting_notes}
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
