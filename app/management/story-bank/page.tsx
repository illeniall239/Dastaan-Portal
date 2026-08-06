import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { StoryBank } from "@/components/management/story-bank";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function ManagementStoryBankPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is management (admin, management, or executive)
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "management", "executive", "management_viewer"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch one-liner reports (call reports)
  const { data: callReports, error: callReportsError } = await adminClient
    .from("call_reports")
    .select(`
      id,
      call_report_id,
      meeting_date,
      writer_name,
      contact_email,
      contact_phone,
      contact_address,
      meeting_notes,
      meeting_attendees,
      next_steps,
      working_title,
      logline,
      status,
      created_at,
      updated_at,
      meeting_type,
      created_by,
      creator:users!created_by(name, email, team:teams!team_id(name)),
      stories:stories(
        id,
        story_id,
        title,
        genre,
        writer_originator_name
      ),
      episodes:episodes(
        id,
        episode_number,
        title
      )
    `)
    .eq("meeting_type", "call_report")
    .order("meeting_date", { ascending: false });

  if (callReportsError) {
    console.error("❌ Error fetching call reports:");
    console.error("  - Message:", callReportsError.message);
    console.error("  - Code:", callReportsError.code);
    console.error("  - Details:", callReportsError.details);
    console.error("  - Hint:", callReportsError.hint);
    console.error("  - Full error (JSON):", JSON.stringify(callReportsError, null, 2));
    console.error("  - Full error (Object):", callReportsError);
  }

  // Fetch attachments for call reports
  const callReportIds = (callReports || []).map((cr: any) => cr.id);
  const { data: attachments, error: attachmentsError } = callReportIds.length > 0
    ? await adminClient
      .from("attachments")
      .select(`
          id,
          entity_id,
          file_name,
          file_path,
          file_size,
          file_type,
          uploaded_at,
          uploader:users!uploaded_by(name, email)
        `)
      .eq("entity_type", "call_report")
      .in("entity_id", callReportIds)
      .order("uploaded_at", { ascending: false })
    : { data: [], error: null };

  if (attachmentsError) {
    console.error("❌ Error fetching attachments:");
    console.error("  - Message:", attachmentsError.message);
    console.error("  - Code:", attachmentsError.code);
  }

  // Group attachments by call_report_id
  const attachmentsByCallReport: Record<string, any[]> = {};
  (attachments || []).forEach((attachment: any) => {
    if (!attachmentsByCallReport[attachment.entity_id]) {
      attachmentsByCallReport[attachment.entity_id] = [];
    }
    attachmentsByCallReport[attachment.entity_id].push(attachment);
  });

  // Merge attachments into call reports
  const callReportsWithAttachments = (callReports || []).map((report: any) => ({
    ...report,
    attachments: attachmentsByCallReport[report.id] || [],
  }));

  // Fetch episodes linked to call reports or stories
  const { data: episodes, error: episodesError } = await adminClient
    .from("episodes")
    .select(`
      id,
      episode_number,
      title,
      attachment_url,
      attachment_name,
      call_report_id,
      story_id,
      created_at,
      stories:stories(
        id,
        story_id,
        title,
        genre,
        writer_originator_name
      ),
      call_reports:call_reports(
        id,
        working_title,
        writer_name,
        meeting_date,
        meeting_type,
        creator:users!created_by(team:teams!team_id(name))
      )
    `)
    .order("created_at", { ascending: false });

  if (episodesError) {
    console.error("❌ Error fetching episodes:");
    console.error("  - Message:", episodesError.message);
    console.error("  - Code:", episodesError.code);
    console.error("  - Details:", episodesError.details);
    console.error("  - Hint:", episodesError.hint);
    console.error("  - Full error (JSON):", JSON.stringify(episodesError, null, 2));
    console.error("  - Full error (Object):", episodesError);
  }

  // Fetch evaluation counts for each episode
  const { data: evaluations, error: evaluationsError } = await adminClient
    .from("episodic_evaluations")
    .select("episode_id, id");

  if (evaluationsError) {
    console.error("❌ Error fetching evaluations:");
    console.error("  - Message:", evaluationsError.message);
    console.error("  - Code:", evaluationsError.code);
    console.error("  - Details:", evaluationsError.details);
    console.error("  - Hint:", evaluationsError.hint);
    console.error("  - Full error (JSON):", JSON.stringify(evaluationsError, null, 2));
    console.error("  - Full error (Object):", evaluationsError);
  }

  const evaluationCounts: Record<string, number> = {};
  if (evaluations) {
    evaluations.forEach((evaluation) => {
      evaluationCounts[evaluation.episode_id] = (evaluationCounts[evaluation.episode_id] || 0) + 1;
    });
  }

  const filteredEpisodes = (episodes || []).filter(
    (episode) =>
      !episode.call_report_id ||
      (episode.call_reports as any)?.meeting_type === "call_report"
  );

  const episodesWithCounts = filteredEpisodes.map((episode) => ({
    ...episode,
    evaluation_count: evaluationCounts[episode.id] || 0,
  }));

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col gap-4 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
        <BackButton fallbackHref="/management" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">Script Bank</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage one-liner reports and their linked episodes
          </p>
        </div>
      </div>

      <StoryBank callReports={callReportsWithAttachments} episodes={episodesWithCounts} userRole={userData.role} />
    </div>
  );
}
