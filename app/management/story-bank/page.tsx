import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { StoryBank } from "@/components/management/story-bank";

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

  if (!userData || !["admin", "management", "executive"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch writer engagement reports (call reports)
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
        meeting_type
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
      <div className="mobile-header-spacing">
        <h1 className="text-2xl sm:text-3xl font-bold">Story Bank</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Manage writer engagement reports and their linked episodes
        </p>
      </div>

      <StoryBank callReports={callReports || []} episodes={episodesWithCounts} />
    </div>
  );
}
