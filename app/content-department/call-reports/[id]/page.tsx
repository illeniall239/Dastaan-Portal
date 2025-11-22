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
import { CalendarIcon, UserIcon, MapPinIcon, FileTextIcon, PaperclipIcon, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentsForEntityServer } from "@/lib/attachments/server";
import { BackButton } from "@/components/ui/back-button";

// Helper to convert stored image path to secure proxy URL
function getSecureImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  // If it's already a proxy URL, use it as-is
  if (value.startsWith('/api/attachments/image')) {
    return value;
  }

  // If it's a full URL (legacy), extract the path
  if (value.startsWith('http')) {
    try {
      const url = new URL(value);
      const pathMatch = url.pathname.match(/\/attachments\/(.+)$/);
      if (pathMatch) {
        return `/api/attachments/image?path=${encodeURIComponent(pathMatch[1])}`;
      }
    } catch {
      return null;
    }
  }

  // If it's just a file path, use the proxy
  return `/api/attachments/image?path=${encodeURIComponent(value)}`;
}

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

  // Fetch writers for this call report
  const { data: writers } = await supabase
    .from("call_report_writers")
    .select(`
      id,
      writer_id,
      writer_email,
      writer_phone,
      display_order,
      writer:writers(name)
    `)
    .eq("call_report_id", resolvedParams.id)
    .order("display_order", { ascending: true });

  const reportWriters = writers?.map(w => ({
    id: w.id,
    writer_id: w.writer_id,
    writer_name: (w.writer as any)?.name || "",
    writer_email: w.writer_email,
    writer_phone: w.writer_phone,
    display_order: w.display_order,
  })) || [];

  // Fetch attachments for this call report
  let attachments: any[] = [];
  try {
    attachments = await getAttachmentsForEntityServer("call_report", resolvedParams.id);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    // Continue without attachments if there's an error
  }

  const loggedDate = new Date(report.meeting_date);
  const formattedDate = loggedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Check if user can edit (owner or manager/admin)
  const canEdit =
    report.created_by === user.id ||
    ["content_manager", "admin"].includes(user.role);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <BackButton fallbackHref="/content-department/call-reports" variant="outline" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">{report.working_title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Writer Engagement Report ID: {report.call_report_id}
          </p>
        </div>
        {canEdit && (
          <Button variant="default" size="sm" asChild>
            <Link href={`/content-department/call-reports/${resolvedParams.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      {/* Single Column Layout */}
      <div className="space-y-4">
        {/* Report Details */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Report Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-slate-500 font-medium">Logged On</p>
                <p className="text-slate-900 mt-0.5">{formattedDate}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Category</p>
                <p className="text-slate-900 mt-0.5 capitalize">{report.category?.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Writers/Originators</p>
                {reportWriters.length > 0 ? (
                  <div className="mt-0.5 space-y-1">
                    {reportWriters.map((writer, index) => (
                      <div key={writer.id} className="text-slate-900">
                        <span className="font-medium">{writer.writer_name}</span>
                        {writer.writer_email && (
                          <span className="text-slate-600 text-xs ml-2">{writer.writer_email}</span>
                        )}
                        {writer.writer_phone && (
                          <span className="text-slate-600 text-xs ml-2">{writer.writer_phone}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-900 mt-0.5">No writers assigned</p>
                )}
              </div>
              <div>
                <p className="text-slate-500 font-medium">Logged By</p>
                <p className="text-slate-900 mt-0.5">{report.logged_by}</p>
              </div>
              {report.suggested_writer && (
                <div>
                  <p className="text-slate-500 font-medium">Suggested Writer</p>
                  <p className="text-slate-900 mt-0.5">{report.suggested_writer}</p>
                </div>
              )}
              {report.location && (
                <div>
                  <p className="text-slate-500 font-medium">Location</p>
                  <p className="text-slate-900 mt-0.5">{report.location}</p>
                </div>
              )}
              {report.contact_phone && (
                <div>
                  <p className="text-slate-500 font-medium">Phone</p>
                  <p className="text-slate-900 mt-0.5">{report.contact_phone}</p>
                </div>
              )}
              {report.contact_address && (
                <div>
                  <p className="text-slate-500 font-medium">Address</p>
                  <p className="text-slate-900 mt-0.5">{report.contact_address}</p>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Story Details */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Story Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Logline</h3>
              <p className="text-sm text-slate-900 leading-relaxed">{report.logline}</p>
              {report.logline_image_url && getSecureImageUrl(report.logline_image_url) && (
                <div className="mt-3">
                  <img
                    src={getSecureImageUrl(report.logline_image_url)!}
                    alt="Logline visual"
                    className="max-w-sm rounded border border-slate-200"
                  />
                </div>
              )}
            </div>

            {report.short_synopsis && (
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Short Synopsis</h3>
                <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{report.short_synopsis}</p>
              </div>
            )}

            {report.episodic_synopsis && (
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Episodic Synopsis</h3>
                <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{report.episodic_synopsis}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {report.genre && (
                <div>
                  <p className="text-slate-500 font-medium">Genre</p>
                  <p className="text-slate-900 mt-0.5">{report.genre}</p>
                </div>
              )}
              {report.theme && (
                <div>
                  <p className="text-slate-500 font-medium">Theme</p>
                  <p className="text-slate-900 mt-0.5">{report.theme}</p>
                </div>
              )}
              {report.slot && (
                <div>
                  <p className="text-slate-500 font-medium">Target Slot</p>
                  <p className="text-slate-900 mt-0.5">{report.slot}</p>
                </div>
              )}
              {report.content_type && (
                <div>
                  <p className="text-slate-500 font-medium">Content Type</p>
                  <p className="text-slate-900 mt-0.5">{report.content_type}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        {report.meeting_notes && (
          <Card className="border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                {report.meeting_notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        {report.next_steps && (
          <Card className="border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Next Steps / Action Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                {report.next_steps}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card className="border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Attachments</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PaperclipIcon className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-sm text-slate-900">{attachment.file_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(attachment.file_size / 1024 / 1024).toFixed(2)} MB • {attachment.users?.name || 'Unknown'} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
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
  );
}
