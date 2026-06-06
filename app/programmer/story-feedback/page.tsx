import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { StoryFeedbackClient } from "@/components/programmer/story-feedback-client";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function StoryFeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["programmer", "management", "admin"].includes(user.role)) redirect("/dashboard");

  const admin = createAdminClient();

  const [{ data: callReports }, { data: feedbackRows }] = await Promise.all([
    admin
      .from("call_reports")
      .select("id, working_title, writer_name, content_type")
      .eq("meeting_type", "call_report")
      .is("archived_at", null)
      .order("working_title", { ascending: true }),
    admin
      .from("programmer_feedback")
      .select(`
        id, programmer_id, call_report_id, feedback_date, content, created_at, updated_at,
        programmer:users!programmer_id(id, name),
        call_report:call_reports!call_report_id(id, working_title, writer_name, content_type)
      `)
      .order("feedback_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const rows = feedbackRows || [];
  const ids = rows.map((r: any) => r.id);

  // Fetch attachments separately (polymorphic relationship)
  let attachmentsByFeedback: Record<string, any[]> = {};
  if (ids.length > 0) {
    const { data: atts } = await admin
      .from("attachments")
      .select("id, entity_id, file_name, file_path, file_type, file_size")
      .eq("entity_type", "programmer_feedback")
      .in("entity_id", ids);
    for (const att of atts || []) {
      if (!attachmentsByFeedback[att.entity_id]) attachmentsByFeedback[att.entity_id] = [];
      attachmentsByFeedback[att.entity_id].push(att);
    }
  }

  const feedback = rows.map((r: any) => ({
    ...r,
    attachments: attachmentsByFeedback[r.id] || [],
  }));

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 mb-2">
        <BackButton fallbackHref="/programmer" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Story Feedback</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Log written feedback and files for specific stories.
          </p>
        </div>
      </div>

      <StoryFeedbackClient
        callReports={callReports || []}
        initialFeedback={feedback}
        currentUserId={user.id}
      />
    </div>
  );
}
