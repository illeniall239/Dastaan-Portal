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
import { ArrowLeftIcon, CalendarIcon, UserIcon, MapPinIcon, FileTextIcon, PaperclipIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentsForEntityServer } from "@/lib/attachments/server";

// Add Next.js caching - revalidate every 30 seconds
export const revalidate = 300; // 5 minutes for better performance

export default async function CallReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Allow content department users to access this page
  if (user.role !== "content_creator") {
    redirect("/content-department");
  }

  // Fetch the call report
  const supabase = await createClient();
  const { data: report, error } = await supabase
    .from("call_reports")
    .select("*")
    .eq("id", resolvedParams.id)
    .eq("meeting_type", "call_report")
    .single();

  if (error || !report) {
    redirect("/content-department/call-reports");
  }

  // Fetch attachments for this call report
  let attachments: any[] = [];
  try {
    attachments = await getAttachmentsForEntityServer("call_report", resolvedParams.id);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    // Continue without attachments if there's an error
  }

  const meetingDate = new Date(report.meeting_date);
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
            <Link href="/content-department/call-reports">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{report.working_title}</h1>
            <p className="text-muted-foreground mt-1">
              Writer Engagement Report ID: {report.call_report_id}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Meeting Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg font-bold text-slate-900">Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-start gap-4 p-3 rounded-xl bg-blue-50">
                <div className="p-2 rounded-lg bg-[#224794] shadow-md">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Date & Time</p>
                  <p className="text-sm text-slate-600 mt-1">{formattedDate}</p>
                  <p className="text-sm text-slate-600">{formattedTime}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl bg-purple-50">
                <div className="p-2 rounded-lg bg-purple-600 shadow-md">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Writer/Originator</p>
                  <p className="text-sm text-slate-600 mt-1">{report.writer_name}</p>
                  <p className="text-sm text-slate-600">{report.contact_email}</p>
                </div>
              </div>

              {report.suggested_writer && (
                <div className="flex items-start gap-4 p-3 rounded-xl bg-orange-50">
                  <div className="p-2 rounded-lg bg-[#f79224] shadow-md">
                    <UserIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Suggested Writer</p>
                    <p className="text-sm text-slate-600 mt-1">{report.suggested_writer}</p>
                  </div>
                </div>
              )}

              {report.location && (
                <div className="flex items-start gap-4 p-3 rounded-xl bg-green-50">
                  <div className="p-2 rounded-lg bg-[#10b981] shadow-md">
                    <MapPinIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Location</p>
                    <p className="text-sm text-slate-600 mt-1">{report.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-50">
                <div className="p-2 rounded-lg bg-slate-700 shadow-md">
                  <FileTextIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Category</p>
                  <p className="text-sm text-slate-600 mt-1 capitalize">
                    {report.category?.replace("_", " ")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl bg-indigo-50">
                <div className="p-2 rounded-lg bg-indigo-600 shadow-md">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Logged By</p>
                  <p className="text-sm text-slate-600 mt-1">{report.logged_by}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {report.meeting_attendees && report.meeting_attendees.length > 0 && (
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg font-bold text-slate-900">Attendees</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {report.meeting_attendees.map((attendee: string, index: number) => (
                    <li key={index} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                      <div className="h-8 w-8 rounded-full bg-[#224794] flex items-center justify-center text-white text-xs font-bold">
                        {attendee.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-700 font-medium">{attendee}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(report.contact_phone || report.contact_address) && (
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg font-bold text-slate-900">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {report.contact_phone && (
                  <div className="p-3 rounded-xl bg-blue-50">
                    <p className="text-sm font-semibold text-slate-900">Phone</p>
                    <p className="text-sm text-slate-600 mt-1">{report.contact_phone}</p>
                  </div>
                )}
                {report.contact_address && (
                  <div className="p-3 rounded-xl bg-purple-50">
                    <p className="text-sm font-semibold text-slate-900">Address</p>
                    <p className="text-sm text-slate-600 mt-1">{report.contact_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Content Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-orange-50 border-b">
              <CardTitle className="text-xl font-bold text-slate-900">Story Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Logline</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{report.logline}</p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">USP (Unique Selling Point)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{report.usp}</p>
              </div>

              
            </CardContent>
          </Card>

          {report.meeting_notes && (
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-xl font-bold text-slate-900">Meeting Notes</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed p-4 rounded-xl bg-slate-50 border border-slate-100">
                  {report.meeting_notes}
                </p>
              </CardContent>
            </Card>
          )}

          {report.next_steps && (
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-amber-50 border-b">
                <CardTitle className="text-xl font-bold text-slate-900">Next Steps / Action Items</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed p-4 rounded-xl bg-amber-50 border border-amber-100">
                  {report.next_steps}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-xl font-bold text-slate-900">Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold bg-[#224794] text-white capitalize shadow-lg">
                {report.status}
              </div>
            </CardContent>
          </Card>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-emerald-50 border-b">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                  <div className="p-2 rounded-lg bg-emerald-600 shadow-md">
                    <PaperclipIcon className="h-5 w-5 text-white" />
                  </div>
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="group flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-slate-100 group-hover:bg-emerald-100 transition-colors">
                          <PaperclipIcon className="h-5 w-5 text-slate-600 group-hover:text-emerald-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{attachment.file_name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {(attachment.file_size / 1024 / 1024).toFixed(2)} MB • {attachment.users?.name || 'Unknown'} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                        asChild
                      >
                        <Link href={`/api/attachments/${attachment.id}`} target="_blank" rel="noopener noreferrer">
                          Download
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
